import { useQuery } from '@tanstack/react-query'
import { getActivityStats } from './api'

export const activityQueryKeys = {
  all: ['activity'] as const,
  stats: (eventTypes?: string[]) =>
    ['activity', 'stats', ...(eventTypes?.length ? [eventTypes.sort().join(',')] : [])] as const,
}

export function useActivityStats(eventTypes?: string[]) {
  return useQuery({
    queryKey: activityQueryKeys.stats(eventTypes),
    queryFn: () => getActivityStats(eventTypes),
    refetchInterval: 30_000,
  })
}
