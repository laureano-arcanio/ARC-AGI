import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchResolveEntry, fetchReviewGroups, fetchSolverReviewDetails, fetchSyntheticModels, fetchSyntheticReview, fetchTaskSolvers, fetchUsers, updateSyntheticReview } from './api'
import type { ReviewGroupsFilters, SyntheticReviewUpdate } from './types'

export const syntheticQueryKeys = {
  all: ['synthetic-reviews'] as const,
  groups: (filters: ReviewGroupsFilters) => [...syntheticQueryKeys.all, 'groups', filters] as const,
  resolveEntry: (entryId: string) => [...syntheticQueryKeys.all, 'resolve', entryId] as const,
  review: (id: string) => [...syntheticQueryKeys.all, 'review', id] as const,
  models: () => [...syntheticQueryKeys.all, 'models'] as const,
  users: () => [...syntheticQueryKeys.all, 'users'] as const,
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

export function useUsers() {
  return useQuery({
    queryKey: syntheticQueryKeys.users(),
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000,
  })
}

export function useReviewGroups(filters: ReviewGroupsFilters) {
  return useQuery({
    queryKey: syntheticQueryKeys.groups(filters),
    queryFn: () => fetchReviewGroups(filters),
    placeholderData: (prev) => prev,
    staleTime: 30 * 1000,
  })
}

export function useResolveEntry(entryId: string) {
  return useQuery({
    queryKey: syntheticQueryKeys.resolveEntry(entryId),
    queryFn: () => fetchResolveEntry(entryId),
    enabled: !!entryId,
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
      qc.invalidateQueries({ queryKey: syntheticQueryKeys.all })
    },
  })
}
