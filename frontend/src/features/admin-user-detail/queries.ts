import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getUser, getUserBatchTasks, getAttempts, getEvents, updateUserPassword, deleteUserTask, deleteAttempt } from './api'

export const adminUserDetailQueryKeys = {
  all: ['admin-user-detail'] as const,
  user: (userId: number) =>
    [...adminUserDetailQueryKeys.all, 'user', userId] as const,
  tasks: (userId: number) =>
    [...adminUserDetailQueryKeys.all, 'tasks', userId] as const,
  attempts: (userId: number, taskId: string) =>
    [...adminUserDetailQueryKeys.all, 'attempts', userId, taskId] as const,
  events: (
    userId: number,
    taskId: string,
    attemptId: number | undefined,
  ) =>
    [
      ...adminUserDetailQueryKeys.all,
      'events',
      userId,
      taskId,
      attemptId,
    ] as const,
}

export function useUserDetail(userId: number) {
  return useQuery({
    queryKey: adminUserDetailQueryKeys.user(userId),
    queryFn: () => getUser(userId),
  })
}

export function useUserBatchTasks(userId: number) {
  return useQuery({
    queryKey: adminUserDetailQueryKeys.tasks(userId),
    queryFn: () => getUserBatchTasks(userId),
  })
}

export function useAttempts(userId: number, taskId: string, enabled: boolean) {
  return useQuery({
    queryKey: adminUserDetailQueryKeys.attempts(userId, taskId),
    queryFn: () => getAttempts(userId, taskId),
    enabled,
  })
}

export function useUpdateUserPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: number
      data: { password: string }
    }) => updateUserPassword(userId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminUserDetailQueryKeys.user(variables.userId),
      })
    },
  })
}

export function useDeleteUserTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userId,
      taskId,
    }: {
      userId: number
      taskId: string
    }) => deleteUserTask(userId, taskId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminUserDetailQueryKeys.tasks(variables.userId),
      })
    },
  })
}

export function useDeleteAttempts(userId: number, taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (attemptIds: number[]) => {
      return Promise.all(attemptIds.map((id) => deleteAttempt(id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminUserDetailQueryKeys.attempts(userId, taskId),
      })
      queryClient.invalidateQueries({
        queryKey: adminUserDetailQueryKeys.events(userId, taskId, undefined),
      })
    },
  })
}

export function useEvents(
  userId: number,
  taskId: string,
  attemptId: number | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: adminUserDetailQueryKeys.events(userId, taskId, attemptId),
    queryFn: () => getEvents(userId, taskId, attemptId),
    enabled,
  })
}
