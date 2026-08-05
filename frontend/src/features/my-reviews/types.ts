export type ReviewBatch = {
  id: number
  name: string
  taskIds: string[]
  batchType: string
  createdAt: string | null
  updatedAt: string | null
}

export type SelectedPair = {
  section: 'train' | 'test'
  index: number
}

export type UserReview = {
  userId: number
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

export type UserReviewUpdate = {
  status?: string
  correct?: boolean | null
  verified?: boolean
  notes?: string[]
  selectedPairs?: SelectedPair[]
}

export type AnonymousSolver = {
  hypothesis: string | null
}

export type MyHypothesis = {
  hypothesis: string | null
}

export type MyHypothesisUpdate = {
  hypothesis: string
}

export type ReviewEntryProgress = {
  entryId: string
  synthTaskIds: string[]
  total: number
  done: number
  needsRevision: number
  pending: number
  status: string
  solved: boolean
}
