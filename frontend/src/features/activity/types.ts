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
  activeUserEmails: string[]
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
  totalTasks: number
  tasks: TaskSolveStats[]
}

export type ActivityBatchBreakdown = {
  batches: BatchSolveBreakdown[]
}

export type UserOverlapBucket = {
  overlapCount: number
  taskCount: number
}

export type ActivitySummary = {
  totalUniqueTasksResolved: number
  userOverlap: UserOverlapBucket[]
}

export const TIME_WINDOW_OPTIONS = [4, 8, 12, 24, 48, 72] as const
export type TimeWindowHours = (typeof TIME_WINDOW_OPTIONS)[number]
