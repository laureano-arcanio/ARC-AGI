import { useQuery } from '@tanstack/react-query'
import { getActivityBatchBreakdown, getActivityStats, getActivitySummary, getActivityUserReviewStats } from './api'
import type { TimeWindowHours } from './types'

export const activityQueryKeys = {
  all: ['activity'] as const,
  stats: (eventTypes?: string[], hours?: TimeWindowHours) =>
    ['activity', 'stats', String(hours ?? 24), ...(eventTypes?.length ? [eventTypes.sort().join(',')] : [])] as const,
  batchBreakdown: () => ['activity', 'batch-breakdown'] as const,
  summary: () => ['activity', 'summary'] as const,
  reviewStats: () => ['activity', 'review-stats'] as const,
}

export function useActivityStats(eventTypes?: string[], hours?: TimeWindowHours) {
  return useQuery({
    queryKey: activityQueryKeys.stats(eventTypes, hours),
    queryFn: () => getActivityStats(eventTypes, hours),
    refetchInterval: 30_000,
  })
}

export function useActivitySummary() {
  return useQuery({
    queryKey: activityQueryKeys.summary(),
    queryFn: getActivitySummary,
    staleTime: 30_000,
  })
}

export function useActivityBatchBreakdown() {
  return useQuery({
    queryKey: activityQueryKeys.batchBreakdown(),
    queryFn: getActivityBatchBreakdown,
    staleTime: 30_000,
  })
}

export function useActivityUserReviewStats() {
  return useQuery({
    queryKey: activityQueryKeys.reviewStats(),
    queryFn: getActivityUserReviewStats,
    staleTime: 30_000,
  })
}
