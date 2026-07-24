import { useQuery } from '@tanstack/react-query'
import { getTaskSearch, getTaskSolvers } from './api'
import type { TaskSearchFilters } from './types'

export const taskSearchQueryKeys = {
  all: ['task-search'] as const,
  list: (page: number, perPage: number, filters: TaskSearchFilters) =>
    [...taskSearchQueryKeys.all, 'list', page, perPage, filters] as const,
  solvers: (taskId: string) =>
    [...taskSearchQueryKeys.all, 'solvers', taskId] as const,
}

export function useTaskSearch(page: number, perPage: number, filters: TaskSearchFilters) {
  return useQuery({
    queryKey: taskSearchQueryKeys.list(page, perPage, filters),
    queryFn: () => getTaskSearch(page, perPage, filters),
    placeholderData: (prev) => prev,
    staleTime: 30 * 1000,
  })
}

export function useTaskSolvers(taskId: string) {
  return useQuery({
    queryKey: taskSearchQueryKeys.solvers(taskId),
    queryFn: () => getTaskSolvers(taskId),
    enabled: !!taskId,
    staleTime: 30 * 1000,
  })
}
