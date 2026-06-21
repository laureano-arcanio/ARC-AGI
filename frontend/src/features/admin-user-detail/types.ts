export type UserTaskSummary = {
  taskId: string
  attemptCount: number
}

export type AttemptRead = {
  id: number
  userId: number
  taskId: string
  createdAt: string | null
  updatedAt: string | null
}

export type EventRead = {
  id: number
  userId: number
  taskId: string
  attemptId: number | null
  nodeId: string
  parentNodeId: string | null
  trigger: Record<string, unknown>
  stateSnapshot: number[][]
  timestamp: number
  createdAt: string | null
  updatedAt: string | null
}
