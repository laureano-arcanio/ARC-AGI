import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, updateUser, deleteUser } from './api'

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
