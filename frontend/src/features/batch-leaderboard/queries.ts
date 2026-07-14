import { useQueries } from '@tanstack/react-query'
import { getBatchLeaderboard } from './api'
import { useBatches } from '../batches/queries'

export const leaderboardQueryKeys = {
  all: ['batch-leaderboard'] as const,
  byBatch: (batchId: number) => [...leaderboardQueryKeys.all, batchId] as const,
}

export function useAllBatchLeaderboards() {
  const { data: batches, isLoading: batchesLoading } = useBatches()

  const leaderboardQueries = useQueries({
    queries: (batches ?? []).map((b) => ({
      queryKey: leaderboardQueryKeys.byBatch(b.id),
      queryFn: () => getBatchLeaderboard(b.id),
      staleTime: 10 * 1000,
    })),
  })

  return {
    batches: batches ?? [],
    batchesLoading,
    leaderboards: leaderboardQueries,
  }
}
