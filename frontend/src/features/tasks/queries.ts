import { useQuery } from '@tanstack/react-query'
import { getTasksStats } from './api'
import type { TasksFilters } from './types'

export const tasksQueryKeys = {
  all: ['tasks'] as const,
  list: (page: number, perPage: number, filters: TasksFilters) =>
    [...tasksQueryKeys.all, 'list', page, perPage, filters] as const,
}

export function useTasksStats(page: number, perPage: number, filters: TasksFilters) {
  return useQuery({
    queryKey: tasksQueryKeys.list(page, perPage, filters),
    queryFn: () => getTasksStats(page, perPage, filters),
    staleTime: 30 * 1000,
  })
}
