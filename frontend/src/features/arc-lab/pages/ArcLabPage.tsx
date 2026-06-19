import { useEffect, useReducer } from 'react'
import { useRandomTask } from '../queries'
import { readTaskFromFile } from '../api'
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
import { TaskModal } from '../components/TaskModal'
import { Toast } from '../components/Toast'

type ArcLabState = {
  train: TaskPair[]
  test: TaskPair[]
  currentTestIndex: number
  inputGrid: GridData
  outputGrid: GridData
  toolMode: ToolMode
  selectedSymbol: number
  showSymbolNumbers: boolean
  sizeInput: string
  clipboard: ClipboardEntry[] | null
  selectedCells: Set<string>
  modalOpen: boolean
  taskName: string | null
  taskIndex: number | null
  taskTotal: number | null
  message: ToastMessage | null
}

type Action =
  | { type: 'LOAD_TASK'; task: ArcTask; name: string; index: number | null; total: number | null }
  | { type: 'NEXT_TEST_INPUT' }
  | { type: 'SET_TOOL_MODE'; mode: ToolMode }
  | { type: 'SET_SYMBOL'; symbol: number }
  | { type: 'SET_SHOW_NUMBERS'; value: boolean }
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
  | { type: 'CLOSE_MODAL' }

const initialState: ArcLabState = {
  train: [],
  test: [],
  currentTestIndex: 0,
  inputGrid: createGrid(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
  outputGrid: createGrid(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
  toolMode: 'edit',
  selectedSymbol: 0,
  showSymbolNumbers: false,
  sizeInput: formatSize(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
  clipboard: null,
  selectedCells: new Set(),
  modalOpen: true,
  taskName: null,
  taskIndex: null,
  taskTotal: null,
  message: null,
}

function reducer(state: ArcLabState, action: Action): ArcLabState {
  switch (action.type) {
    case 'LOAD_TASK': {
      const { task, name, index, total } = action
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
        modalOpen: false,
        taskName: name,
        taskIndex: index,
        taskTotal: total,
        message: null,
      }
    }

    case 'NEXT_TEST_INPUT': {
      if (state.test.length <= state.currentTestIndex + 1) {
        return { ...state, message: { kind: 'error', text: 'No next test input. Pick another file?' } }
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

    case 'SET_SHOW_NUMBERS':
      return { ...state, showSymbolNumbers: action.value }

    case 'SET_SIZE_INPUT':
      return { ...state, sizeInput: action.value }

    case 'RESIZE': {
      const parsed = parseSize(state.sizeInput)
      if (!parsed.ok) {
        return { ...state, message: { kind: 'error', text: parsed.error } }
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
        return { ...state, message: { kind: 'error', text: 'No test pair to check against.' } }
      }
      const correct = gridsEqual(state.outputGrid, reference)
      return {
        ...state,
        message: correct
          ? { kind: 'info', text: 'Correct solution!' }
          : { kind: 'error', text: 'Wrong solution.' },
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
        return { ...state, message: { kind: 'error', text: 'No cells selected to copy.' } }
      }
      const clipboard: ClipboardEntry[] = []
      for (const key of state.selectedCells) {
        const { x, y } = parseCellKey(key)
        clipboard.push({ x, y, symbol: state.outputGrid[x][y] })
      }
      return {
        ...state,
        clipboard,
        message: { kind: 'info', text: 'Cells copied! Select a target cell and press V to paste at location.' },
      }
    }

    case 'PASTE': {
      if (!state.clipboard || state.clipboard.length === 0) {
        return { ...state, message: { kind: 'error', text: 'No data to paste.' } }
      }
      if (state.selectedCells.size !== 1) {
        return { ...state, message: { kind: 'error', text: 'Select a target cell on the output grid.' } }
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

    case 'CLOSE_MODAL':
      return { ...state, modalOpen: false }

    default:
      return state
  }
}

export function ArcLabPage() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const randomTaskMutation = useRandomTask()

  const handleLoadFile = async (file: File) => {
    try {
      const { task, name } = await readTaskFromFile(file)
      dispatch({ type: 'LOAD_TASK', task, name, index: null, total: null })
    } catch (e) {
      dispatch({ type: 'SET_MESSAGE', message: { kind: 'error', text: (e as Error).message } })
    }
  }

  const handleRandomTask = () => {
    randomTaskMutation.mutate('training', {
      onSuccess: (result) => {
        dispatch({
          type: 'LOAD_TASK',
          task: result.task,
          name: result.name,
          index: result.index,
          total: result.total,
        })
        dispatch({
          type: 'SET_MESSAGE',
          message: { kind: 'info', text: `Loaded task ${result.subset}/${result.name}` },
        })
      },
      onError: (e) => {
        dispatch({ type: 'SET_MESSAGE', message: { kind: 'error', text: (e as Error).message } })
      },
    })
  }

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
  }

  return (
    <div data-testid="arc-lab-page">
      <TaskModal
        open={state.modalOpen}
        onLoadFile={handleLoadFile}
        onRandomTask={handleRandomTask}
        isFetchingRandom={randomTaskMutation.isPending}
      />

      <div className="flex gap-5">
        <DemonstrationPanel pairs={state.train} showNumbers={state.showSymbolNumbers} />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex gap-4">
            <TestInputPanel
              input={state.inputGrid}
              currentIndex={state.currentTestIndex}
              total={state.test.length}
              showNumbers={state.showSymbolNumbers}
              onNext={() => dispatch({ type: 'NEXT_TEST_INPUT' })}
            />
          </div>

          <TaskControls
            taskName={state.taskName}
            taskIndex={state.taskIndex}
            taskTotal={state.taskTotal}
            showSymbolNumbers={state.showSymbolNumbers}
            onShowSymbolNumbersChange={(value) => dispatch({ type: 'SET_SHOW_NUMBERS', value })}
            onLoadFile={handleLoadFile}
            onRandomTask={handleRandomTask}
            isFetchingRandom={randomTaskMutation.isPending}
          />

          <OutputEditor
            grid={state.outputGrid}
            toolMode={state.toolMode}
            selectedSymbol={state.selectedSymbol}
            showNumbers={state.showSymbolNumbers}
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
            message={state.message}
            onDismiss={() => dispatch({ type: 'DISMISS_MESSAGE' })}
          />
        </div>
      </div>
    </div>
  )
}
