import { http } from '../../lib/http'
import type { TaskStatsPaginated, TasksFilters } from './types'

export function getTasksStats(
  page: number,
  perPage: number,
  filters: TasksFilters,
): Promise<TaskStatsPaginated> {
  const params: Record<string, string | undefined> = {
    page: String(page),
    perPage: String(perPage),
    userId: filters.userId || undefined,
    minWidth: filters.minWidth || undefined,
    maxWidth: filters.maxWidth || undefined,
    minHeight: filters.minHeight || undefined,
    maxHeight: filters.maxHeight || undefined,
    minSolutions: filters.minSolutions || undefined,
    maxSolutions: filters.maxSolutions || undefined,
  }

  return http.get<TaskStatsPaginated>('/v1/tasks/', { params })
}
