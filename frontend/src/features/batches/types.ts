export type BatchRead = {
  id: number
  name: string
  taskIds: string[]
  batchType: string
  assignedUserIds: number[]
  createdAt: string | null
  updatedAt: string | null
}

export type BatchCreate = {
  name: string
  taskIds: string[]
  batchType?: string
}

export type BatchUpdate = {
  name?: string | null
  taskIds?: string[] | null
  batchType?: string | null
}

export type BatchAssignmentRead = {
  id: number
  batchId: number
  userId: number
  createdAt: string | null
  updatedAt: string | null
}
