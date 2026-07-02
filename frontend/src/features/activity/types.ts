export type TimelineBucket = {
  bucket: string
  count: number
}

export type EventTypeSummary = {
  type: string
  count: number
}

export type ActivityStats = {
  timeline: TimelineBucket[]
  lastEventTimestamp: number | null
  activeUsers: number
  eventTypeSummary: EventTypeSummary[]
  totalEvents: number
}
