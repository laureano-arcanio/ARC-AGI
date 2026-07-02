import { useQuery } from '@tanstack/react-query'
import { getBatchLeaderboard } from './api'

export const leaderboardQueryKeys = {
  all: ['batch-leaderboard'] as const,
  byBatch: (batchId: number) => [...leaderboardQueryKeys.all, batchId] as const,
}

export function useBatchLeaderboard(batchId: number | null) {
  return useQuery({
    queryKey: leaderboardQueryKeys.byBatch(batchId!),
    queryFn: () => getBatchLeaderboard(batchId!),
    enabled: batchId !== null,
    staleTime: 10 * 1000,
  })
}
