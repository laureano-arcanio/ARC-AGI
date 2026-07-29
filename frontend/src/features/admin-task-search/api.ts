import { http } from '../../lib/http'
import type { TaskSearchFilters, TaskSearchPaginated, TaskSolverRead, UserRead } from './types'

export function getTaskSearch(
  page: number,
  perPage: number,
  filters: TaskSearchFilters,
): Promise<TaskSearchPaginated> {
  const params: Record<string, string | undefined> = {
    page: String(page),
    perPage: String(perPage),
    minWidth: filters.minWidth || undefined,
    maxWidth: filters.maxWidth || undefined,
    minHeight: filters.minHeight || undefined,
    maxHeight: filters.maxHeight || undefined,
    minSolutions: filters.minSolutions || undefined,
    maxSolutions: filters.maxSolutions || undefined,
    sameSize: filters.sameSize || undefined,
    minWidthDelta: filters.minWidthDelta || undefined,
    maxWidthDelta: filters.maxWidthDelta || undefined,
    minHeightDelta: filters.minHeightDelta || undefined,
    maxHeightDelta: filters.maxHeightDelta || undefined,
    allInputsSame: filters.allInputsSame || undefined,
    allOutputsSame: filters.allOutputsSame || undefined,
    solverEmail: filters.solverEmail || undefined,
    hypothesisText: filters.hypothesisText || undefined,
    taskId: filters.taskId || undefined,
    dataset: filters.dataset || undefined,
    hasTags: filters.hasTags || undefined,
  }

  return http.get<TaskSearchPaginated>('/v1/tasks/search', { params })
}

export function getTaskSolvers(taskId: string): Promise<TaskSolverRead[]> {
  return http.get<TaskSolverRead[]>(`/v1/tasks/${taskId}/solvers`)
}

export function getUsers(): Promise<UserRead[]> {
  return http.get<UserRead[]>('/v1/users/')
}
