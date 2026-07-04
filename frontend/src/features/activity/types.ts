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

export type TaskSolveStats = {
  taskId: string
  avgTimeMs: number
  minTimeMs: number
  maxTimeMs: number
  p95TimeMs: number
  completedCount: number
}

export type BatchSolveBreakdown = {
  batchId: number
  batchName: string
  tasks: TaskSolveStats[]
}

export type ActivityBatchBreakdown = {
  batches: BatchSolveBreakdown[]
}

export const TIME_WINDOW_OPTIONS = [4, 8, 12, 24, 48, 72] as const
export type TimeWindowHours = (typeof TIME_WINDOW_OPTIONS)[number]
