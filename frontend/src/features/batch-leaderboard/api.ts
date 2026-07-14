import { http } from '../../lib/http'
import type { LeaderboardEntry } from './types'

export function getBatchLeaderboard(batchId: number): Promise<LeaderboardEntry[]> {
  return http.get<LeaderboardEntry[]>(`/v1/batches/${batchId}/leaderboard`)
}
