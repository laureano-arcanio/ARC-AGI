import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getReviewPairs,
  createReviewPair,
  deleteReviewPair,
  getPendingReviews,
  getReviewBySolverAndTask,
  getCrossEvents,
  getReviewTags,
  addReviewTag,
  deleteReviewTag,
} from './api'

export const reviewQueryKeys = {
  all: ['reviews'] as const,
  pairs: () => [...reviewQueryKeys.all, 'pairs'] as const,
  pending: (userId: number) => [...reviewQueryKeys.all, 'pending', userId] as const,
  bySolverTask: (solverId: number, taskId: string) =>
    [...reviewQueryKeys.all, 'solver', solverId, taskId] as const,
  tags: (reviewId: number) => [...reviewQueryKeys.all, 'tags', reviewId] as const,
}

export function useReviewPairs() {
  return useQuery({
    queryKey: reviewQueryKeys.pairs(),
    queryFn: getReviewPairs,
  })
}

export function useCreateReviewPair() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createReviewPair,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.pairs() })
    },
  })
}

export function useDeleteReviewPair() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteReviewPair,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.pairs() })
    },
  })
}

export function usePendingReviews(userId: number) {
  return useQuery({
    queryKey: reviewQueryKeys.pending(userId),
    queryFn: () => getPendingReviews(userId),
    enabled: userId > 0,
  })
}

export function useReviewBySolverTask(solverId: number, taskId: string) {
  return useQuery({
    queryKey: reviewQueryKeys.bySolverTask(solverId, taskId),
    queryFn: () => getReviewBySolverAndTask(solverId, taskId),
    enabled: !!solverId && !!taskId,
  })
}

export function useCrossEvents(
  targetUserId: number,
  taskId: string,
  attemptId: number | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...reviewQueryKeys.all, 'cross-events', targetUserId, taskId, attemptId],
    queryFn: () => getCrossEvents(targetUserId, taskId, attemptId),
    enabled,
  })
}

export function useReviewTags(reviewId: number | null) {
  return useQuery({
    queryKey: reviewQueryKeys.tags(reviewId ?? 0),
    queryFn: () => getReviewTags(reviewId!),
    enabled: reviewId !== null,
  })
}

export function useAddReviewTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      reviewId,
      data,
    }: {
      reviewId: number
      data: { solverNodeId: string; quality: string }
    }) => addReviewTag(reviewId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: reviewQueryKeys.tags(variables.reviewId),
      })
    },
  })
}

export function useDeleteReviewTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ reviewId, tagId }: { reviewId: number; tagId: number }) =>
      deleteReviewTag(reviewId, tagId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: reviewQueryKeys.tags(variables.reviewId),
      })
    },
  })
}
