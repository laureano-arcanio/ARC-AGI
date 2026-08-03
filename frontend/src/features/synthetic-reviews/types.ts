export type SyntheticTask = {
  id: string
  originalTaskId: string
  modelName: string
  seed: number | null
  timestamp: string | null
  concept: string | null
  numTrain: number
  numTest: number
  witnessPassed: boolean
  witnessNPassed: number | null
  witnessNTotal: number | null
  reviewStatus: string
  correct: boolean | null
  verified: boolean
  hypothesis: string | null
  train: { input: number[][]; output: number[][] }[]
  test: { input: number[][]; output: number[][] }[]
}

export type SyntheticTaskList = {
  items: SyntheticTask[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export type SyntheticReview = {
  synthTaskId: string
  status: string
  correct: boolean | null
  verified: boolean
  notes: string[]
}

export type SyntheticReviewUpdate = {
  status?: string
  correct?: boolean | null
  verified?: boolean
  notes?: string[]
}

export type SolverReviewVariant = {
  synthTaskId: string
  status: string
  correct: boolean | null
  verified: boolean
  notes: string[]
}

export type SolverReviewDetail = {
  userId: number
  email: string
  originalHypothesis: string | null
  revisedHypothesis: string | null
  variants: SolverReviewVariant[]
}
