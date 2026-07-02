import { http } from '../../lib/http'
import type { ActivityStats } from './types'

export function getActivityStats(): Promise<ActivityStats> {
  return http.get<ActivityStats>('/v1/activity')
}
