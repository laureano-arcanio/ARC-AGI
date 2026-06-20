import { http } from '../../lib/http'
import type { ArcTaskRead, AttemptRead, EventPayload } from './types'

export function fetchRandomTasks(count = 10): Promise<ArcTaskRead[]> {
  return http.get<ArcTaskRead[]>('/v1/arc-tasks/random', {
    params: { count: String(count) },
  })
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
