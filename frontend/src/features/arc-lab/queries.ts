import { useMutation, useQuery } from '@tanstack/react-query'
import { fetchRandomTask, listTasks } from './api'
import type { ArcSubset } from './types'

export const arcQueryKeys = {
  all: ['arc-lab'] as const,
  taskList: (subset: ArcSubset) => [...arcQueryKeys.all, 'tasks', subset] as const,
}

export function useTaskList(subset: ArcSubset = 'training') {
  return useQuery({
    queryKey: arcQueryKeys.taskList(subset),
    queryFn: () => listTasks(subset),
  })
}

export function useRandomTask() {
  return useMutation({
    mutationFn: (subset: ArcSubset = 'training') => fetchRandomTask(subset),
  })
}
