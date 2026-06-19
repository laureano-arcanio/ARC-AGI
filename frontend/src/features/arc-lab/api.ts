import { http } from '../../lib/http'
import type { ArcTaskRead } from './types'

export function fetchRandomTasks(count = 10): Promise<ArcTaskRead[]> {
  return http.get<ArcTaskRead[]>('/v1/arc-tasks/random', {
    params: { count: String(count) },
  })
}

export function fetchTaskById(taskId: string): Promise<ArcTaskRead> {
  return http.get<ArcTaskRead>(`/v1/arc-tasks/${encodeURIComponent(taskId)}`)
}
