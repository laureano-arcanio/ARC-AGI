import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useRandomTasks, useTaskById } from '../queries'
import {
  createAttempt,
  fetchEventsByAttempt,
  postEventWithRetry,
  submitAttempt,
} from '../api'
import { getUserAccessibleTaskIds } from '../../batches/api'
import { useTranslation } from '../../../lib/i18n'
import { ConfirmDialog, InstructionModal } from '../../../components/common'
import {
  cloneGrid,
  createGrid,
  floodfill,
  formatSize,
  getConnectedComponent,
  gridHeight,
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
import { HypothesisPanel } from '../components/HypothesisPanel'
import { AhaMomentModal } from '../components/AhaMomentModal'
import { FailureModal } from '../components/FailureModal'
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
  correctPairs: Record<number, boolean>
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
  | { type: 'SUBMIT'; correct: boolean }
  | { type: 'ABANDON' }
  | { type: 'CELL_CLICK'; x: number; y: number }
  | { type: 'SELECTION_CHANGE'; cells: Set<string> }
  | { type: 'FILL_SELECTED' }
  | { type: 'SET_MESSAGE'; message: ToastMessage | null }
  | { type: 'DISMISS_MESSAGE' }
  | { type: 'TRAVEL_TO_NODE'; nodeId: string }
  | { type: 'ADD_COGNITIVE_NODE'; intent: CognitiveIntent; text: string; details?: Record<string, unknown> }
  | { type: 'SUBMIT_REFLECTION'; intent: CognitiveIntent; text: string }
  | { type: 'SET_BLOCK_REASON'; reason: BlockReason }
  | { type: 'NAVIGATE_PREV' }
  | { type: 'NAVIGATE_NEXT' }
  | { type: 'LOAD_PRE_SOLVER_EVENTS'; nodes: GraphNode[] }
  | { type: 'ADD_BRANCH_PIVOT'; text: string; parentNodeId: string }

function makeNodeId(n: number): string {
  return `node_${String(n).padStart(3, '0')}`
}

// The per-test node counter must never regenerate an id that already exists,
// otherwise two nodes share an id and their differing parentId values can form
// a cycle in the timeline graph (which hangs the layout). Derive the next id
// from the highest existing `node_NNN` so it is always collision-free.
function nextNodeIdFor(nodes: GraphNode[]): number {
  let max = -1
  for (const n of nodes) {
    const match = /^node_(\d+)$/.exec(n.id)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return max + 1
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
  correctPairs: {},
}

// Seed the per-test graph state for `idx` if it has never been visited, mirroring
// how withTask() seeds index 0. Without this, navigating to a fresh test leaves
// nextNodeIdByTest[idx] undefined (→ 0), so the first action regenerates
// node_000 and collides with whatever root already exists.
function ensureTestGraphInit(
  state: ArcLabState,
  idx: number,
  outputGrid: GridData,
): Partial<ArcLabState> {
  if (state.graphNodesByTest[idx] !== undefined) return {}
  const root = makeRootNode(outputGrid)
  return {
    graphNodesByTest: { ...state.graphNodesByTest, [idx]: [root] },
    activeNodeIdByTest: { ...state.activeNodeIdByTest, [idx]: root.id },
    nextNodeIdByTest: { ...state.nextNodeIdByTest, [idx]: nextNodeIdFor([root]) },
    navigationHistoryByTest: { ...state.navigationHistoryByTest, [idx]: [root.id] },
    navigationIndexByTest: { ...state.navigationIndexByTest, [idx]: 0 },
  }
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
    correctPairs: {},
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
        ...ensureTestGraphInit(state, nextIndex, outputGridNext),
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
        ...ensureTestGraphInit(state, prevIndex, outputGridPrev),
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
      const idxResize = state.currentTestIndex
      return { ...state, outputGrid, selectedCells: new Set(), ...graph, ...updateHistory(state, graph.activeNodeIdByTest![idxResize]!, true) }
    }

    case 'COPY_FROM_INPUT': {
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
        message: { kind: 'info', text: 'timeline.branch_discarded' },
      }
    }

    case 'SUBMIT': {
      const allGrids = { ...state.outputGrids, [state.currentTestIndex]: state.outputGrid }
      const pairCorrect = action.correct
      const idxSubmit = state.currentTestIndex
      const newCorrectPairs = { ...state.correctPairs }
      if (pairCorrect) {
        newCorrectPairs[idxSubmit] = true
      } else {
        delete newCorrectPairs[idxSubmit]
      }
      const allPairsCorrect = Object.keys(newCorrectPairs).length === state.test.length
      const graph = addNode(
        state,
        { kind: 'mechanical', action: 'submit', details: { correct: pairCorrect } },
      )
      return {
        ...state,
        outputGrids: allGrids,
        correctPairs: newCorrectPairs,
        ...graph,
        ...updateHistory(state, graph.activeNodeIdByTest![idxSubmit]!, true),
        message: pairCorrect
          ? { kind: 'info', text: 'toast.correct' }
          : { kind: 'error', text: 'toast.wrong' },
        blockReason: allPairsCorrect ? 'correct_analysis' : null,
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
      if (state.toolMode === 'object_select') {
        const cells = getConnectedComponent(state.outputGrid, action.x, action.y)
        if (cells.size === 0) {
          return { ...state, toolMode: 'edit', selectedCells: new Set() }
        }
        const symbol = state.outputGrid[action.x]?.[action.y] ?? 0
        const graph = addNode(
          { ...state },
          {
            kind: 'mechanical',
            action: 'select_object',
            details: {
              cells: Array.from(cells).map(parseCellKey),
              symbol,
              count: cells.size,
            },
          },
        )
        return {
          ...state,
          selectedCells: cells,
          toolMode: 'select',
          ...graph,
          ...updateHistory(state, graph.activeNodeIdByTest![state.currentTestIndex]!, true),
        }
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
      return {
        ...state,
        outputGrid: cloneGrid(target.stateSnapshot),
        activeNodeIdByTest: { ...state.activeNodeIdByTest, [idx]: target.id },
        ...updateHistory(state, target.id, false),
      }
    }

    case 'ADD_COGNITIVE_NODE': {
      const idxCog = state.currentTestIndex
      const graph = addNode(
        state,
        { kind: 'cognitive', intent: action.intent, text: action.text, ...(action.details ? { details: action.details } : {}) },
      )
      return { ...state, ...graph, ...updateHistory(state, graph.activeNodeIdByTest![idxCog]!, true) }
    }

    case 'ADD_BRANCH_PIVOT': {
      const idxBp = state.currentTestIndex
      const nodes = state.graphNodesByTest[idxBp] ?? []
      const nextId = state.nextNodeIdByTest[idxBp] ?? 0
      const id = makeNodeId(nextId)
      const node: GraphNode = {
        id,
        trigger: { kind: 'cognitive', intent: 'branch_pivot', text: action.text },
        stateSnapshot: cloneGrid(state.outputGrid),
        parentId: action.parentNodeId,
        timestamp: Date.now(),
        testPairIndex: idxBp,
      }
      return {
        ...state,
        graphNodesByTest: { ...state.graphNodesByTest, [idxBp]: [...nodes, node] },
        activeNodeIdByTest: { ...state.activeNodeIdByTest, [idxBp]: id },
        nextNodeIdByTest: { ...state.nextNodeIdByTest, [idxBp]: nextId + 1 },
        ...updateHistory(state, id, true),
        blockReason: null,
      }
    }

    case 'SET_BLOCK_REASON': {
      return { ...state, blockReason: action.reason }
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
      return {
        ...state,
        outputGrid: cloneGrid(target.stateSnapshot),
        activeNodeIdByTest: { ...state.activeNodeIdByTest, [idx]: prevId },
        navigationIndexByTest: { ...state.navigationIndexByTest, [idx]: navIdx - 1 },
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
      return {
        ...state,
        outputGrid: cloneGrid(target.stateSnapshot),
        activeNodeIdByTest: { ...state.activeNodeIdByTest, [idx]: nextId },
        navigationIndexByTest: { ...state.navigationIndexByTest, [idx]: navIdx + 1 },
      }
    }

    case 'LOAD_PRE_SOLVER_EVENTS': {
      const testCount = state.test.length
      const graphNodesByTest = { ...state.graphNodesByTest }
      const activeNodeIdByTest = { ...state.activeNodeIdByTest }
      const nextNodeIdByTest = { ...state.nextNodeIdByTest }
      const navigationHistoryByTest = { ...state.navigationHistoryByTest }
      const navigationIndexByTest = { ...state.navigationIndexByTest }

      let hasNewNodes = false
      const { nodes: preNodes } = action
      const { text, isUncertain } = getFinalHypothesis(preNodes)

      for (let idx = 0; idx < testCount; idx++) {
        const existingIds = new Set(graphNodesByTest[idx]?.map((n) => n.id) ?? [])
        const newNodes = preNodes.filter((n) => !existingIds.has(n.id))
        if (newNodes.length === 0) {
          if (existingIds.has('hypothesis_final')) continue
        }
        hasNewNodes = true
        let nodes = graphNodesByTest[idx] ?? []
        if (!nodes.find((n) => n.id === 'node_000')) {
          const root: GraphNode = {
            id: 'node_000',
            trigger: { kind: 'mechanical', action: 'load_task' },
            stateSnapshot: createGrid(3, 3),
            parentId: null,
            timestamp: Date.now(),
          }
          nodes = [root, ...nodes]
        }
        const combined = [...nodes, ...newNodes]
        const hypothesisFinal: GraphNode = {
          id: 'hypothesis_final',
          parentId: 'node_000',
          trigger: {
            kind: 'cognitive',
            intent: 'hypothesis',
            text: text ?? '',
            details: {
              isPreSolverFinal: true,
              ...(isUncertain ? { revisionType: 'uncertain' } : {}),
            },
          },
          stateSnapshot: [[0]],
          timestamp: Date.now(),
        }
        graphNodesByTest[idx] = [...combined, hypothesisFinal]
        activeNodeIdByTest[idx] = hypothesisFinal.id
        // Keep the per-test counter ahead of every node now assigned to this
        // test so the next user action can't regenerate node_000 (which would
        // collide with the root and cycle node_000 ⇄ hypothesis_final).
        nextNodeIdByTest[idx] = nextNodeIdFor(graphNodesByTest[idx])
        navigationHistoryByTest[idx] = ['node_000', hypothesisFinal.id]
        navigationIndexByTest[idx] = 1
      }

      if (!hasNewNodes) return state
      return {
        ...state,
        graphNodesByTest,
        activeNodeIdByTest,
        nextNodeIdByTest,
        navigationHistoryByTest,
        navigationIndexByTest,
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
  initial_hypothesis: 'Initial hypothesis',
  hypothesis_revision: 'Hypothesis revision',
  final_algorithm_before_solving: 'Final algorithm',
  hypothesis_finalized: 'Hypothesis finalized',
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

function getFinalHypothesis(nodes: GraphNode[]): { text: string | null; isUncertain: boolean } {
  const sorted = nodes
    .filter((n) => n.trigger.kind === 'cognitive')
    .sort((a, b) => a.timestamp - b.timestamp)

  if (sorted.length === 0) return { text: null, isUncertain: false }

  let lastText: string | null = null
  let isUncertain = false

  for (const node of sorted) {
    const trig = node.trigger as { kind: 'cognitive'; intent: CognitiveIntent; text: string; details?: Record<string, unknown> }
    const intent = trig.intent
    if (intent === 'initial_hypothesis' || intent === 'hypothesis_revision' || intent === 'final_algorithm_before_solving' || intent === 'hypothesis_finalized') {
      if (trig.details?.isPreSolverFinal && !trig.text) continue
      if (trig.text) lastText = trig.text
      if (intent === 'hypothesis_revision') {
        const rt = trig.details?.revisionType
        if (rt === 'uncertain') isUncertain = true
        else if (rt === 'confirmed' || rt === 'refined') isUncertain = false
      }
    }
  }

  return { text: lastText, isUncertain }
}

function getLastHypothesisNodeId(nodes: GraphNode[]): string | null {
  const hypothesisIntents = new Set<CognitiveIntent>([
    'hypothesis',
    'hypothesis_revision',
    'initial_hypothesis',
    'final_algorithm_before_solving',
    'hypothesis_finalized',
  ])
  const hypothesisNodes = nodes.filter(
    (n) => n.trigger.kind === 'cognitive' && hypothesisIntents.has(n.trigger.intent),
  )
  if (hypothesisNodes.length === 0) return null
  return hypothesisNodes[hypothesisNodes.length - 1].id
}

export function ArcLabPage() {
  const { taskId, userId: routeUserId } = useParams<{ taskId: string; userId: string }>()
  const [searchParams] = useSearchParams()
  const urlAttemptId = searchParams.get('attemptId')
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [abandonOpen, setAbandonOpen] = useState(false)
  const [ahaOpen, setAhaOpen] = useState(false)
  const [pendingFailureAnalysis, setPendingFailureAnalysis] = useState(false)
  const [failureModalOpen, setFailureModalOpen] = useState(false)

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

  const currentNodes = useMemo(
    () => state.graphNodesByTest[state.currentTestIndex] ?? [],
    [state.graphNodesByTest, state.currentTestIndex],
  )
  const currentActiveNodeId = state.activeNodeIdByTest[state.currentTestIndex] ?? null
  const currentNavHistory = state.navigationHistoryByTest[state.currentTestIndex] ?? []
  const currentNavIndex = state.navigationIndexByTest[state.currentTestIndex] ?? 0
  const canGoPrev = currentNavIndex > 0
  const canGoNext = currentNavIndex < currentNavHistory.length - 1
  const readOnly = state.blockReason === 'correct_analysis'

  const { text: hypothesisText, isUncertain } = useMemo(
    () => getFinalHypothesis(currentNodes),
    [currentNodes],
  )

  const timelineNodes = useMemo(
    () => currentNodes.filter((n) => !n.id.startsWith('pre_node_')),
    [currentNodes],
  )

  const lastEventKeyRef = useRef<string | null>(null)

  function shouldDispatchEvent(actionKey: string): boolean {
    if (lastEventKeyRef.current === actionKey) return false
    lastEventKeyRef.current = actionKey
    return true
  }

  const sentHashes = useRef<Set<string>>(new Set())
  const inFlightHashes = useRef<Set<string>>(new Set())
  const attemptIdRef = useRef<number | null>(null)
  const prevTaskIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (urlAttemptId) {
      attemptIdRef.current = Number(urlAttemptId)
      return
    }
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
  }, [userId, taskId, urlAttemptId])

  const loadedAttemptId = useRef<string | null>(null)

  useEffect(() => {
    if (!taskId || taskId === 'random' || !userId || !urlAttemptId) return
    if (state.train.length === 0) return
    if (loadedAttemptId.current === urlAttemptId) return
    loadedAttemptId.current = urlAttemptId
    fetchEventsByAttempt(userId, taskId, Number(urlAttemptId)).then((events) => {
      for (const ev of events) {
        const testIdx = ev.testPairIndex ?? 0
        const hash = `${testIdx}:${ev.nodeId}:${JSON.stringify(ev.trigger)}`
        sentHashes.current.add(hash)
      }
      const preSolverNodes: GraphNode[] = events
        .filter((ev) => ev.nodeId.startsWith('pre_node_'))
        .map((ev) => ({
          id: ev.nodeId,
          trigger: ev.trigger as unknown as GraphTrigger,
          stateSnapshot: ev.stateSnapshot,
          parentId: ev.parentNodeId,
          timestamp: ev.timestamp,
        }))
      if (preSolverNodes.length > 0) {
        dispatch({ type: 'LOAD_PRE_SOLVER_EVENTS', nodes: preSolverNodes })
      }
    }).catch(() => {})
  }, [userId, taskId, urlAttemptId, state.train.length])

  useEffect(() => {
    if (!taskId || taskId === 'random') return
    if (userId === null) return
    const attemptId = attemptIdRef.current
    if (attemptId === null) return
    for (const [testIdxStr, nodes] of Object.entries(state.graphNodesByTest)) {
      for (const node of nodes) {
        if (node.id.startsWith('pre_node_')) continue
        if (node.id === 'hypothesis_final') continue
        // Submit events are recorded server-side by submitAttempt (the server
        // owns correctness), so never post them through the generic endpoint.
        if (node.trigger.kind === 'mechanical' && node.trigger.action === 'submit') {
          continue
        }
        const hash = `${testIdxStr}:${node.id}:${JSON.stringify(node.trigger)}`
        if (sentHashes.current.has(hash) || inFlightHashes.current.has(hash)) {
          continue
        }
        inFlightHashes.current.add(hash)
        // Only mark an event as saved once the post actually succeeds; on
        // permanent failure surface a visible error instead of losing it.
        postEventWithRetry({
          userId,
          taskId,
          attemptId,
          nodeId: node.id,
          parentNodeId: node.parentId,
          trigger: node.trigger,
          stateSnapshot: node.stateSnapshot,
          timestamp: node.timestamp,
          testPairIndex: Number(testIdxStr),
        })
          .then(() => {
            sentHashes.current.add(hash)
          })
          .catch(() => {
            dispatch({
              type: 'SET_MESSAGE',
              message: { kind: 'error', text: 'toast.event_save_failed' },
            })
          })
          .finally(() => {
            inFlightHashes.current.delete(hash)
          })
      }
    }
  }, [state.graphNodesByTest, taskId, userId])

  useEffect(() => {
    if (prevTaskIdRef.current !== taskId) {
      sentHashes.current = new Set()
      inFlightHashes.current = new Set()
      prevTaskIdRef.current = taskId
    }
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
        ? `/hypothesize/${routeUserId}/${randomTasks[0].id}`
        : `/hypothesize/${randomTasks[0].id}`
      navigate(target, { replace: true })
    }
  }, [taskId, randomFetched, randomTasks, navigate, routeUserId])

  useEffect(() => {
    if (specificTask) {
      dispatch({ type: 'LOAD_TASK', task: specificTask })
      lastEventKeyRef.current = null
    }
  }, [specificTask])

  const prevMsgTextRef = useRef<string | null>(null)

  useEffect(() => {
    const msgText = state.message?.text ?? null
    if (msgText === 'toast.wrong' && prevMsgTextRef.current !== 'toast.wrong' && hypothesisText !== null) {
      setPendingFailureAnalysis(true)
    }
    prevMsgTextRef.current = msgText
  }, [state.message, hypothesisText])

  useEffect(() => {
    if (state.blockReason === 'correct_analysis') {
      if (hypothesisText === null) {
        setAhaOpen(true)
      } else if (isUncertain) {
        setAhaOpen(true)
      } else {
        const id = setTimeout(() => navigate('/my-tasks'), 1500)
        return () => clearTimeout(id)
      }
    }
  }, [state.blockReason, isUncertain, hypothesisText, navigate])



  const handleSymbolSelect = (symbol: number) => {
    if (interceptFailureAnalysis()) return
    dispatch({ type: 'SET_SYMBOL', symbol })
    if (state.toolMode === 'select') {
      dispatch({ type: 'FILL_SELECTED' })
    }
    dispatch({ type: 'SET_TOOL_MODE', mode: 'edit' })
  }

  const handleCellClick = (x: number, y: number) => {
    if (interceptFailureAnalysis()) return
    if (!shouldDispatchEvent(`cell_paint:${x}:${y}:${state.selectedSymbol}`)) return
    dispatch({ type: 'CELL_CLICK', x, y })
  }

  const interceptFailureAnalysis = (): boolean => {
    if (pendingFailureAnalysis) {
      setFailureModalOpen(true)
      return true
    }
    return false
  }

  const submittingRef = useRef(false)
  const lastSubmittedGridRef = useRef<string | null>(null)

  const handleSubmit = async () => {
    const idx = state.currentTestIndex
    const attemptId = attemptIdRef.current
    if (userId === null || !taskId || taskId === 'random' || attemptId === null) {
      return
    }
    if (submittingRef.current) return
    const gridKey = JSON.stringify(state.outputGrid)
    if (lastSubmittedGridRef.current === gridKey) return
    submittingRef.current = true
    lastSubmittedGridRef.current = gridKey
    const nextId = state.nextNodeIdByTest[idx] ?? 0
    const nodeId = makeNodeId(nextId)
    const parentNodeId = state.activeNodeIdByTest[idx] ?? null
    try {
      const { correct } = await submitAttempt({
        userId,
        taskId,
        attemptId,
        nodeId,
        parentNodeId,
        testPairIndex: idx,
        grids: { [idx]: state.outputGrid },
        stateSnapshot: state.outputGrid,
        timestamp: Date.now(),
      })
      dispatch({ type: 'SUBMIT', correct })
      if (correct && idx < state.test.length - 1) {
        dispatch({ type: 'NEXT_TEST_INPUT' })
      }
    } catch {
      dispatch({
        type: 'SET_MESSAGE',
        message: { kind: 'error', text: 'toast.submit_failed' },
      })
    } finally {
      submittingRef.current = false
    }
  }

  const handleAhaSubmit = (text: string) => {
    dispatch({ type: 'SUBMIT_REFLECTION', intent: 'correct_analysis', text })
    setAhaOpen(false)
    navigate('/my-tasks')
  }

  const handleFailureHypothesisWrong = (text: string) => {
    const hypothesisNodeId = getLastHypothesisNodeId(currentNodes)
    if (hypothesisNodeId) {
      dispatch({ type: 'ADD_BRANCH_PIVOT', text, parentNodeId: hypothesisNodeId })
    } else {
      dispatch({ type: 'ADD_BRANCH_PIVOT', text, parentNodeId: currentNodes[0]?.id ?? 'node_000' })
    }
    setFailureModalOpen(false)
    setPendingFailureAnalysis(false)
    dispatch({ type: 'DISMISS_MESSAGE' })
  }

  const handleFailurePaintMistake = () => {
    setFailureModalOpen(false)
    setPendingFailureAnalysis(false)
    dispatch({ type: 'DISMISS_MESSAGE' })
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
    if (interceptFailureAnalysis()) return
    if (!shouldDispatchEvent('reset_output')) return
    dispatch({ type: 'RESET_OUTPUT' })
  }

  const handleResize = () => {
    if (interceptFailureAnalysis()) return
    if (!shouldDispatchEvent(`resize:${state.sizeInput}`)) return
    dispatch({ type: 'RESIZE' })
  }

  const handleCopyFromInput = () => {
    if (interceptFailureAnalysis()) return
    if (!shouldDispatchEvent('copy_from_input')) return
    dispatch({ type: 'COPY_FROM_INPUT' })
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
          nodes={timelineNodes}
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

        <HypothesisPanel
          hypothesisText={hypothesisText}
          isUncertain={isUncertain}
          onRuleFound={(text) => {
            dispatch({ type: 'ADD_COGNITIVE_NODE', intent: 'hypothesis_revision', text })
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
              onClick={handleReset}
              disabled={readOnly}
              data-testid="reset-btn"
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-40"
            >
              {t('button.reset')}
            </button>
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
              disabled={lastSubmittedGridRef.current === JSON.stringify(state.outputGrid)}
              data-testid="submit-btn"
              className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white transition ${
                lastSubmittedGridRef.current === JSON.stringify(state.outputGrid)
                  ? 'cursor-not-allowed bg-gray-600'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
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
              onSizeInputChange={(value) => dispatch({ type: 'SET_SIZE_INPUT', value })}
              onResize={handleResize}
              onCopyFromInput={handleCopyFromInput}
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
                key={state.message?.text ?? 'none'}
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

      <AhaMomentModal
        open={ahaOpen}
        onSubmit={handleAhaSubmit}
        mode={hypothesisText === null ? 'capture' : 'aha'}
      />

      <FailureModal
        open={failureModalOpen}
        onHypothesisWrong={handleFailureHypothesisWrong}
        onPaintMistake={handleFailurePaintMistake}
      />
      </>
      )}
    </div>
  )
}
