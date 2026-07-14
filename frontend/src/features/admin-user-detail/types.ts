export type UserTaskSummary = {
  taskId: string
  attemptCount: number
  solved: boolean
}

export type TaskWithStatus = {
  taskId: string
  attemptCount: number
  solved: boolean
  status: 'not_started' | 'started' | 'completed'
  abandoned?: boolean
  reviewed?: boolean
  reviewerEmails?: string[]
}

export type BatchWithTasks = {
  batchId: number
  batchName: string
  tasks: TaskWithStatus[]
}

export type AttemptRead = {
  id: number
  userId: number
  taskId: string
  status?: string
  createdAt: string | null
  updatedAt: string | null
}

export type UserPasswordUpdate = {
  password: string
}

export type EventRead = {
  id: number
  userId: number
  taskId: string
  attemptId: number | null
  nodeId: string
  parentNodeId: string | null
  testPairIndex: number | null
  trigger: Record<string, unknown>
  stateSnapshot: number[][]
  timestamp: number
  sequenceIndex?: number
  createdAt: string | null
  updatedAt: string | null
}
