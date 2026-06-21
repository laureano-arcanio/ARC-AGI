export type BatchRead = {
  id: number
  name: string
  taskIds: string[]
  createdAt: string | null
  updatedAt: string | null
}

export type UserTaskSummary = {
  taskId: string
  attemptCount: number
}
