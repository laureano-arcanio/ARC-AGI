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
      results.forEach((result, i) => {
        const userId = userIds[i]
        const data: BatchWithTasks[] | undefined = result.data
        const completed = new Set<number>()
        const inProgress = new Set<number>()
        if (data) {
          data.forEach((batch) => {
            const allCompleted = batch.tasks.length > 0 && batch.tasks.every(
              (t) => t.status === 'completed',
            )
            const anyStarted = batch.tasks.some(
              (t) => t.status === 'started' || t.status === 'completed',
            )
            if (allCompleted) {
              completed.add(batch.batchId)
            } else if (anyStarted) {
              inProgress.add(batch.batchId)
            }
          })
        }
        completedByUser.set(userId, completed)
        inProgressByUser.set(userId, inProgress)
      })
      return { completedByUser, inProgressByUser }
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
