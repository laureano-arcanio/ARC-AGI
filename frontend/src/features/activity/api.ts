import { http } from '../../lib/http'
import type { ActivityStats } from './types'

export function getActivityStats(eventTypes?: string[]): Promise<ActivityStats> {
  const params: Record<string, string> = {}
  if (eventTypes && eventTypes.length > 0) {
    params.eventTypes = eventTypes.join(',')
  }
  return http.get<ActivityStats>('/v1/activity', { params })
}
