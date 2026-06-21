export type BatchRead = {
  id: number
  name: string
  taskIds: string[]
  assignedUserIds: number[]
  createdAt: string | null
  updatedAt: string | null
}

export type BatchCreate = {
  name: string
  taskIds: string[]
}

export type BatchUpdate = {
  name?: string | null
  taskIds?: string[] | null
}

export type BatchAssignmentRead = {
  id: number
  batchId: number
  userId: number
  createdAt: string | null
  updatedAt: string | null
}
