import { useEffect, useReducer, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRandomTasks, useTaskById } from '../queries'
import { createAttempt, postEvent } from '../api'
import { getUserAccessibleTaskIds } from '../../batches/api'
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
  type BlockReason,
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
import { Toast } from '../components/Toast'
import { CognitiveTimeline } from '../components/CognitiveTimeline'
import { getAttempts } from '../../admin-user-detail/api'

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
  navigationHistory: string[]
  navigationIndex: number
  blockReason: BlockReason
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
  | { type: 'SUBMIT_REFLECTION'; intent: CognitiveIntent; text: string }
  | { type: 'SET_BLOCK_REASON'; reason: BlockReason }
  | { type: 'NAVIGATE_PREV' }
  | { type: 'NAVIGATE_NEXT' }

function makeNodeId(n: number): string {
  return `node_${String(n).padStart(3, '0')}`
}

const COGNITIVE_EMOJI: Record<CognitiveIntent, string> = {
  hypothesis: '💡',
  failure_analysis: '❌',
  branch_pivot: '🟢',
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

function updateHistory(
  state: ArcLabState,
  newActiveNodeId: string,
  isNewNode: boolean,
): Pick<ArcLabState, 'navigationHistory' | 'navigationIndex'> {
  if (isNewNode) {
    const history = [
      ...state.navigationHistory.slice(0, state.navigationIndex + 1),
      newActiveNodeId,
    ]
    return { navigationHistory: history, navigationIndex: history.length - 1 }
  }
  const idx = state.navigationHistory.indexOf(newActiveNodeId)
  if (idx >= 0) {
    return { navigationHistory: state.navigationHistory, navigationIndex: idx }
  }
  const history = [...state.navigationHistory, newActiveNodeId]
  return { navigationHistory: history, navigationIndex: history.length - 1 }
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
  navigationHistory: ['node_000'],
  navigationIndex: 0,
  blockReason: null,
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
        navigationHistory: ['node_000'],
        navigationIndex: 0,
        blockReason: null,
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
      return { ...state, outputGrid, selectedCells: new Set(), ...graph, ...updateHistory(state, graph.activeNodeId!, true) }
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
        ...updateHistory(state, graph.activeNodeId!, true),
      }
    }

    case 'RESET_OUTPUT': {
      const outputGrid = createGrid(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH)
      const rootNode = state.graphNodes[0]
      const graph = addNode(
        { ...state, outputGrid },
        { kind: 'mechanical', action: 'reset_output' },
      )
      const afterReset = updateHistory(state, graph.activeNodeId!, true)
      const rootId = rootNode?.id ?? graph.activeNodeId!
      const afterJump = updateHistory(
        { ...state, ...afterReset },
        rootId,
        false,
      )
      return {
        ...state,
        outputGrid,
        sizeInput: formatSize(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
        selectedCells: new Set(),
        ...graph,
        activeNodeId: rootId,
        ...afterJump,
        blockReason: null,
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
        ...updateHistory(state, graph.activeNodeId!, true),
        message: correct
          ? { kind: 'info', text: 'toast.correct' }
          : { kind: 'error', text: 'toast.wrong' },
        blockReason: correct ? null : 'failure_analysis',
      }
    }

    case 'ABANDON': {
      const graph = addNode(
        state,
        { kind: 'mechanical', action: 'abandon' },
      )
      return { ...state, ...graph, ...updateHistory(state, graph.activeNodeId!, true) }
    }

    case 'CELL_CLICK': {
      if (state.toolMode === 'edit') {
        const outputGrid = cloneGrid(state.outputGrid)
        outputGrid[action.x][action.y] = state.selectedSymbol
        const cellEntry = { x: action.x, y: action.y, symbol: state.selectedSymbol }
        const lastNode = state.graphNodes[state.graphNodes.length - 1]
        if (
          state.activeNodeId === lastNode?.id &&
          lastNode?.trigger.kind === 'mechanical' &&
          lastNode.trigger.action === 'cell_click'
        ) {
          const prevCells = (lastNode.trigger.details?.cells as Array<{ x: number; y: number; symbol: number }>) ?? []
          const updatedNode: GraphNode = {
            ...lastNode,
            trigger: {
              ...lastNode.trigger,
              details: { cells: [...prevCells, cellEntry] },
            },
            stateSnapshot: cloneGrid(outputGrid),
            timestamp: Date.now(),
          }
          const graphNodes = [...state.graphNodes.slice(0, -1), updatedNode]
          return { ...state, outputGrid, graphNodes }
        }
        const graph = addNode(
          { ...state, outputGrid },
          { kind: 'mechanical', action: 'cell_click', details: { cells: [cellEntry] } },
        )
        return { ...state, outputGrid, ...graph, ...updateHistory(state, graph.activeNodeId!, true) }
      }
      if (state.toolMode === 'floodfill') {
        const outputGrid = cloneGrid(state.outputGrid)
        floodfill(outputGrid, action.x, action.y, state.selectedSymbol)
        const graph = addNode(
          { ...state, outputGrid },
          { kind: 'mechanical', action: 'fill_selected', details: { x: action.x, y: action.y, symbol: state.selectedSymbol } },
        )
        return { ...state, outputGrid, ...graph, ...updateHistory(state, graph.activeNodeId!, true) }
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
      return { ...state, outputGrid, ...graph, ...updateHistory(state, graph.activeNodeId!, true) }
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
      return { ...state, outputGrid, ...graph, ...updateHistory(state, graph.activeNodeId!, true) }
    }

    case 'SET_MESSAGE':
      return { ...state, message: action.message }

    case 'DISMISS_MESSAGE':
      return { ...state, message: null }

    case 'TRAVEL_TO_NODE': {
      const target = state.graphNodes.find((n) => n.id === action.nodeId)
      if (!target) return state
      const lastNode = state.graphNodes[state.graphNodes.length - 1]
      return {
        ...state,
        outputGrid: cloneGrid(target.stateSnapshot),
        activeNodeId: target.id,
        ...updateHistory(state, target.id, false),
        blockReason: target.id !== lastNode?.id ? 'branch_pivot' : state.blockReason,
      }
    }

    case 'ADD_COGNITIVE_NODE': {
      const graph = addNode(
        state,
        { kind: 'cognitive', intent: action.intent, text: action.text },
      )
      return { ...state, ...graph, ...updateHistory(state, graph.activeNodeId!, true) }
    }

    case 'SET_BLOCK_REASON': {
      return { ...state, blockReason: action.reason }
    }

    case 'SUBMIT_REFLECTION': {
      const graph = addNode(
        state,
        { kind: 'cognitive', intent: action.intent, text: action.text },
      )
      return {
        ...state,
        ...graph,
        ...updateHistory(state, graph.activeNodeId!, true),
        blockReason: null,
      }
    }

    case 'NAVIGATE_PREV': {
      if (state.navigationIndex <= 0) return state
      const prevId = state.navigationHistory[state.navigationIndex - 1]
      const target = state.graphNodes.find((n) => n.id === prevId)
      if (!target) return state
      const lastNode = state.graphNodes[state.graphNodes.length - 1]
      return {
        ...state,
        outputGrid: cloneGrid(target.stateSnapshot),
        activeNodeId: prevId,
        navigationIndex: state.navigationIndex - 1,
        blockReason: target.id !== lastNode?.id ? 'branch_pivot' : state.blockReason,
      }
    }

    case 'NAVIGATE_NEXT': {
      if (state.navigationIndex >= state.navigationHistory.length - 1) return state
      const nextId = state.navigationHistory[state.navigationIndex + 1]
      const target = state.graphNodes.find((n) => n.id === nextId)
      if (!target) return state
      const lastNode = state.graphNodes[state.graphNodes.length - 1]
      return {
        ...state,
        outputGrid: cloneGrid(target.stateSnapshot),
        activeNodeId: nextId,
        navigationIndex: state.navigationIndex + 1,
        blockReason: target.id !== lastNode?.id ? 'branch_pivot' : null,
      }
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
      const cells = (trigger.details?.cells as Array<{ x: number; y: number; symbol: number }>) ?? []
      if (cells.length === 1) {
        return t('log.cell_click', { x: cells[0].x, y: cells[0].y, symbol: cells[0].symbol })
      }
      const uniqueColors = [...new Set(cells.map((c) => c.symbol))].sort((a, b) => a - b)
      return t('log.cell_click_multi', { count: cells.length, symbols: uniqueColors.join(', ') })
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
  const { taskId, userId: routeUserId } = useParams<{ taskId: string; userId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [abandonOpen, setAbandonOpen] = useState(false)
  const [hypothesisText, setHypothesisText] = useState('')
  const [failureAnalysisText, setFailureAnalysisText] = useState('')
  const [branchPivotText, setBranchPivotText] = useState('')

  const [userId, setUserId] = useState<number | null>(null)
  const [userError, setUserError] = useState(false)
  const [accessibleTaskIds, setAccessibleTaskIds] = useState<Set<string> | null>(null)
  const [accessChecked, setAccessChecked] = useState(false)
  const [attemptCount, setAttemptCount] = useState<number | null>(null)

  useEffect(() => {
    if (routeUserId) {
      const numericId = Number(routeUserId)
      if (!Number.isNaN(numericId)) {
        setUserId(numericId)
        setUserError(false)
      } else {
        setUserError(true)
      }
    } else {
      setUserId(1)
    }
  }, [routeUserId])

  useEffect(() => {
    if (userId === null) return
    let cancelled = false
    getUserAccessibleTaskIds(userId)
      .then((ids) => {
        if (!cancelled) {
          setAccessibleTaskIds(new Set(ids))
          setAccessChecked(true)
        }
      })
      .catch(() => {
        if (!cancelled) setAccessChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (!taskId || taskId === 'random' || userId === null) {
      setAttemptCount(null)
      return
    }
    let cancelled = false
    getAttempts(userId, taskId)
      .then((attempts) => {
        if (!cancelled) setAttemptCount(attempts.length)
      })
      .catch(() => {
        if (!cancelled) setAttemptCount(null)
      })
    return () => {
      cancelled = true
    }
  }, [userId, taskId])

  const atRoot = state.activeNodeId === 'node_000'
  const canGoPrev = state.navigationIndex > 0
  const canGoNext = state.navigationIndex < state.navigationHistory.length - 1
  const readOnly = atRoot || state.blockReason !== null

  const sentHashes = useRef<Set<string>>(new Set())
  const attemptIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!taskId || taskId === 'random') return
    if (userId === null) return
    let cancelled = false
    createAttempt(userId, taskId).then((attempt) => {
      if (!cancelled) {
        attemptIdRef.current = attempt.id
      }
    }).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [userId, taskId])

  useEffect(() => {
    if (!taskId || taskId === 'random') return
    if (userId === null) return
    if (attemptIdRef.current === null) return
    for (const node of state.graphNodes) {
      const hash = `${node.id}:${typeof node.trigger === 'string' ? node.trigger : JSON.stringify(node)}`
      if (sentHashes.current.has(hash)) continue
      postEvent({
        userId,
        taskId,
        attemptId: attemptIdRef.current,
        nodeId: node.id,
        parentNodeId: node.parentId,
        trigger: node.trigger,
        stateSnapshot: node.stateSnapshot,
        timestamp: node.timestamp,
      }).catch(() => {})
      sentHashes.current.add(hash)
    }
  }, [state.graphNodes, taskId, userId])

  useEffect(() => {
    sentHashes.current = new Set()
  }, [taskId])

  const { data: randomTasks, isFetched: randomFetched } = useRandomTasks(
    1,
    taskId === 'random',
    userId ?? undefined,
  )
  const { data: specificTask } = useTaskById(taskId ?? '')

  useEffect(() => {
    if (taskId === 'random' && randomFetched && randomTasks && randomTasks.length > 0) {
      const target = routeUserId
        ? `/solve/${routeUserId}/${randomTasks[0].id}`
        : `/solve/${randomTasks[0].id}`
      navigate(target, { replace: true })
    }
  }, [taskId, randomFetched, randomTasks, navigate, routeUserId])

  useEffect(() => {
    if (specificTask) {
      dispatch({ type: 'LOAD_TASK', task: specificTask })
      setHypothesisText('')
    }
  }, [specificTask])

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
    dispatch({ type: 'SET_SYMBOL', symbol })
    if (state.toolMode === 'select') {
      dispatch({ type: 'FILL_SELECTED' })
    }
    dispatch({ type: 'SET_TOOL_MODE', mode: 'edit' })
  }

  const handleCellClick = (x: number, y: number) => {
    dispatch({ type: 'CELL_CLICK', x, y })
  }

  const handleHypothesisSubmit = () => {
    const trimmed = hypothesisText.trim()
    if (!trimmed) return
    dispatch({ type: 'ADD_COGNITIVE_NODE', intent: 'hypothesis', text: trimmed })
    setHypothesisText('')
  }

  const handleFailureAnalysisSubmit = () => {
    const trimmed = failureAnalysisText.trim()
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length
    if (wordCount < 5) return
    dispatch({ type: 'SUBMIT_REFLECTION', intent: 'failure_analysis', text: trimmed })
    setFailureAnalysisText('')
  }

  const handleBranchPivotSubmit = () => {
    const trimmed = branchPivotText.trim()
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length
    if (wordCount < 5) return
    dispatch({ type: 'SUBMIT_REFLECTION', intent: 'branch_pivot', text: trimmed })
    setBranchPivotText('')
  }

  const handleAbandonConfirm = () => {
    setAbandonOpen(false)
    dispatch({ type: 'ABANDON' })
    navigate('/')
  }

  const handleAbandonCancel = () => {
    setAbandonOpen(false)
  }

  const handleReset = () => {
    dispatch({ type: 'RESET_OUTPUT' })
    setHypothesisText('')
    setFailureAnalysisText('')
    setBranchPivotText('')
  }

  const handleSubmit = () => {
    console.log('[SUBMIT]', JSON.stringify({
      outputGrid: state.outputGrid,
      testIndex: state.currentTestIndex,
      reference: state.test[state.currentTestIndex]?.output,
      graphNodes: state.graphNodes.map((n) => ({
        id: n.id,
        trigger: n.trigger,
        parentId: n.parentId,
      })),
    }, null, 2))
    dispatch({ type: 'SUBMIT' })
  }

  const accessDenied =
    accessChecked &&
    accessibleTaskIds !== null &&
    taskId &&
    taskId !== 'random' &&
    !accessibleTaskIds.has(taskId)

  return (
    <div data-testid="arc-lab-page">
      {userError ? (
        <div className="flex flex-col items-center justify-center gap-4 pt-24 text-center">
          <p className="text-lg text-red-400">{t('dashboard.invalid_credentials')}</p>
          <a
            href="/"
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-white transition hover:bg-gray-600"
          >
            {t('dashboard.back')}
          </a>
        </div>
      ) : accessDenied ? (
        <div className="flex flex-col items-center justify-center gap-4 pt-24 text-center">
          <p className="text-lg text-red-400">{t('arc_lab.access_denied')}</p>
          <a
            href="/my-tasks"
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-white transition hover:bg-gray-600"
          >
            {t('arc_lab.back_to_tasks')}
          </a>
        </div>
      ) : (
      <>
      <div className="flex flex-col gap-5">
        <DemonstrationPanel pairs={state.train} />

        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {taskId && taskId !== 'random' && attemptCount !== null && (
              <span className="text-sm text-gray-500">
                {t('arc_lab.attempt_count', { count: attemptCount })}
              </span>
            )}

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
              readOnly={readOnly}
              blockReason={state.blockReason}
              hypothesisText={hypothesisText}
              onHypothesisChange={setHypothesisText}
              onHypothesisSubmit={handleHypothesisSubmit}
              failureAnalysisText={failureAnalysisText}
              onFailureAnalysisChange={setFailureAnalysisText}
              onFailureAnalysisSubmit={handleFailureAnalysisSubmit}
              branchPivotText={branchPivotText}
              onBranchPivotChange={setBranchPivotText}
              onBranchPivotSubmit={handleBranchPivotSubmit}
              onSizeInputChange={(value) => dispatch({ type: 'SET_SIZE_INPUT', value })}
              onResize={() => dispatch({ type: 'RESIZE' })}
              onCopyFromInput={() => dispatch({ type: 'COPY_FROM_INPUT' })}
              onReset={handleReset}
              onSubmit={handleSubmit}
              onAbandon={() => setAbandonOpen(true)}
              onCellClick={handleCellClick}
              onSelectionChange={(cells) => dispatch({ type: 'SELECTION_CHANGE', cells })}
              onToolModeChange={(mode) => dispatch({ type: 'SET_TOOL_MODE', mode })}
              onSymbolSelect={handleSymbolSelect}
              onPrev={() => dispatch({ type: 'NAVIGATE_PREV' })}
              onNext={() => dispatch({ type: 'NAVIGATE_NEXT' })}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
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
            getLabel={(trigger) => getNodeLabel(trigger, t)}
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
      </>
      )}
    </div>
  )
}
