export type TaskStatsRead = {
  taskId: string
  completeCount: number
  incompleteCount: number
  abandonedCount: number
  width: number
  height: number
}

export type TaskStatsPaginated = {
  items: TaskStatsRead[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export type TasksFilters = {
  userId?: string
  minWidth?: string
  maxWidth?: string
  minHeight?: string
  maxHeight?: string
  minSolutions?: string
  maxSolutions?: string
}
