import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createUser, getUsers, updateUser, deleteUser } from './api'
import type { UserCreate } from './types'

export const adminUsersQueryKeys = {
  all: ['admin-users'] as const,
  list: () => [...adminUsersQueryKeys.all, 'list'] as const,
}

export function useUsers() {
  return useQuery({
    queryKey: adminUsersQueryKeys.list(),
    queryFn: getUsers,
    staleTime: 10 * 1000,
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
