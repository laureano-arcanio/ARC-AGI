export type PeerReviewPair = {
  id: number
  solverAId: number
  solverBId: number
  createdAt: string | null
  updatedAt: string | null
}

export type Review = {
  id: number
  reviewerId: number
  solverId: number
  taskId: string
  status: string
  overallNotes: string | null
  tagCount: number
  createdAt: string | null
  updatedAt: string | null
}

export type ReviewTag = {
  id: number
  reviewId: number
  solverNodeId: string
  quality: string
  createdAt: string | null
  updatedAt: string | null
}

export type ReviewTaskSummary = {
  taskId: string
  solverId: number
  attemptCount: number
  solved: boolean
  status: string
}

export type ReviewSolverRead = {
  id: number
  reviewerId: number
  taskId: string
  status: string
  overallNotes: string | null
  tagCount: number
  createdAt: string | null
  updatedAt: string | null
}
