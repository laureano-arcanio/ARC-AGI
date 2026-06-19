import { useQuery } from '@tanstack/react-query'
import { getHealth } from './api'

export const healthQueryKeys = {
  all: ['health'] as const,
  status: () => [...healthQueryKeys.all, 'status'] as const,
}

export function useHealthStatus() {
  return useQuery({
    queryKey: healthQueryKeys.status(),
    queryFn: getHealth,
  })
}
