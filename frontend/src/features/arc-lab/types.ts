import type {
  GridData as SharedGridData,
  CognitiveIntent as SharedCognitiveIntent,
  MechanicalAction as SharedMechanicalAction,
  GraphTrigger as SharedGraphTrigger,
  GraphNode as SharedGraphNode,
} from '../../shared/types/arc-graph'
import { COLOR_MAP as SharedColorMap } from '../../shared/types/arc-graph'

export type GridData = SharedGridData
export type CognitiveIntent = SharedCognitiveIntent
export type MechanicalAction = SharedMechanicalAction
export type GraphTrigger = SharedGraphTrigger
export type GraphNode = SharedGraphNode
export const COLOR_MAP = SharedColorMap

export type TaskPair = {
  input: GridData
  output: GridData
}

export type ArcTask = {
  train: TaskPair[]
  test: TaskPair[]
}

export type ArcTaskRead = ArcTask & {
  id: string
}

export type ToolMode = 'edit' | 'select' | 'floodfill' | 'object_select' | 'area_select' | 'fill_object'

export type CellCoord = {
  x: number
  y: number
}

export type ToastKind = 'error' | 'info'

export type ToastMessage = {
  kind: ToastKind
  text: string
  params?: Record<string, string | number>
}

export const SYMBOL_COUNT = 10

export const MAX_GRID_SIZE = 30

export const DEFAULT_GRID_HEIGHT = 3
export const DEFAULT_GRID_WIDTH = 3

export type BlockReason = 'failure_analysis' | 'branch_pivot' | 'correct_analysis' | null

export const INACTIVITY_THRESHOLD_MS = 60_000

export const INTERCEPT_BLOCK_MS = 1_000

export type EventPayload = {
  userId: number
  taskId: string
  attemptId: number
  nodeId: string
  parentNodeId: string | null
  trigger: GraphTrigger
  stateSnapshot: GridData
  timestamp: number
  testPairIndex?: number
}

export type AttemptRead = {
  id: number
  userId: number
  taskId: string
  createdAt: string
  updatedAt: string | null
}
