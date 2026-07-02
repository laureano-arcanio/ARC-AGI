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
