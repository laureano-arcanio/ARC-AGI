import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchAnonymousSolvers,
  fetchMyHypothesis,
  fetchReviewEntryProgress,
  fetchUserReview,
  getUserReviewBatches,
  resolveSyntheticTasks,
  updateMyHypothesis,
  updateUserReview,
} from './api'
import type { MyHypothesisUpdate, UserReviewUpdate } from './types'

export const myReviewsQueryKeys = {
  all: ['my-reviews'] as const,
  batches: (userId: number) =>
    [...myReviewsQueryKeys.all, 'batches', userId] as const,
  progress: (userId: number, entryIds: string[]) =>
    [...myReviewsQueryKeys.all, 'progress', userId, entryIds] as const,
  task: (id: string) => [...myReviewsQueryKeys.all, 'task', id] as const,
  review: (id: string) => [...myReviewsQueryKeys.all, 'review', id] as const,
  solvers: (id: string) =>
    [...myReviewsQueryKeys.all, 'solvers', id] as const,
  myHypothesis: (id: string) =>
    [...myReviewsQueryKeys.all, 'my-hypothesis', id] as const,
}

export function useMyReviewBatches(userId: number) {
  return useQuery({
    queryKey: myReviewsQueryKeys.batches(userId),
    queryFn: () => getUserReviewBatches(userId),
    enabled: userId > 0,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMyReviewProgress(userId: number, entryIds: string[]) {
  return useQuery({
    queryKey: myReviewsQueryKeys.progress(userId, entryIds),
    queryFn: () => fetchReviewEntryProgress(entryIds),
    enabled: userId > 0 && entryIds.length > 0,
    staleTime: 30 * 1000,
  })
}

export function useResolvedSyntheticTasks(entryId: string) {
  return useQuery({
    queryKey: myReviewsQueryKeys.task(entryId),
    queryFn: () => resolveSyntheticTasks(entryId),
    enabled: !!entryId,
    staleTime: 60 * 1000,
  })
}

export function useMyUserReview(id: string) {
  return useQuery({
    queryKey: myReviewsQueryKeys.review(id),
    queryFn: () => fetchUserReview(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

export function useMyAnonymousSolvers(taskId: string) {
  return useQuery({
    queryKey: myReviewsQueryKeys.solvers(taskId),
    queryFn: () => fetchAnonymousSolvers(taskId),
    enabled: !!taskId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMyHypothesis(taskId: string) {
  return useQuery({
    queryKey: myReviewsQueryKeys.myHypothesis(taskId),
    queryFn: () => fetchMyHypothesis(taskId),
    enabled: !!taskId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateMyHypothesis(taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: MyHypothesisUpdate) => updateMyHypothesis(taskId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: myReviewsQueryKeys.myHypothesis(taskId) })
      qc.invalidateQueries({ queryKey: myReviewsQueryKeys.solvers(taskId) })
    },
  })
}

export function useUpdateUserReview(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UserReviewUpdate) => updateUserReview(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: myReviewsQueryKeys.review(id) })
    },
  })
}

export function useBulkUpdateUserReviews() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updates: { id: string; data: UserReviewUpdate }[]) =>
      Promise.all(updates.map((u) => updateUserReview(u.id, u.data))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: myReviewsQueryKeys.all })
    },
  })
}
