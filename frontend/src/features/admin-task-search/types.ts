export type SolverUser = {
  userId: number
  email: string
  hypothesis: string | null
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
  datasets: string[]
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
  solverEmail?: string
  hypothesisText?: string
  taskId?: string
  dataset?: string
  hasTags?: string
}

export type UserRead = {
  id: number
  email: string
  role: string
}

export type TaskSolverRead = {
  userId: number
  email: string
}
