import { http } from '../../lib/http'
import type { SyntheticTask } from '../synthetic-reviews/types'
import type {
  AnonymousSolver,
  MyHypothesis,
  MyHypothesisUpdate,
  ReviewBatch,
  ReviewEntryProgress,
  UserReview,
  UserReviewUpdate,
} from './types'

export function getUserReviewBatches(userId: number): Promise<ReviewBatch[]> {
  return http.get<ReviewBatch[]>(`/v1/batches/user/${userId}`, {
    params: { type: 'review' },
  })
}

export function fetchReviewEntryProgress(
  taskIds: string[],
): Promise<ReviewEntryProgress[]> {
  return http.get<ReviewEntryProgress[]>('/v1/user-reviews/progress', {
    params: { taskIds: taskIds.join(',') },
  })
}

export function resolveSyntheticTasks(entryId: string): Promise<SyntheticTask[]> {
  return http.get<SyntheticTask[]>(
    `/v1/synthetic-tasks/resolve/${encodeURIComponent(entryId)}`,
  )
}

export function fetchUserReview(taskId: string): Promise<UserReview> {
  return http.get<UserReview>(`/v1/user-reviews/${encodeURIComponent(taskId)}`)
}

export function startUserReview(taskId: string): Promise<UserReview> {
  return http.post<UserReview>(
    `/v1/user-reviews/${encodeURIComponent(taskId)}/start`,
  )
}

export function updateUserReview(
  taskId: string,
  data: UserReviewUpdate,
): Promise<UserReview> {
  return http.put<UserReview>(
    `/v1/user-reviews/${encodeURIComponent(taskId)}`,
    data,
  )
}

export function fetchAnonymousSolvers(taskId: string): Promise<AnonymousSolver[]> {
  return http.get<AnonymousSolver[]>(
    `/v1/tasks/${encodeURIComponent(taskId)}/solvers-public`,
  )
}

export function fetchMyHypothesis(taskId: string): Promise<MyHypothesis> {
  return http.get<MyHypothesis>(
    `/v1/tasks/${encodeURIComponent(taskId)}/my-hypothesis`,
  )
}

export function updateMyHypothesis(
  taskId: string,
  data: MyHypothesisUpdate,
): Promise<MyHypothesis> {
  return http.put<MyHypothesis>(
    `/v1/tasks/${encodeURIComponent(taskId)}/my-hypothesis`,
    data,
  )
}
