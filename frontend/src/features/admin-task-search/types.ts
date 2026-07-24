export type SolverUser = {
  userId: number
  email: string
}

export type TaskSearchRead = {
  taskId: string
  hasSolution: boolean
  solvers: SolverUser[]
  solutionCount: number
  width: number
  height: number
  sameSize: boolean
  widthDelta: number | null
  heightDelta: number | null
  transformLabel: string
  allInputsSame: boolean
  allOutputsSame: boolean
}

export type TaskSearchPaginated = {
  items: TaskSearchRead[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export type TaskSearchFilters = {
  minWidth?: string
  maxWidth?: string
  minHeight?: string
  maxHeight?: string
  minSolutions?: string
  maxSolutions?: string
  sameSize?: string
  minWidthDelta?: string
  maxWidthDelta?: string
  minHeightDelta?: string
  maxHeightDelta?: string
  allInputsSame?: string
  allOutputsSame?: string
}

export type TaskSolverRead = {
  userId: number
  email: string
}
