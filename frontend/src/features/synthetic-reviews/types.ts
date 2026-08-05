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
  hypothesis: string | null
  train: { input: number[][]; output: number[][] }[]
  test: { input: number[][]; output: number[][] }[]
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

export type SelectedPair = {
  section: 'train' | 'test'
  index: number
}

export type SolverReviewVariant = {
  synthTaskId: string
  status: string
  correct: boolean | null
  verified: boolean
  notes: string[]
  selectedPairs: SelectedPair[]
  startedAt: string | null
  finishedAt: string | null
  durationSeconds: number | null
}

export type SolverReviewDetail = {
  userId: number
  email: string
  originalHypothesis: string | null
  revisedHypothesis: string | null
  variants: SolverReviewVariant[]
}

export type SolverUser = {
  userId: number
  email: string
  hypothesis: string | null
}

export type ReviewGroupUser = {
  distinctReviewers: number
  reviewedVariants: number
  unreviewedVariants: number
  variantsWithIncorrectMark: number
  variantsWithCorrectMark: number
  incorrectMarks: number
  correctMarks: number
  reviewerEmails: string[]
}

export type ReviewGroupAdmin = {
  status: string
  reviewedVariants: number
  doneVariants: number
  needsRevisionVariants: number
  pendingVariants: number
  verifiedVariants: number
  correctVariants: number
  incorrectVariants: number
}

export type ReviewGroup = {
  originalTaskId: string
  datasets: string[]
  solvers: SolverUser[]
  solutionCount: number
  hasSolution: boolean
  width: number
  height: number
  sameSize: boolean
  widthDelta: number | null
  heightDelta: number | null
  transformLabel: string
  totalVariants: number
  witnessPassedCount: number
  witnessFailedCount: number
  models: string[]
  concepts: string[]
  firstVariantId: string
  userReview: ReviewGroupUser
  adminReview: ReviewGroupAdmin
}

export type ReviewGroupList = {
  items: ReviewGroup[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export type UserRead = {
  id: number
  email: string
  role: string
}

export type ReviewGroupsFilters = {
  page?: number
  perPage?: number
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
  modelName?: string
  concept?: string
  witnessPassed?: string
  originalTaskId?: string
  onlyMultipleVariants?: string
  userReviewStatus?: string
  reviewerUserId?: string
  reviewerEmail?: string
  minIncorrectMarks?: string
  adminReviewStatus?: string
  adminCorrect?: string
  adminVerified?: string
}
