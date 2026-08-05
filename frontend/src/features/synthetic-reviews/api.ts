import { http } from '../../lib/http'
import type { ReviewGroupList, ReviewGroupsFilters, SolverReviewDetail, SyntheticReview, SyntheticReviewUpdate, SyntheticTask, UserRead } from './types'

export function fetchSyntheticModels(): Promise<string[]> {
  return http.get<string[]>('/v1/synthetic-tasks/models')
}

export function fetchResolveEntry(entryId: string): Promise<SyntheticTask[]> {
  return http.get<SyntheticTask[]>(`/v1/synthetic-tasks/resolve/${encodeURIComponent(entryId)}`)
}

export function fetchReviewGroups(filters: ReviewGroupsFilters = {}): Promise<ReviewGroupList> {
  const params: Record<string, string | undefined> = {
    page: filters.page ? String(filters.page) : undefined,
    perPage: filters.perPage ? String(filters.perPage) : undefined,
    minWidth: filters.minWidth || undefined,
    maxWidth: filters.maxWidth || undefined,
    minHeight: filters.minHeight || undefined,
    maxHeight: filters.maxHeight || undefined,
    minSolutions: filters.minSolutions || undefined,
    maxSolutions: filters.maxSolutions || undefined,
    sameSize: filters.sameSize || undefined,
    minWidthDelta: filters.minWidthDelta || undefined,
    maxWidthDelta: filters.maxWidthDelta || undefined,
    minHeightDelta: filters.minHeightDelta || undefined,
    maxHeightDelta: filters.maxHeightDelta || undefined,
    allInputsSame: filters.allInputsSame || undefined,
    allOutputsSame: filters.allOutputsSame || undefined,
    solverEmail: filters.solverEmail || undefined,
    hypothesisText: filters.hypothesisText || undefined,
    taskId: filters.taskId || undefined,
    dataset: filters.dataset || undefined,
    hasTags: filters.hasTags || undefined,
    modelName: filters.modelName || undefined,
    concept: filters.concept || undefined,
    witnessPassed: filters.witnessPassed || undefined,
    originalTaskId: filters.originalTaskId || undefined,
    onlyMultipleVariants: filters.onlyMultipleVariants || undefined,
    userReviewStatus: filters.userReviewStatus || undefined,
    reviewerUserId: filters.reviewerUserId || undefined,
    reviewerEmail: filters.reviewerEmail || undefined,
    minIncorrectMarks: filters.minIncorrectMarks || undefined,
    adminReviewStatus: filters.adminReviewStatus || undefined,
    adminCorrect: filters.adminCorrect || undefined,
    adminVerified: filters.adminVerified || undefined,
  }

  return http.get<ReviewGroupList>('/v1/tasks/review-groups', { params })
}

export function fetchUsers(): Promise<UserRead[]> {
  return http.get<UserRead[]>('/v1/users/')
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

export function fetchSolverReviewDetails(
  originalTaskId: string,
): Promise<SolverReviewDetail[]> {
  return http.get<SolverReviewDetail[]>(
    `/v1/user-reviews/by-original/${encodeURIComponent(originalTaskId)}`,
  )
}
