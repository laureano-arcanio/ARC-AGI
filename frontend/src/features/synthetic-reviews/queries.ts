import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchSolverReviewDetails, fetchSyntheticModels, fetchSyntheticReview, fetchSyntheticTask, fetchSyntheticTasks, fetchTaskSolvers, updateSyntheticReview } from './api'
import type { ListFilters } from './api'
import type { SyntheticReviewUpdate } from './types'

export const syntheticQueryKeys = {
  all: ['synthetic-reviews'] as const,
  list: (filters: ListFilters) => [...syntheticQueryKeys.all, 'list', filters] as const,
  task: (id: string) => [...syntheticQueryKeys.all, 'task', id] as const,
  review: (id: string) => [...syntheticQueryKeys.all, 'review', id] as const,
  models: () => [...syntheticQueryKeys.all, 'models'] as const,
  solvers: (taskId: string) => [...syntheticQueryKeys.all, 'solvers', taskId] as const,
  solverReviewDetails: (originalTaskId: string) =>
    [...syntheticQueryKeys.all, 'solver-review-details', originalTaskId] as const,
}

export function useTaskSolvers(taskId: string) {
  return useQuery({
    queryKey: syntheticQueryKeys.solvers(taskId),
    queryFn: () => fetchTaskSolvers(taskId),
    enabled: !!taskId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSolverReviewDetails(originalTaskId: string) {
  return useQuery({
    queryKey: syntheticQueryKeys.solverReviewDetails(originalTaskId),
    queryFn: () => fetchSolverReviewDetails(originalTaskId),
    enabled: !!originalTaskId,
    staleTime: 30 * 1000,
  })
}

export function useSyntheticModels() {
  return useQuery({
    queryKey: syntheticQueryKeys.models(),
    queryFn: fetchSyntheticModels,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSyntheticTasks(filters: ListFilters) {
  return useQuery({
    queryKey: syntheticQueryKeys.list(filters),
    queryFn: () => fetchSyntheticTasks(filters),
    placeholderData: (prev) => prev,
    staleTime: 30 * 1000,
  })
}

export function useSyntheticTask(id: string) {
  return useQuery({
    queryKey: syntheticQueryKeys.task(id),
    queryFn: () => fetchSyntheticTask(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  })
}

export function useSyntheticReview(id: string) {
  return useQuery({
    queryKey: syntheticQueryKeys.review(id),
    queryFn: () => fetchSyntheticReview(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

export function useUpdateSyntheticReview(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SyntheticReviewUpdate) => updateSyntheticReview(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: syntheticQueryKeys.review(id) })
      qc.invalidateQueries({ queryKey: syntheticQueryKeys.list({}) })
    },
  })
}
