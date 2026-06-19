import { http } from '../../lib/http'
import type { HealthStatus } from './types'

export function getHealth() {
  return http.get<HealthStatus>('/health')
}
