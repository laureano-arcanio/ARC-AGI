import { useQuery } from '@tanstack/react-query'
import { getUser, getUserTasks, getAttempts, getEvents } from './api'

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

export function useUserTasks(userId: number) {
  return useQuery({
    queryKey: adminUserDetailQueryKeys.tasks(userId),
    queryFn: () => getUserTasks(userId),
  })
}

export function useAttempts(userId: number, taskId: string, enabled: boolean) {
  return useQuery({
    queryKey: adminUserDetailQueryKeys.attempts(userId, taskId),
    queryFn: () => getAttempts(userId, taskId),
    enabled,
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
