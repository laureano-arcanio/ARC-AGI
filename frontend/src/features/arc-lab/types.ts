export type GridData = number[][]

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

export type ToolMode = 'edit' | 'select' | 'floodfill'

export type CellCoord = {
  x: number
  y: number
}

export type ClipboardEntry = CellCoord & {
  symbol: number
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

export type CognitiveIntent = 'hypothesis' | 'failure_analysis' | 'branch_pivot' | 'correct_analysis'

export type BlockReason = 'failure_analysis' | 'branch_pivot' | 'correct_analysis' | null

export const INACTIVITY_THRESHOLD_MS = 60_000

export const INTERCEPT_BLOCK_MS = 1_000

export type MechanicalAction =
  | 'cell_click'
  | 'fill_selected'
  | 'paste'
  | 'resize'
  | 'copy_from_input'
  | 'reset_output'
  | 'submit'
  | 'abandon'
  | 'load_task'

export type GraphTrigger =
  | { kind: 'mechanical'; action: MechanicalAction; details?: Record<string, unknown> }
  | { kind: 'cognitive'; intent: CognitiveIntent; text: string }

export type GraphNode = {
  id: string
  trigger: GraphTrigger
  stateSnapshot: GridData
  parentId: string | null
  timestamp: number
}

export const COLOR_MAP: Record<number, string> = {
  0: '#000000',
  1: '#0074D9',
  2: '#FF4136',
  3: '#2ECC40',
  4: '#FFDC00',
  5: '#AAAAAA',
  6: '#F012BE',
  7: '#FF851B',
  8: '#7FDBFF',
  9: '#870C25',
}

export type EventPayload = {
  userId: number
  taskId: string
  attemptId: number
  nodeId: string
  parentNodeId: string | null
  trigger: GraphTrigger
  stateSnapshot: GridData
  timestamp: number
}

export type AttemptRead = {
  id: number
  userId: number
  taskId: string
  createdAt: string
  updatedAt: string | null
}
