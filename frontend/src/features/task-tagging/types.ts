export type TagScope = 'task' | 'grid' | 'selection'

export type TaskTag = {
  id: number
  taskId: string
  userId: number
  scopeType: TagScope
  pairType: 'train' | 'test' | null
  pairIndex: number | null
  gridType: 'input' | 'output' | null
  selectedCells: string[] | null
  mask: (number | '#')[][] | null
  labels: string[]
  createdAt: string | null
  updatedAt: string | null
}

export type TaskTagRelation = {
  id: number
  taskId: string
  userId: number
  fromTagId: number
  toTagId: number
  labels: string[]
  createdAt: string | null
  updatedAt: string | null
}

export type GridSelection = {
  pairType: 'train' | 'test'
  pairIndex: number
  gridType: 'input' | 'output'
  cells: Set<string>
}

export type TagMode = 'select' | 'object_select' | 'area_select' | 'color_select' | 'floodfill_select'

export type TaskTagCreate = {
  taskId: string
  scopeType: TagScope
  pairType?: 'train' | 'test' | null
  pairIndex?: number | null
  gridType?: 'input' | 'output' | null
  selectedCells?: string[] | null
  mask?: (number | '#')[][] | null
  labels: string[]
}

export type TaskTagUpdate = {
  labels: string[]
}

export type TaskTagRelationCreate = {
  taskId: string
  fromTagId: number
  toTagId: number
  labels: string[]
}
