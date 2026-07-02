import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query'
import { createUser, getUsers, updateUser, deleteUser } from './api'
import type { UserCreate } from './types'
import { getUserBatchTasks } from '../admin-user-detail/api'
import type { BatchWithTasks } from '../admin-user-detail/types'

export const adminUsersQueryKeys = {
  all: ['admin-users'] as const,
  list: () => [...adminUsersQueryKeys.all, 'list'] as const,
  batchCompletion: (userId: number) =>
    [...adminUsersQueryKeys.all, 'batch-completion', userId] as const,
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
