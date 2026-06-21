import { http } from '../../lib/http'
import type { BatchRead, UserTaskSummary } from './types'

export function getUserBatches(userId: number): Promise<BatchRead[]> {
  return http.get<BatchRead[]>(`/v1/batches/user/${userId}`)
}

export function getUserTasks(userId: number): Promise<UserTaskSummary[]> {
  return http.get<UserTaskSummary[]>(`/v1/users/${userId}/tasks`)
}

export function getUserAccessibleTaskIds(userId: number): Promise<string[]> {
  return http.get<string[]>(`/v1/batches/user/${userId}/task-ids`)
}
