import { http } from '../../lib/http'
import type { BatchRead, BatchCreate, BatchUpdate, BatchAssignmentRead } from './types'

export function getBatches(): Promise<BatchRead[]> {
  return http.get<BatchRead[]>('/v1/batches/')
}

export function getBatch(id: number): Promise<BatchRead> {
  return http.get<BatchRead>(`/v1/batches/${id}`)
}

export function createBatch(data: BatchCreate): Promise<BatchRead> {
  return http.post<BatchRead>('/v1/batches/', data)
}

export function updateBatch(id: number, data: BatchUpdate): Promise<BatchRead> {
  return http.put<BatchRead>(`/v1/batches/${id}`, data)
}

export function deleteBatch(id: number): Promise<void> {
  return http.delete<void>(`/v1/batches/${id}`)
}

export function assignBatchToUser(
  batchId: number,
  userId: number,
): Promise<BatchAssignmentRead> {
  return http.post<BatchAssignmentRead>(
    `/v1/batches/${batchId}/assign/${userId}`,
  )
}

export function unassignBatchFromUser(
  batchId: number,
  userId: number,
): Promise<void> {
  return http.delete<void>(`/v1/batches/${batchId}/unassign/${userId}`)
}

export function getUserBatches(userId: number): Promise<BatchRead[]> {
  return http.get<BatchRead[]>(`/v1/batches/user/${userId}`)
}

export function getUserAccessibleTaskIds(userId: number): Promise<string[]> {
  return http.get<string[]>(`/v1/batches/user/${userId}/task-ids`)
}
