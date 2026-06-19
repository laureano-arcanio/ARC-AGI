import { useEffect, useReducer } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRandomTasks, useTaskById } from '../queries'
import { useTranslation } from '../../../lib/i18n'
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
  | { type: 'CELL_CLICK'; x: number; y: number }
  | { type: 'SELECTION_CHANGE'; cells: Set<string> }
  | { type: 'FILL_SELECTED' }
  | { type: 'COPY_SELECTION' }
  | { type: 'PASTE' }
  | { type: 'SET_MESSAGE'; message: ToastMessage | null }
  | { type: 'DISMISS_MESSAGE' }

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
}

function withTask(state: ArcLabState, task: ArcTask): ArcLabState {
  const firstTest = task.test[0]
  const inputGrid = serializeGridToGridObject(firstTest.input)
  return {
    ...state,
    train: task.train,
    test: task.test,
    currentTestIndex: 0,
    inputGrid,
    outputGrid: createGrid(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
    sizeInput: formatSize(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
    selectedCells: new Set(),
    clipboard: null,
    message: null,
  }
}

function reducer(state: ArcLabState, action: Action): ArcLabState {
  switch (action.type) {
    case 'LOAD_TASK': {
      return withTask(state, action.task)
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
      return {
        ...state,
        outputGrid: createGrid(parsed.height, parsed.width, dataGrid),
        selectedCells: new Set(),
      }
    }

    case 'COPY_FROM_INPUT': {
      const outputGrid = serializeGridToGridObject(state.inputGrid)
      return {
        ...state,
        outputGrid,
        sizeInput: formatSize(outputGrid.length, outputGrid[0].length),
        selectedCells: new Set(),
      }
    }

    case 'RESET_OUTPUT': {
      const outputGrid = createGrid(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH)
      return {
        ...state,
        outputGrid,
        sizeInput: formatSize(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
        selectedCells: new Set(),
      }
    }

    case 'SUBMIT': {
      const reference = state.test[state.currentTestIndex]?.output
      if (!reference) {
        return { ...state, message: { kind: 'error', text: 'toast.no_test_pair' } }
      }
      const correct = gridsEqual(state.outputGrid, reference)
      return {
        ...state,
        message: correct
          ? { kind: 'info', text: 'toast.correct' }
          : { kind: 'error', text: 'toast.wrong' },
      }
    }

    case 'CELL_CLICK': {
      if (state.toolMode === 'edit') {
        const outputGrid = cloneGrid(state.outputGrid)
        outputGrid[action.x][action.y] = state.selectedSymbol
        return { ...state, outputGrid }
      }
      if (state.toolMode === 'floodfill') {
        const outputGrid = cloneGrid(state.outputGrid)
        floodfill(outputGrid, action.x, action.y, state.selectedSymbol)
        return { ...state, outputGrid }
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
      return { ...state, outputGrid }
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
      return { ...state, outputGrid }
    }

    case 'SET_MESSAGE':
      return { ...state, message: action.message }

    case 'DISMISS_MESSAGE':
      return { ...state, message: null }

    default:
      return state
  }
}

export function ArcLabPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [state, dispatch] = useReducer(reducer, initialState)

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

  return (
    <div data-testid="arc-lab-page">
      <div className="flex gap-5">
        <DemonstrationPanel pairs={state.train} />

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
            onResize={() => dispatch({ type: 'RESIZE' })}
            onCopyFromInput={() => dispatch({ type: 'COPY_FROM_INPUT' })}
            onReset={() => dispatch({ type: 'RESET_OUTPUT' })}
            onSubmit={() => dispatch({ type: 'SUBMIT' })}
            onCellClick={(x, y) => dispatch({ type: 'CELL_CLICK', x, y })}
            onSelectionChange={(cells) => dispatch({ type: 'SELECTION_CHANGE', cells })}
            onToolModeChange={(mode) => dispatch({ type: 'SET_TOOL_MODE', mode })}
            onSymbolSelect={handleSymbolSelect}
          />

          <Toast
            message={state.message ? { ...state.message, text: t(state.message.text, state.message.params) } : null}
            onDismiss={() => dispatch({ type: 'DISMISS_MESSAGE' })}
          />
        </div>
      </div>
    </div>
  )
}
