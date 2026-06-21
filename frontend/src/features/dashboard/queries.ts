import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createUser, loginUser } from './api'

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      email,
      password,
    }: {
      email: string
      password: string
    }) => createUser(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
    },
  })
}

export function useLogin() {
  return useMutation({
    mutationFn: ({
      email,
      password,
    }: {
      email: string
      password: string
    }) => loginUser(email, password),
  })
}
