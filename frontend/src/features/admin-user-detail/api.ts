import { http } from '../../lib/http'
import type { UserPasswordUpdate, UserTaskSummary, AttemptRead, EventRead } from './types'

export type UserRead = {
  id: number
  email: string
  role: string
  createdAt: string | null
  updatedAt: string | null
}

export function updateUserPassword(
  userId: number,
  data: UserPasswordUpdate,
): Promise<UserRead> {
  return http.put<UserRead>(`/v1/users/${userId}/password`, data)
}

export function getUser(userId: number): Promise<UserRead> {
  return http.get<UserRead>(`/v1/users/${userId}`)
}

export function getUserTasks(userId: number): Promise<UserTaskSummary[]> {
  return http.get<UserTaskSummary[]>(`/v1/users/${userId}/tasks`)
}

export function getAttempts(
  userId: number,
  taskId: string,
): Promise<AttemptRead[]> {
  return http.get<AttemptRead[]>(
    `/v1/attempts/users/${userId}/tasks/${taskId}`,
  )
}

export function getEvents(
  userId: number,
  taskId: string,
  attemptId?: number,
): Promise<EventRead[]> {
  const params: Record<string, string | undefined> = {}
  if (attemptId !== undefined) {
    params.attemptId = String(attemptId)
  }
  return http.get<EventRead[]>(`/v1/events/users/${userId}/tasks/${taskId}`, {
    params,
  })
}
