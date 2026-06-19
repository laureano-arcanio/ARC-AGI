export type GridData = number[][]

export type TaskPair = {
  input: GridData
  output: GridData
}

export type ArcTask = {
  train: TaskPair[]
  test: TaskPair[]
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
}

export const SYMBOL_COUNT = 10

export const MAX_GRID_SIZE = 30

export const DEFAULT_GRID_HEIGHT = 3
export const DEFAULT_GRID_WIDTH = 3

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

export const ARC_SUBSETS = ['training', 'evaluation'] as const
export type ArcSubset = (typeof ARC_SUBSETS)[number]
