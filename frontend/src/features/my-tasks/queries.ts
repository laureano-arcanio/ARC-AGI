import { useQuery } from '@tanstack/react-query'
import { getUserBatches, getUserTasks, getUserAccessibleTaskIds } from './api'

export const myTasksQueryKeys = {
  all: ['my-tasks'] as const,
  batches: (userId: number) => [...myTasksQueryKeys.all, 'batches', userId] as const,
  tasks: (userId: number) => [...myTasksQueryKeys.all, 'tasks', userId] as const,
  accessibleIds: (userId: number) =>
    [...myTasksQueryKeys.all, 'accessible-ids', userId] as const,
}

export function useMyBatches(userId: number) {
  return useQuery({
    queryKey: myTasksQueryKeys.batches(userId),
    queryFn: () => getUserBatches(userId),
    enabled: userId > 0,
  })
}

export function useMyTaskSummaries(userId: number) {
  return useQuery({
    queryKey: myTasksQueryKeys.tasks(userId),
    queryFn: () => getUserTasks(userId),
    enabled: userId > 0,
  })
}

export function useMyAccessibleTaskIds(userId: number) {
  return useQuery({
    queryKey: myTasksQueryKeys.accessibleIds(userId),
    queryFn: () => getUserAccessibleTaskIds(userId),
    enabled: userId > 0,
  })
}
