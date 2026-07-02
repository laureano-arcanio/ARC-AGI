import { http } from '../../lib/http'
import type { ActivityBatchBreakdown, ActivityStats } from './types'

export function getActivityStats(eventTypes?: string[]): Promise<ActivityStats> {
  const params: Record<string, string> = {}
  if (eventTypes && eventTypes.length > 0) {
    params.eventTypes = eventTypes.join(',')
  }
  return http.get<ActivityStats>('/v1/activity', { params })
}

export function getActivityBatchBreakdown(): Promise<ActivityBatchBreakdown> {
  return http.get<ActivityBatchBreakdown>('/v1/activity/batch-breakdown')
}
