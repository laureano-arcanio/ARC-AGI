import { useQuery } from '@tanstack/react-query'
import { fetchRandomTasks, fetchTaskById } from './api'

export const arcQueryKeys = {
  all: ['arc-lab'] as const,
  randomTasks: (count: number) => [...arcQueryKeys.all, 'random-tasks', count] as const,
  taskById: (taskId: string) => [...arcQueryKeys.all, 'task', taskId] as const,
}

export function useRandomTasks(count = 10, enabled = true) {
  return useQuery({
    queryKey: arcQueryKeys.randomTasks(count),
    queryFn: () => fetchRandomTasks(count),
    enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

export function useTaskById(taskId: string) {
  return useQuery({
    queryKey: arcQueryKeys.taskById(taskId),
    queryFn: () => fetchTaskById(taskId),
    enabled: taskId.length > 0 && taskId !== 'random',
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}
