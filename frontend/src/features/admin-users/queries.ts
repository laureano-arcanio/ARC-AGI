import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query'
import { createUser, getUsers, updateUser, deleteUser } from './api'
import type { UserCreate } from './types'
import { getUserBatchTasks, getUserReviewBatchTasks } from '../admin-user-detail/api'
import type { BatchWithTasks, ReviewBatchWithTasks } from '../admin-user-detail/types'

export const adminUsersQueryKeys = {
  all: ['admin-users'] as const,
  list: () => [...adminUsersQueryKeys.all, 'list'] as const,
  batchCompletion: (userId: number) =>
    [...adminUsersQueryKeys.all, 'batch-completion', userId] as const,
  reviewBatchCompletion: (userId: number) =>
    [...adminUsersQueryKeys.all, 'review-batch-completion', userId] as const,
}

export function useUsers() {
  return useQuery({
    queryKey: adminUsersQueryKeys.list(),
    queryFn: getUsers,
    staleTime: 10 * 1000,
  })
}

export function useUsersBatchCompletion(userIds: number[]) {
  return useQueries({
    queries: userIds.map((userId) => ({
      queryKey: adminUsersQueryKeys.batchCompletion(userId),
      queryFn: () => getUserBatchTasks(userId),
      staleTime: 10 * 1000,
    })),
    combine: (results) => {
      const completedByUser = new Map<number, Set<number>>()
      const inProgressByUser = new Map<number, Set<number>>()
      const abandonedByUser = new Map<number, Set<number>>()
      const completionByUser = new Map<number, Map<number, string>>()
      results.forEach((result, i) => {
        const userId = userIds[i]
        const data: BatchWithTasks[] | undefined = result.data
        const completed = new Set<number>()
        const inProgress = new Set<number>()
        const abandoned = new Set<number>()
        const pct = new Map<number, string>()
        if (data) {
          data.forEach((batch) => {
            const total = batch.tasks.length
            if (total === 0) return
            const completedCount = batch.tasks.filter((t) => t.solved).length
            const abandonedCount = batch.tasks.filter(
              (t) => t.abandoned && !t.solved,
            ).length
            const allCompleted = completedCount === total
            const anyStarted = batch.tasks.some(
              (t) => t.status === 'started' || t.status === 'completed',
            )
            pct.set(
              batch.batchId,
              `${Math.round((completedCount / total) * 100)}%`,
            )
            if (allCompleted) {
              completed.add(batch.batchId)
            } else if (abandonedCount > 0) {
              abandoned.add(batch.batchId)
            } else if (anyStarted) {
              inProgress.add(batch.batchId)
            }
          })
        }
        completedByUser.set(userId, completed)
        inProgressByUser.set(userId, inProgress)
        abandonedByUser.set(userId, abandoned)
        completionByUser.set(userId, pct)
      })
      return { completedByUser, inProgressByUser, abandonedByUser, completionByUser }
    },
  })
}

export function useUsersReviewBatchCompletion(userIds: number[]) {
  return useQueries({
    queries: userIds.map((userId) => ({
      queryKey: adminUsersQueryKeys.reviewBatchCompletion(userId),
      queryFn: () => getUserReviewBatchTasks(userId),
      staleTime: 10 * 1000,
    })),
    combine: (results) => {
      const reviewCompletedByUser = new Map<number, Set<number>>()
      const reviewInProgressByUser = new Map<number, Set<number>>()
      const reviewNeedsRevisionByUser = new Map<number, Set<number>>()
      const reviewCompletionPctByUser = new Map<number, Map<number, string>>()
      results.forEach((result, i) => {
        const userId = userIds[i]
        const data: ReviewBatchWithTasks[] | undefined = result.data
        const completed = new Set<number>()
        const inProgress = new Set<number>()
        const needsRevision = new Set<number>()
        const pct = new Map<number, string>()
        if (data) {
          data.forEach((batch) => {
            let totalDone = 0
            let totalTasks = 0
            let hasNeedsRevision = false
            let anyStarted = false
            batch.tasks.forEach((t) => {
              totalDone += t.done
              totalTasks += t.total
              if (t.needsRevision > 0) hasNeedsRevision = true
              if (t.status === 'done' || t.status === 'needs_revision') anyStarted = true
            })
            if (totalTasks > 0) {
              pct.set(
                batch.batchId,
                `${Math.round((totalDone / totalTasks) * 100)}%`,
              )
            }
            if (totalTasks > 0 && totalDone === totalTasks) {
              completed.add(batch.batchId)
            } else if (hasNeedsRevision) {
              needsRevision.add(batch.batchId)
            } else if (anyStarted) {
              inProgress.add(batch.batchId)
            }
          })
        }
        reviewCompletedByUser.set(userId, completed)
        reviewInProgressByUser.set(userId, inProgress)
        reviewNeedsRevisionByUser.set(userId, needsRevision)
        reviewCompletionPctByUser.set(userId, pct)
      })
      return {
        reviewCompletedByUser,
        reviewInProgressByUser,
        reviewNeedsRevisionByUser,
        reviewCompletionPctByUser,
      }
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UserCreate) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersQueryKeys.all })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { role: string | null } }) =>
      updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersQueryKeys.all })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersQueryKeys.all })
    },
  })
}
