import { http } from '../../lib/http'
import type { ArcTaskRead, AttemptRead, EventPayload } from './types'

export function fetchRandomTasks(count = 10, userId?: number): Promise<ArcTaskRead[]> {
  const params: Record<string, string | undefined> = { count: String(count) }
  if (userId !== undefined) {
    params.userId = String(userId)
  }
  return http.get<ArcTaskRead[]>('/v1/arc-tasks/random', { params })
}

export function fetchTaskById(taskId: string): Promise<ArcTaskRead> {
  return http.get<ArcTaskRead>(`/v1/arc-tasks/${encodeURIComponent(taskId)}`)
}

export function createAttempt(
  userId: number,
  taskId: string,
): Promise<AttemptRead> {
  return http.post<AttemptRead>('/v1/attempts/', { userId, taskId })
}

export function postEvent(event: EventPayload): Promise<unknown> {
  return http.post('/v1/events/', event)
}

export type PreSolverEventRead = {
  id: number
  nodeId: string
  parentNodeId: string | null
  testPairIndex: number | null
  trigger: Record<string, unknown>
  stateSnapshot: number[][]
  timestamp: number
}

export function fetchEventsByAttempt(
  userId: number,
  taskId: string,
  attemptId: number,
): Promise<PreSolverEventRead[]> {
  return http.get<PreSolverEventRead[]>(
    `/v1/events/users/${userId}/tasks/${taskId}`,
    { params: { attemptId: String(attemptId) } },
  )
}
