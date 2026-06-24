import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getBatches,
  getBatch,
  createBatch,
  updateBatch,
  deleteBatch,
  assignBatchToUser,
  unassignBatchFromUser,
  getUserBatches,
  getUserAccessibleTaskIds,
} from './api'
import { adminUsersQueryKeys } from '../admin-users/queries'

export const batchQueryKeys = {
  all: ['batches'] as const,
  list: () => [...batchQueryKeys.all, 'list'] as const,
  detail: (id: number) => [...batchQueryKeys.all, 'detail', id] as const,
  userBatches: (userId: number) =>
    [...batchQueryKeys.all, 'user', userId] as const,
  userTaskIds: (userId: number) =>
    [...batchQueryKeys.all, 'user-task-ids', userId] as const,
}

export function useBatches() {
  return useQuery({
    queryKey: batchQueryKeys.list(),
    queryFn: getBatches,
  })
}

export function useBatch(id: number) {
  return useQuery({
    queryKey: batchQueryKeys.detail(id),
    queryFn: () => getBatch(id),
  })
}

export function useCreateBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.all })
    },
  })
}

export function useUpdateBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; taskIds?: string[] } }) =>
      updateBatch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.all })
    },
  })
}

export function useDeleteBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.all })
    },
  })
}

export function useAssignBatchToUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ batchId, userId }: { batchId: number; userId: number }) =>
      assignBatchToUser(batchId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: adminUsersQueryKeys.all })
    },
  })
}

export function useUnassignBatchFromUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ batchId, userId }: { batchId: number; userId: number }) =>
      unassignBatchFromUser(batchId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: adminUsersQueryKeys.all })
    },
  })
}

export function useUserBatches(userId: number) {
  return useQuery({
    queryKey: batchQueryKeys.userBatches(userId),
    queryFn: () => getUserBatches(userId),
    enabled: userId > 0,
  })
}

export function useUserAccessibleTaskIds(userId: number) {
  return useQuery({
    queryKey: batchQueryKeys.userTaskIds(userId),
    queryFn: () => getUserAccessibleTaskIds(userId),
    enabled: userId > 0,
    staleTime: 60 * 1000,
  })
}
