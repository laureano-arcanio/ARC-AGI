import { http } from '../../lib/http'
import type { ActivityBatchBreakdown, ActivityStats, ActivitySummary, TimeWindowHours } from './types'

export function getActivityStats(eventTypes?: string[], hours?: TimeWindowHours): Promise<ActivityStats> {
  const params: Record<string, string> = {}
  if (eventTypes && eventTypes.length > 0) {
    params.eventTypes = eventTypes.join(',')
  }
  if (hours !== undefined && hours !== 24) {
    params.hours = String(hours)
  }
  return http.get<ActivityStats>('/v1/activity', { params })
}

export function getActivitySummary(): Promise<ActivitySummary> {
  return http.get<ActivitySummary>('/v1/activity/summary')
}

export function getActivityBatchBreakdown(): Promise<ActivityBatchBreakdown> {
  return http.get<ActivityBatchBreakdown>('/v1/activity/batch-breakdown')
}
