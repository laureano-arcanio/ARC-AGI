import { useQuery } from '@tanstack/react-query'
import { getActivityStats } from './api'

export const activityQueryKeys = {
  all: ['activity'] as const,
  stats: () => [...activityQueryKeys.all, 'stats'] as const,
}

export function useActivityStats() {
  return useQuery({
    queryKey: activityQueryKeys.stats(),
    queryFn: getActivityStats,
    refetchInterval: 30_000,
  })
}
