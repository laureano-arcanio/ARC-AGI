import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRandomTasks, useTaskById } from '../queries'
import { useTranslation } from '../../../lib/i18n'
import { ConfirmDialog } from '../../../components/common'
import {
  cloneGrid,
  createGrid,
  floodfill,
  formatSize,
  gridsEqual,
  parseCellKey,
  parseSize,
  pasteClipboard,
  serializeGridToGridObject,
} from '../utils'
import {
  DEFAULT_GRID_HEIGHT,
  DEFAULT_GRID_WIDTH,
  type ArcTask,
  type ClipboardEntry,
  type CognitiveIntent,
  type GraphNode,
  type GraphTrigger,
  type GridData,
  type TaskPair,
  type ToastMessage,
  type ToolMode,
} from '../types'
import { DemonstrationPanel } from '../components/DemonstrationPanel'
import { TestInputPanel } from '../components/TestInputPanel'
import { OutputEditor } from '../components/OutputEditor'
import { TaskControls } from '../components/TaskControls'
import { Toast } from '../components/Toast'
import { CognitiveTimeline } from '../components/CognitiveTimeline'
import { usePauseInterception } from '../hooks/usePauseInterception'

type ArcLabState = {
  train: TaskPair[]
  test: TaskPair[]
  currentTestIndex: number
  inputGrid: GridData
  outputGrid: GridData
  toolMode: ToolMode
  selectedSymbol: number
  sizeInput: string
  clipboard: ClipboardEntry[] | null
  selectedCells: Set<string>
  message: ToastMessage | null
  graphNodes: GraphNode[]
  activeNodeId: string | null
  nextNodeId: number
}

type Action =
  | { type: 'LOAD_TASK'; task: ArcTask }
  | { type: 'NEXT_TEST_INPUT' }
  | { type: 'SET_TOOL_MODE'; mode: ToolMode }
  | { type: 'SET_SYMBOL'; symbol: number }
  | { type: 'SET_SIZE_INPUT'; value: string }
  | { type: 'RESIZE' }
  | { type: 'COPY_FROM_INPUT' }
  | { type: 'RESET_OUTPUT' }
  | { type: 'SUBMIT' }
  | { type: 'ABANDON' }
  | { type: 'CELL_CLICK'; x: number; y: number }
  | { type: 'SELECTION_CHANGE'; cells: Set<string> }
  | { type: 'FILL_SELECTED' }
  | { type: 'COPY_SELECTION' }
  | { type: 'PASTE' }
  | { type: 'SET_MESSAGE'; message: ToastMessage | null }
  | { type: 'DISMISS_MESSAGE' }
  | { type: 'TRAVEL_TO_NODE'; nodeId: string }
  | { type: 'ADD_COGNITIVE_NODE'; intent: CognitiveIntent; text: string }

function makeNodeId(n: number): string {
  return `node_${String(n).padStart(3, '0')}`
}

const COGNITIVE_EMOJI: Record<CognitiveIntent, string> = {
  observation: '👁️',
  hypothesis: '💡',
  failure: '❌',
  confusion: '🤔',
}

function addNode(
  state: ArcLabState,
  trigger: GraphTrigger,
): Pick<ArcLabState, 'graphNodes' | 'activeNodeId' | 'nextNodeId'> {
  const id = makeNodeId(state.nextNodeId)
  const node: GraphNode = {
    id,
    trigger,
    stateSnapshot: cloneGrid(state.outputGrid),
    parentId: state.activeNodeId,
    timestamp: Date.now(),
  }
  return {
    graphNodes: [...state.graphNodes, node],
    activeNodeId: id,
    nextNodeId: state.nextNodeId + 1,
  }
}

const initialRootNode: GraphNode = {
  id: 'node_000',
  trigger: { kind: 'mechanical', action: 'load_task' },
  stateSnapshot: createGrid(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
  parentId: null,
  timestamp: Date.now(),
}

const initialState: ArcLabState = {
  train: [],
  test: [],
  currentTestIndex: 0,
  inputGrid: createGrid(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
  outputGrid: createGrid(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
  toolMode: 'edit',
  selectedSymbol: 0,
  sizeInput: formatSize(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
  clipboard: null,
  selectedCells: new Set(),
  message: null,
  graphNodes: [initialRootNode],
  activeNodeId: 'node_000',
  nextNodeId: 1,
}

function withTask(state: ArcLabState, task: ArcTask): ArcLabState {
  const firstTest = task.test[0]
  const inputGrid = serializeGridToGridObject(firstTest.input)
  const outputGrid = createGrid(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH)
  return {
    ...state,
    train: task.train,
    test: task.test,
    currentTestIndex: 0,
    inputGrid,
    outputGrid,
    sizeInput: formatSize(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
    selectedCells: new Set(),
    clipboard: null,
    message: null,
  }
}

function reducer(state: ArcLabState, action: Action): ArcLabState {
  switch (action.type) {
    case 'LOAD_TASK': {
      const base = withTask(state, action.task)
      const root: GraphNode = {
        id: 'node_000',
        trigger: { kind: 'mechanical', action: 'load_task' },
        stateSnapshot: cloneGrid(base.outputGrid),
        parentId: null,
        timestamp: Date.now(),
      }
      return {
        ...base,
        graphNodes: [root],
        activeNodeId: 'node_000',
        nextNodeId: 1,
      }
    }

    case 'NEXT_TEST_INPUT': {
      if (state.test.length <= state.currentTestIndex + 1) {
        return { ...state, message: { kind: 'error', text: 'toast.no_next_test' } }
      }
      const nextIndex = state.currentTestIndex + 1
      const inputGrid = serializeGridToGridObject(state.test[nextIndex].input)
      return {
        ...state,
        currentTestIndex: nextIndex,
        inputGrid,
        selectedCells: new Set(),
      }
    }

    case 'SET_TOOL_MODE':
      return { ...state, toolMode: action.mode, selectedCells: new Set() }

    case 'SET_SYMBOL':
      return { ...state, selectedSymbol: action.symbol }

    case 'SET_SIZE_INPUT':
      return { ...state, sizeInput: action.value }

    case 'RESIZE': {
      const parsed = parseSize(state.sizeInput)
      if (!parsed.ok) {
        return { ...state, message: { kind: 'error', text: parsed.error, params: parsed.params } }
      }
      const dataGrid = cloneGrid(state.outputGrid)
      const outputGrid = createGrid(parsed.height, parsed.width, dataGrid)
      const graph = addNode(
        { ...state, outputGrid },
        { kind: 'mechanical', action: 'resize', details: { size: formatSize(parsed.height, parsed.width) } },
      )
      return { ...state, outputGrid, selectedCells: new Set(), ...graph }
    }

    case 'COPY_FROM_INPUT': {
      const outputGrid = serializeGridToGridObject(state.inputGrid)
      const graph = addNode(
        { ...state, outputGrid },
        { kind: 'mechanical', action: 'copy_from_input' },
      )
      return {
        ...state,
        outputGrid,
        sizeInput: formatSize(outputGrid.length, outputGrid[0].length),
        selectedCells: new Set(),
        ...graph,
      }
    }

    case 'RESET_OUTPUT': {
      const outputGrid = createGrid(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH)
      const rootNode = state.graphNodes[0]
      const id = makeNodeId(state.nextNodeId)
      const node: GraphNode = {
        id,
        trigger: { kind: 'mechanical', action: 'reset_output' },
        stateSnapshot: cloneGrid(outputGrid),
        parentId: rootNode?.id ?? state.activeNodeId,
        timestamp: Date.now(),
      }
      return {
        ...state,
        outputGrid,
        sizeInput: formatSize(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
        selectedCells: new Set(),
        graphNodes: [...state.graphNodes, node],
        activeNodeId: id,
        nextNodeId: state.nextNodeId + 1,
        message: { kind: 'info', text: 'timeline.branch_discarded' },
      }
    }

    case 'SUBMIT': {
      const reference = state.test[state.currentTestIndex]?.output
      if (!reference) {
        return { ...state, message: { kind: 'error', text: 'toast.no_test_pair' } }
      }
      const correct = gridsEqual(state.outputGrid, reference)
      const graph = addNode(
        state,
        { kind: 'mechanical', action: 'submit', details: { correct } },
      )
      return {
        ...state,
        ...graph,
        message: correct
          ? { kind: 'info', text: 'toast.correct' }
          : { kind: 'error', text: 'toast.wrong' },
      }
    }

    case 'ABANDON': {
      const graph = addNode(
        state,
        { kind: 'mechanical', action: 'abandon' },
      )
      return { ...state, ...graph }
    }

    case 'CELL_CLICK': {
      if (state.toolMode === 'edit') {
        const outputGrid = cloneGrid(state.outputGrid)
        outputGrid[action.x][action.y] = state.selectedSymbol
        const graph = addNode(
          { ...state, outputGrid },
          { kind: 'mechanical', action: 'cell_click', details: { x: action.x, y: action.y, symbol: state.selectedSymbol } },
        )
        return { ...state, outputGrid, ...graph }
      }
      if (state.toolMode === 'floodfill') {
        const outputGrid = cloneGrid(state.outputGrid)
        floodfill(outputGrid, action.x, action.y, state.selectedSymbol)
        const graph = addNode(
          { ...state, outputGrid },
          { kind: 'mechanical', action: 'fill_selected', details: { x: action.x, y: action.y, symbol: state.selectedSymbol } },
        )
        return { ...state, outputGrid, ...graph }
      }
      return state
    }

    case 'SELECTION_CHANGE':
      return { ...state, selectedCells: action.cells }

    case 'FILL_SELECTED': {
      if (state.selectedCells.size === 0) return state
      const outputGrid = cloneGrid(state.outputGrid)
      for (const key of state.selectedCells) {
        const { x, y } = parseCellKey(key)
        if (x >= 0 && x < outputGrid.length && y >= 0 && y < outputGrid[x].length) {
          outputGrid[x][y] = state.selectedSymbol
        }
      }
      const graph = addNode(
        { ...state, outputGrid },
        { kind: 'mechanical', action: 'fill_selected', details: { count: state.selectedCells.size, symbol: state.selectedSymbol } },
      )
      return { ...state, outputGrid, ...graph }
    }

    case 'COPY_SELECTION': {
      if (state.selectedCells.size === 0) {
        return { ...state, message: { kind: 'error', text: 'toast.no_cells' } }
      }
      const clipboard: ClipboardEntry[] = []
      for (const key of state.selectedCells) {
        const { x, y } = parseCellKey(key)
        clipboard.push({ x, y, symbol: state.outputGrid[x][y] })
      }
      return {
        ...state,
        clipboard,
        message: { kind: 'info', text: 'toast.cells_copied' },
      }
    }

    case 'PASTE': {
      if (!state.clipboard || state.clipboard.length === 0) {
        return { ...state, message: { kind: 'error', text: 'toast.no_data_paste' } }
      }
      if (state.selectedCells.size !== 1) {
        return { ...state, message: { kind: 'error', text: 'toast.select_target' } }
      }
      const targetKey = state.selectedCells.values().next().value as string
      const { x: targetX, y: targetY } = parseCellKey(targetKey)
      const outputGrid = cloneGrid(state.outputGrid)
      pasteClipboard(outputGrid, state.clipboard, targetX, targetY)
      const graph = addNode(
        { ...state, outputGrid },
        { kind: 'mechanical', action: 'paste' },
      )
      return { ...state, outputGrid, ...graph }
    }

    case 'SET_MESSAGE':
      return { ...state, message: action.message }

    case 'DISMISS_MESSAGE':
      return { ...state, message: null }

    case 'TRAVEL_TO_NODE': {
      const target = state.graphNodes.find((n) => n.id === action.nodeId)
      if (!target) return state
      return {
        ...state,
        outputGrid: cloneGrid(target.stateSnapshot),
        activeNodeId: target.id,
      }
    }

    case 'ADD_COGNITIVE_NODE': {
      const graph = addNode(
        state,
        { kind: 'cognitive', intent: action.intent, text: action.text },
      )
      return { ...state, ...graph }
    }

    default:
      return state
  }
}

function getNodeLabel(
  trigger: GraphTrigger,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (trigger.kind === 'cognitive') {
    return `${COGNITIVE_EMOJI[trigger.intent]} ${trigger.text}`
  }
  switch (trigger.action) {
    case 'load_task':
      return t('log.load_task')
    case 'cell_click': {
      const d = trigger.details ?? {}
      return t('log.cell_click', { x: Number(d.x), y: Number(d.y), symbol: Number(d.symbol) })
    }
    case 'fill_selected': {
      const d = trigger.details ?? {}
      return t('log.fill_selected', { count: Number(d.count), symbol: Number(d.symbol) })
    }
    case 'paste':
      return t('log.paste')
    case 'resize': {
      const d = trigger.details ?? {}
      return t('log.resize', { size: String(d.size ?? '') })
    }
    case 'copy_from_input':
      return t('log.copy_from_input')
    case 'reset_output':
      return t('log.reset_output')
    case 'abandon':
      return t('log.abandon')
    case 'submit': {
      const d = trigger.details ?? {}
      const correct = d.correct ? ' ✓' : ' ✗'
      return t('log.submit') + correct
    }
    default:
      return trigger.action
  }
}

export function ArcLabPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [abandonOpen, setAbandonOpen] = useState(false)
  const [calloutKey, setCalloutKey] = useState<string | null>(null)
  const calloutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismissCallout = useCallback(() => {
    setCalloutKey(null)
    if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current)
  }, [])

  const handleIntercept = useCallback(() => {
    setCalloutKey('callout.intercept')
    if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current)
    calloutTimerRef.current = setTimeout(dismissCallout, 6000)
  }, [dismissCallout])

  const { reset, interceptAction } = usePauseInterception({ onIntercept: handleIntercept })

  useEffect(() => () => {
    if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current)
  }, [])

  const { data: randomTasks, isFetched: randomFetched } = useRandomTasks(
    1,
    taskId === 'random',
  )
  const { data: specificTask } = useTaskById(taskId ?? '')

  useEffect(() => {
    if (taskId === 'random' && randomFetched && randomTasks && randomTasks.length > 0) {
      navigate(`/solve/${randomTasks[0].id}`, { replace: true })
    }
  }, [taskId, randomFetched, randomTasks, navigate])

  useEffect(() => {
    if (specificTask) {
      dispatch({ type: 'LOAD_TASK', task: specificTask })
      reset()
    }
  }, [specificTask, reset])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

      if (e.key === 'c' || e.key === 'C') {
        dispatch({ type: 'COPY_SELECTION' })
      } else if (e.key === 'v' || e.key === 'V') {
        dispatch({ type: 'PASTE' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleSymbolSelect = (symbol: number) => {
    if (state.toolMode === 'select' && interceptAction()) return
    dispatch({ type: 'SET_SYMBOL', symbol })
    if (state.toolMode === 'select') {
      dispatch({ type: 'FILL_SELECTED' })
    }
    dispatch({ type: 'SET_TOOL_MODE', mode: 'edit' })
  }

  const handleCellClick = (x: number, y: number) => {
    if (interceptAction()) return
    dispatch({ type: 'CELL_CLICK', x, y })
  }

  const handleCognitiveSubmit = (intent: CognitiveIntent, text: string) => {
    dispatch({ type: 'ADD_COGNITIVE_NODE', intent, text })
  }

  const handleAbandonConfirm = () => {
    setAbandonOpen(false)
    dispatch({ type: 'ABANDON' })
    navigate('/')
  }

  const handleAbandonCancel = () => {
    setAbandonOpen(false)
  }

  return (
    <div data-testid="arc-lab-page">
      <div className="flex flex-col gap-5">
        <DemonstrationPanel pairs={state.train} />

        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <TaskControls onNextTask={() => navigate('/solve/random')} />

            <TestInputPanel
              input={state.inputGrid}
              currentIndex={state.currentTestIndex}
              total={state.test.length}
              onNext={() => dispatch({ type: 'NEXT_TEST_INPUT' })}
            />

            <OutputEditor
              grid={state.outputGrid}
              toolMode={state.toolMode}
              selectedSymbol={state.selectedSymbol}
              selectedCells={state.selectedCells}
              sizeInput={state.sizeInput}
              onSizeInputChange={(value) => dispatch({ type: 'SET_SIZE_INPUT', value })}
              onResize={() => { if (!interceptAction()) dispatch({ type: 'RESIZE' }) }}
              onCopyFromInput={() => { if (!interceptAction()) dispatch({ type: 'COPY_FROM_INPUT' }) }}
              onReset={() => { if (!interceptAction()) dispatch({ type: 'RESET_OUTPUT' }) }}
              onSubmit={() => dispatch({ type: 'SUBMIT' })}
              onAbandon={() => setAbandonOpen(true)}
              onCellClick={handleCellClick}
              onSelectionChange={(cells) => dispatch({ type: 'SELECTION_CHANGE', cells })}
              onToolModeChange={(mode) => dispatch({ type: 'SET_TOOL_MODE', mode })}
              onSymbolSelect={handleSymbolSelect}
            />

            <Toast
              message={state.message ? { ...state.message, text: t(state.message.text, state.message.params) } : null}
              onDismiss={() => dispatch({ type: 'DISMISS_MESSAGE' })}
            />
          </div>

          <CognitiveTimeline
            nodes={state.graphNodes}
            activeNodeId={state.activeNodeId}
            onGoBack={(nodeId) => dispatch({ type: 'TRAVEL_TO_NODE', nodeId })}
            onSubmit={handleCognitiveSubmit}
            getLabel={(trigger) => getNodeLabel(trigger, t)}
            callout={calloutKey ? t(calloutKey) : null}
            onDismissCallout={dismissCallout}
            onReset={reset}
          />
        </div>
      </div>

      <ConfirmDialog
        open={abandonOpen}
        variant="danger"
        title={t('dialog.abandon.title')}
        message={t('dialog.abandon.message')}
        confirmLabel={t('dialog.confirm')}
        cancelLabel={t('dialog.cancel')}
        onConfirm={handleAbandonConfirm}
        onCancel={handleAbandonCancel}
      />
    </div>
  )
}
