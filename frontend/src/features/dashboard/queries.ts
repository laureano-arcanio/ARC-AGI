import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createUser, getUserByUuid } from './api'

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  userByUuid: (uuid: string) => [...dashboardQueryKeys.all, 'user', uuid] as const,
}

export function useUserByUuid(uuid: string) {
  return useQuery({
    queryKey: dashboardQueryKeys.userByUuid(uuid),
    queryFn: () => getUserByUuid(uuid),
    enabled: uuid.length > 0,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
    },
  })
}
