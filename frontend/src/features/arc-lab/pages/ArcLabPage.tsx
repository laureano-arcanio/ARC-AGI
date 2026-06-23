import { useEffect, useReducer, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRandomTasks, useTaskById } from '../queries'
import { createAttempt, postEvent } from '../api'
import { getUserAccessibleTaskIds } from '../../batches/api'
import { useTranslation } from '../../../lib/i18n'
import { ConfirmDialog, InstructionModal } from '../../../components/common'
import {
  cloneGrid,
  createGrid,
  floodfill,
  formatSize,
  gridHeight,
  gridsEqual,
  gridWidth,
  parseCellKey,
  parseSize,
  serializeGridToGridObject,
} from '../utils'
import {
  DEFAULT_GRID_HEIGHT,
  DEFAULT_GRID_WIDTH,
  type ArcTask,
  type BlockReason,
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
  outputGrids: Record<number, GridData>
  toolMode: ToolMode
  selectedSymbol: number
  sizeInput: string
  selectedCells: Set<string>
  message: ToastMessage | null
  graphNodesByTest: Record<number, GraphNode[]>
  activeNodeIdByTest: Record<number, string | null>
  nextNodeIdByTest: Record<number, number>
  navigationHistoryByTest: Record<number, string[]>
  navigationIndexByTest: Record<number, number>
  blockReason: BlockReason
  pendingPivotReflection: boolean
}

type Action =
  | { type: 'LOAD_TASK'; task: ArcTask }
  | { type: 'NEXT_TEST_INPUT' }
  | { type: 'PREV_TEST_INPUT' }
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

function addNode(
  state: ArcLabState,
  trigger: GraphTrigger,
): Partial<ArcLabState> {
  const idx = state.currentTestIndex
  const nodes = state.graphNodesByTest[idx] ?? []
  const activeId = state.activeNodeIdByTest[idx] ?? null
  const nextId = state.nextNodeIdByTest[idx] ?? 0
  const id = makeNodeId(nextId)
  const node: GraphNode = {
    id,
    trigger,
    stateSnapshot: cloneGrid(state.outputGrid),
    parentId: activeId,
    timestamp: Date.now(),
    testPairIndex: idx,
  }
  return {
    graphNodesByTest: { ...state.graphNodesByTest, [idx]: [...nodes, node] },
    activeNodeIdByTest: { ...state.activeNodeIdByTest, [idx]: id },
    nextNodeIdByTest: { ...state.nextNodeIdByTest, [idx]: nextId + 1 },
  }
}

function updateHistory(
  state: ArcLabState,
  newActiveNodeId: string,
  isNewNode: boolean,
): Partial<ArcLabState> {
  const idx = state.currentTestIndex
  const history = state.navigationHistoryByTest[idx] ?? []
  const navIndex = state.navigationIndexByTest[idx] ?? 0
  if (isNewNode) {
    const newHistory = [
      ...history.slice(0, navIndex + 1),
      newActiveNodeId,
    ]
    return {
      navigationHistoryByTest: { ...state.navigationHistoryByTest, [idx]: newHistory },
      navigationIndexByTest: { ...state.navigationIndexByTest, [idx]: newHistory.length - 1 },
    }
  }
  const pos = history.indexOf(newActiveNodeId)
  if (pos >= 0) {
    return {
      navigationIndexByTest: { ...state.navigationIndexByTest, [idx]: pos },
    }
  }
  const newHistory = [...history, newActiveNodeId]
  return {
    navigationHistoryByTest: { ...state.navigationHistoryByTest, [idx]: newHistory },
    navigationIndexByTest: { ...state.navigationIndexByTest, [idx]: newHistory.length - 1 },
  }
}

const initialState: ArcLabState = {
  train: [],
  test: [],
  currentTestIndex: 0,
  inputGrid: createGrid(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
  outputGrid: createGrid(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
  outputGrids: {},
  toolMode: 'edit',
  selectedSymbol: 0,
  sizeInput: formatSize(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
  selectedCells: new Set(),
  message: null,
  graphNodesByTest: {},
  activeNodeIdByTest: {},
  nextNodeIdByTest: {},
  navigationHistoryByTest: {},
  navigationIndexByTest: {},
  blockReason: null,
  pendingPivotReflection: false,
}

function makeRootNode(outputGrid: GridData): GraphNode {
  return {
    id: 'node_000',
    trigger: { kind: 'mechanical', action: 'load_task' },
    stateSnapshot: cloneGrid(outputGrid),
    parentId: null,
    timestamp: Date.now(),
  }
}

function withTask(state: ArcLabState, task: ArcTask): ArcLabState {
  const firstTest = task.test[0]
  const inputGrid = serializeGridToGridObject(firstTest.input)
  const outputGrid = createGrid(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH)
  const root = makeRootNode(outputGrid)
  return {
    ...state,
    train: task.train,
    test: task.test,
    currentTestIndex: 0,
    inputGrid,
    outputGrid,
    outputGrids: {},
    sizeInput: formatSize(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH),
    selectedCells: new Set(),
    message: null,
    graphNodesByTest: { 0: [root] },
    activeNodeIdByTest: { 0: 'node_000' },
    nextNodeIdByTest: { 0: 1 },
    navigationHistoryByTest: { 0: ['node_000'] },
    navigationIndexByTest: { 0: 0 },
    blockReason: null,
    pendingPivotReflection: false,
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
      const savedGridsNext = { ...state.outputGrids, [state.currentTestIndex]: state.outputGrid }
      const nextIndex = state.currentTestIndex + 1
      const inputGridNext = serializeGridToGridObject(state.test[nextIndex].input)
      const outputGridNext = savedGridsNext[nextIndex] ?? createGrid(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH)
      return {
        ...state,
        currentTestIndex: nextIndex,
        inputGrid: inputGridNext,
        outputGrid: outputGridNext,
        outputGrids: savedGridsNext,
        sizeInput: formatSize(outputGridNext.length, outputGridNext[0].length),
        selectedCells: new Set(),
      }
    }

    case 'PREV_TEST_INPUT': {
      if (state.currentTestIndex <= 0) {
        return { ...state, message: { kind: 'error', text: 'toast.no_prev_test' } }
      }
      const savedGridsPrev = { ...state.outputGrids, [state.currentTestIndex]: state.outputGrid }
      const prevIndex = state.currentTestIndex - 1
      const inputGridPrev = serializeGridToGridObject(state.test[prevIndex].input)
      const outputGridPrev = savedGridsPrev[prevIndex] ?? createGrid(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH)
      return {
        ...state,
        currentTestIndex: prevIndex,
        inputGrid: inputGridPrev,
        outputGrid: outputGridPrev,
        outputGrids: savedGridsPrev,
        sizeInput: formatSize(outputGridPrev.length, outputGridPrev[0].length),
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
      if (state.pendingPivotReflection) {
        return { ...state, blockReason: 'branch_pivot', pendingPivotReflection: false }
      }
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
      const idxResize = state.currentTestIndex
      return { ...state, outputGrid, selectedCells: new Set(), ...graph, ...updateHistory(state, graph.activeNodeIdByTest![idxResize]!, true) }
    }

    case 'COPY_FROM_INPUT': {
      if (state.pendingPivotReflection) {
        return { ...state, blockReason: 'branch_pivot', pendingPivotReflection: false }
      }
      const outputGrid = serializeGridToGridObject(state.inputGrid)
      const graph = addNode(
        { ...state, outputGrid },
        { kind: 'mechanical', action: 'copy_from_input' },
      )
      const idxCopy = state.currentTestIndex
      return {
        ...state,
        outputGrid,
        sizeInput: formatSize(outputGrid.length, outputGrid[0].length),
        selectedCells: new Set(),
        ...graph,
        ...updateHistory(state, graph.activeNodeIdByTest![idxCopy]!, true),
      }
    }

    case 'RESET_OUTPUT': {
      const outputGrid = createGrid(DEFAULT_GRID_HEIGHT, DEFAULT_GRID_WIDTH)
      const idx = state.currentTestIndex
      const graph = addNode(
        { ...state, outputGrid },
        { kind: 'mechanical', action: 'reset_output' },
      )
      const afterReset = updateHistory(state, graph.activeNodeIdByTest![idx]!, true)
      const rootId = state.graphNodesByTest[idx]?.[0]?.id ?? graph.activeNodeIdByTest![idx]!
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
        activeNodeIdByTest: { ...state.activeNodeIdByTest, [idx]: rootId },
        ...afterJump,
        blockReason: null,
        pendingPivotReflection: false,
        message: { kind: 'info', text: 'timeline.branch_discarded' },
      }
    }

    case 'SUBMIT': {
      const allGrids = { ...state.outputGrids, [state.currentTestIndex]: state.outputGrid }
      let allCorrect = true
      for (let i = 0; i < state.test.length; i++) {
        const output = allGrids[i]
        if (!output || !gridsEqual(output, state.test[i].output)) {
          allCorrect = false
          break
        }
      }
      const idxSubmit = state.currentTestIndex
      const graph = addNode(
        state,
        { kind: 'mechanical', action: 'submit', details: { correct: allCorrect } },
      )
      return {
        ...state,
        outputGrids: allGrids,
        ...graph,
        ...updateHistory(state, graph.activeNodeIdByTest![idxSubmit]!, true),
        message: allCorrect
          ? { kind: 'info', text: 'toast.correct' }
          : { kind: 'error', text: 'toast.wrong' },
        blockReason: allCorrect ? 'correct_analysis' : 'failure_analysis',
      }
    }

    case 'ABANDON': {
      const idxAbandon = state.currentTestIndex
      const graph = addNode(
        state,
        { kind: 'mechanical', action: 'abandon' },
      )
      return { ...state, ...graph, ...updateHistory(state, graph.activeNodeIdByTest![idxAbandon]!, true) }
    }

    case 'CELL_CLICK': {
      if (state.toolMode === 'edit') {
        const outputGrid = cloneGrid(state.outputGrid)
        outputGrid[action.x][action.y] = state.selectedSymbol
        const cellEntry = { x: action.x, y: action.y, symbol: state.selectedSymbol }
        const idx = state.currentTestIndex
        const nodes = state.graphNodesByTest[idx] ?? []
        const activeId = state.activeNodeIdByTest[idx] ?? null
        const lastNode = nodes[nodes.length - 1]
        if (
          activeId === lastNode?.id &&
          lastNode?.trigger.kind === 'mechanical' &&
          lastNode.trigger.action === 'cell_paint'
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
          const graphNodes = [...nodes.slice(0, -1), updatedNode]
          return { ...state, outputGrid, graphNodesByTest: { ...state.graphNodesByTest, [idx]: graphNodes } }
        }
        const graph = addNode(
          { ...state, outputGrid },
          { kind: 'mechanical', action: 'cell_paint', details: { cells: [cellEntry] } },
        )
        return { ...state, outputGrid, ...graph, ...updateHistory(state, graph.activeNodeIdByTest![idx]!, true) }
      }
      if (state.toolMode === 'floodfill') {
        const outputGrid = cloneGrid(state.outputGrid)
        floodfill(outputGrid, action.x, action.y, state.selectedSymbol)
        const graph = addNode(
          { ...state, outputGrid },
          { kind: 'mechanical', action: 'fill_selected', details: { x: action.x, y: action.y, symbol: state.selectedSymbol } },
        )
        return { ...state, outputGrid, ...graph, ...updateHistory(state, graph.activeNodeIdByTest![state.currentTestIndex]!, true) }
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
      const idxFill = state.currentTestIndex
      const graph = addNode(
        { ...state, outputGrid },
        { kind: 'mechanical', action: 'fill_selected', details: { count: state.selectedCells.size, symbol: state.selectedSymbol } },
      )
      return { ...state, outputGrid, ...graph, ...updateHistory(state, graph.activeNodeIdByTest![idxFill]!, true) }
    }

    case 'SET_MESSAGE':
      return { ...state, message: action.message }

    case 'DISMISS_MESSAGE':
      return { ...state, message: null }

    case 'TRAVEL_TO_NODE': {
      const idx = state.currentTestIndex
      const nodes = state.graphNodesByTest[idx] ?? []
      const target = nodes.find((n) => n.id === action.nodeId)
      if (!target) return state
      const lastNode = nodes[nodes.length - 1]
      const isBackwards = target.id !== lastNode?.id && target.id !== 'node_000'
      return {
        ...state,
        outputGrid: cloneGrid(target.stateSnapshot),
        activeNodeIdByTest: { ...state.activeNodeIdByTest, [idx]: target.id },
        ...updateHistory(state, target.id, false),
        pendingPivotReflection: isBackwards,
      }
    }

    case 'ADD_COGNITIVE_NODE': {
      const idxCog = state.currentTestIndex
      const graph = addNode(
        state,
        { kind: 'cognitive', intent: action.intent, text: action.text },
      )
      return { ...state, ...graph, ...updateHistory(state, graph.activeNodeIdByTest![idxCog]!, true), pendingPivotReflection: false }
    }

    case 'SET_BLOCK_REASON': {
      return { ...state, blockReason: action.reason, pendingPivotReflection: false }
    }

    case 'SUBMIT_REFLECTION': {
      const idxRefl = state.currentTestIndex
      const graph = addNode(
        state,
        { kind: 'cognitive', intent: action.intent, text: action.text },
      )
      return {
        ...state,
        ...graph,
        ...updateHistory(state, graph.activeNodeIdByTest![idxRefl]!, true),
        blockReason: null,
        pendingPivotReflection: false,
      }
    }

    case 'NAVIGATE_PREV': {
      const idx = state.currentTestIndex
      const navHistory = state.navigationHistoryByTest[idx] ?? []
      const navIdx = state.navigationIndexByTest[idx] ?? 0
      if (navIdx <= 0) return state
      const prevId = navHistory[navIdx - 1]
      const nodes = state.graphNodesByTest[idx] ?? []
      const target = nodes.find((n) => n.id === prevId)
      if (!target) return state
      const lastNode = nodes[nodes.length - 1]
      const isBackwards = target.id !== lastNode?.id && target.id !== 'node_000'
      return {
        ...state,
        outputGrid: cloneGrid(target.stateSnapshot),
        activeNodeIdByTest: { ...state.activeNodeIdByTest, [idx]: prevId },
        navigationIndexByTest: { ...state.navigationIndexByTest, [idx]: navIdx - 1 },
        pendingPivotReflection: isBackwards,
      }
    }

    case 'NAVIGATE_NEXT': {
      const idx = state.currentTestIndex
      const navHistory = state.navigationHistoryByTest[idx] ?? []
      const navIdx = state.navigationIndexByTest[idx] ?? 0
      if (navIdx >= navHistory.length - 1) return state
      const nextId = navHistory[navIdx + 1]
      const nodes = state.graphNodesByTest[idx] ?? []
      const target = nodes.find((n) => n.id === nextId)
      if (!target) return state
      const lastNode = nodes[nodes.length - 1]
      const isBackwards = target.id !== lastNode?.id && target.id !== 'node_000'
      return {
        ...state,
        outputGrid: cloneGrid(target.stateSnapshot),
        activeNodeIdByTest: { ...state.activeNodeIdByTest, [idx]: nextId },
        navigationIndexByTest: { ...state.navigationIndexByTest, [idx]: navIdx + 1 },
        pendingPivotReflection: isBackwards,
      }
    }

    default:
      return state
  }
}

const COGNITIVE_COMPACT: Record<CognitiveIntent, string> = {
  hypothesis: 'Hypothesis',
  failure_analysis: 'Failure analysis',
  branch_pivot: 'Branch pivot',
  correct_analysis: 'Correct',
}

function getNodeLabel(trigger: GraphTrigger): string {
  if (trigger.kind === 'cognitive') {
    const base = COGNITIVE_COMPACT[trigger.intent]
    return trigger.text ? `${base}: ${trigger.text}` : base
  }
  switch (trigger.action) {
    case 'load_task':
      return 'Start'
    case 'cell_paint': {
      const cells = (trigger.details?.cells as Array<{ x: number; y: number; symbol: number }>) ?? []
      if (cells.length === 1) {
        return `Paint (${cells[0].x},${cells[0].y})`
      }
      return `Paint \u00d7${cells.length}`
    }
    case 'fill_selected': {
      const count = Number(trigger.details?.count ?? 0)
      return `Fill \u00d7${count}`
    }
    case 'resize': {
      return String(trigger.details?.size ?? '')
    }
    case 'copy_from_input':
      return 'Copy in'
    case 'reset_output':
      return 'Reset'
    case 'abandon':
      return 'Abandon'
    case 'submit': {
      const d = trigger.details ?? {}
      return d.correct ? '\u2713 Correct' : '\u2717 Wrong'
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
  const [correctAnalysisText, setCorrectAnalysisText] = useState('')

  const [userId, setUserId] = useState<number | null>(null)
  const [userError, setUserError] = useState(false)
  const [accessibleTaskIds, setAccessibleTaskIds] = useState<Set<string> | null>(null)
  const [accessChecked, setAccessChecked] = useState(false)
  const [attemptCount, setAttemptCount] = useState<number | null>(null)

  const [instructionOpen, setInstructionOpen] = useState(true)

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

  const currentNodes = state.graphNodesByTest[state.currentTestIndex] ?? []
  const currentActiveNodeId = state.activeNodeIdByTest[state.currentTestIndex] ?? null
  const currentNavHistory = state.navigationHistoryByTest[state.currentTestIndex] ?? []
  const currentNavIndex = state.navigationIndexByTest[state.currentTestIndex] ?? 0
  const atRoot = currentNodes.some((n) => n.id === currentActiveNodeId && n.trigger.action === 'load_task')
  const canGoPrev = currentNavIndex > 0
  const canGoNext = currentNavIndex < currentNavHistory.length - 1
  const readOnly = atRoot || state.blockReason !== null

  const lastEventKeyRef = useRef<string | null>(null)

  function shouldDispatchEvent(actionKey: string): boolean {
    if (lastEventKeyRef.current === actionKey) return false
    lastEventKeyRef.current = actionKey
    return true
  }

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
    for (const [testIdxStr, nodes] of Object.entries(state.graphNodesByTest)) {
      for (const node of nodes) {
        const hash = `${testIdxStr}:${node.id}:${JSON.stringify(node.trigger)}`
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
          testPairIndex: Number(testIdxStr),
        }).catch(() => {})
        sentHashes.current.add(hash)
      }
    }
  }, [state.graphNodesByTest, taskId, userId])

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
      lastEventKeyRef.current = null
    }
  }, [specificTask])

  const interceptPivotReflection = (): boolean => {
    if (state.pendingPivotReflection) {
      dispatch({ type: 'SET_BLOCK_REASON', reason: 'branch_pivot' })
      return true
    }
    return false
  }

  const handleSymbolSelect = (symbol: number) => {
    if (interceptPivotReflection()) return
    dispatch({ type: 'SET_SYMBOL', symbol })
    if (state.toolMode === 'select') {
      dispatch({ type: 'FILL_SELECTED' })
    }
    dispatch({ type: 'SET_TOOL_MODE', mode: 'edit' })
  }

  const handleCellClick = (x: number, y: number) => {
    if (interceptPivotReflection()) return
    if (!shouldDispatchEvent(`cell_paint:${x}:${y}:${state.selectedSymbol}`)) return
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

  const handleCorrectAnalysisSubmit = () => {
    const trimmed = correctAnalysisText.trim()
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length
    if (wordCount < 5) return
    dispatch({ type: 'SUBMIT_REFLECTION', intent: 'correct_analysis', text: trimmed })
    setCorrectAnalysisText('')
  }

  const handleAbandonConfirm = () => {
    setAbandonOpen(false)
    dispatch({ type: 'ABANDON' })
    navigate('/my-tasks')
  }

  const handleAbandonCancel = () => {
    setAbandonOpen(false)
  }

  const handleReset = () => {
    if (!shouldDispatchEvent('reset_output')) return
    dispatch({ type: 'RESET_OUTPUT' })
    setHypothesisText('')
    setFailureAnalysisText('')
    setBranchPivotText('')
    setCorrectAnalysisText('')
  }

  const handleResize = () => {
    if (!shouldDispatchEvent(`resize:${state.sizeInput}`)) return
    dispatch({ type: 'RESIZE' })
  }

  const handleCopyFromInput = () => {
    if (!shouldDispatchEvent('copy_from_input')) return
    dispatch({ type: 'COPY_FROM_INPUT' })
  }

  const handleSubmit = () => {
    console.log('[SUBMIT]', JSON.stringify({
      outputGrid: state.outputGrid,
      testIndex: state.currentTestIndex,
      reference: state.test[state.currentTestIndex]?.output,
      graphNodes: currentNodes.map((n) => ({
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
      <DemonstrationPanel pairs={state.train} />
      <div className="flex flex-col">

        <CognitiveTimeline
          nodes={currentNodes}
          activeNodeId={currentActiveNodeId}
          onNodeClick={(nodeId) => dispatch({ type: 'TRAVEL_TO_NODE', nodeId })}
          getLabel={(trigger) => getNodeLabel(trigger)}
          testCount={state.test.length}
          currentTestIndex={state.currentTestIndex}
          onTestSelect={(idx) => {
            const diff = idx - state.currentTestIndex
            for (let i = 0; i < Math.abs(diff); i++) {
              dispatch(diff > 0 ? { type: 'NEXT_TEST_INPUT' } : { type: 'PREV_TEST_INPUT' })
            }
          }}
        />

        <div className="flex items-center justify-between mb-2 mt-4">
          <span className="text-sm font-semibold text-gray-200">
            {t('panel.test_input')}{' '}
            <span className="text-gray-400">{gridHeight(state.inputGrid)}×{gridWidth(state.inputGrid)}</span>{' '}
            <span className="text-gray-400">{state.currentTestIndex + 1}/{state.test.length}</span>
            {taskId && taskId !== 'random' && attemptCount !== null && (
              <span className="text-gray-400"> · {t('arc_lab.attempt_count', { count: attemptCount })}</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAbandonOpen(true)}
              data-testid="abandon-btn"
              className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-700"
            >
              {t('button.abandon')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              data-testid="submit-btn"
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
            >
              {t('button.submit')}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <TestInputPanel
                input={state.inputGrid}
              />
              {state.test.length > 1 && (
                <div data-testid="test-nav" className="flex flex-col items-center gap-2 px-4 pb-2">
                  <span className="text-xs text-gray-400">
                    {t('test_nav.label', { count: state.test.length })}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'PREV_TEST_INPUT' })}
                      data-testid="prev-test-input"
                      className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-300 transition hover:bg-gray-700 hover:text-white"
                    >
                      {t('button.prev_test')}
                    </button>
                    <span className="text-sm text-gray-200" data-testid="test-index">
                      {state.currentTestIndex + 1}/{state.test.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'NEXT_TEST_INPUT' })}
                      data-testid="next-test-input"
                      className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-300 transition hover:bg-gray-700 hover:text-white"
                    >
                      {t('button.next_test')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
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
              correctAnalysisText={correctAnalysisText}
              onCorrectAnalysisChange={setCorrectAnalysisText}
              onCorrectAnalysisSubmit={handleCorrectAnalysisSubmit}
              onSizeInputChange={(value) => dispatch({ type: 'SET_SIZE_INPUT', value })}
              onResize={handleResize}
              onCopyFromInput={handleCopyFromInput}
              onReset={handleReset}
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
          </div>
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

      <InstructionModal
        open={instructionOpen}
        onDismiss={() => setInstructionOpen(false)}
      />
      </>
      )}
    </div>
  )
}
