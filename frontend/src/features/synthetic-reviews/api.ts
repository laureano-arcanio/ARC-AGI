import { http } from '../../lib/http'
import type { SyntheticReview, SyntheticReviewUpdate, SyntheticTask, SyntheticTaskList } from './types'

export type ListFilters = {
  page?: number
  perPage?: number
  modelName?: string
  witnessPassed?: boolean
  reviewStatus?: string
  correct?: boolean
  verified?: boolean
  originalTaskId?: string
  concept?: string
}

export function fetchSyntheticModels(): Promise<string[]> {
  return http.get<string[]>('/v1/synthetic-tasks/models')
}

export function fetchSyntheticTasks(filters: ListFilters = {}): Promise<SyntheticTaskList> {
  const params: Record<string, string | undefined> = {}
  if (filters.page) params.page = String(filters.page)
  if (filters.perPage) params.perPage = String(filters.perPage)
  if (filters.modelName) params.modelName = filters.modelName
  if (filters.witnessPassed !== undefined) params.witnessPassed = String(filters.witnessPassed)
  if (filters.reviewStatus) params.reviewStatus = filters.reviewStatus
  if (filters.correct !== undefined) params.correct = String(filters.correct)
  if (filters.verified !== undefined) params.verified = String(filters.verified)
  if (filters.originalTaskId) params.originalTaskId = filters.originalTaskId
  if (filters.concept) params.concept = filters.concept
  return http.get<SyntheticTaskList>('/v1/synthetic-tasks', { params })
}

export function fetchSyntheticTask(synthTaskId: string): Promise<SyntheticTask> {
  return http.get<SyntheticTask>(`/v1/synthetic-tasks/${synthTaskId}`)
}

export function fetchSyntheticReview(synthTaskId: string): Promise<SyntheticReview> {
  return http.get<SyntheticReview>(`/v1/synthetic-tasks/${synthTaskId}/review`)
}

export function updateSyntheticReview(synthTaskId: string, data: SyntheticReviewUpdate): Promise<SyntheticReview> {
  return http.put<SyntheticReview>(`/v1/synthetic-tasks/${synthTaskId}/review`, data)
}

export type TaskSolverRead = {
  userId: number
  email: string
  hypothesis: string | null
}

export function fetchTaskSolvers(taskId: string): Promise<TaskSolverRead[]> {
  return http.get<TaskSolverRead[]>(`/v1/tasks/${encodeURIComponent(taskId)}/solvers`)
}
