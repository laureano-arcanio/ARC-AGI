import { http } from '../../lib/http'
import { env } from '../../lib/env'
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

export async function downloadDataset(): Promise<void> {
  const token = localStorage.getItem('authToken')
  const url = new URL(`${env.apiUrl}/v1/activity/export`, window.location.origin)
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = 'arc-tasks-dataset.jsonl'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}
