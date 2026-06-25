import { http } from '../../lib/http'
import type { PeerReviewPair, Review, ReviewTag, ReviewSolverRead, ReviewTaskSummary } from './types'
import type { EventRead } from '../../features/admin-user-detail/types'

// --- Review Pairs (admin) ---

export function getReviewPairs(): Promise<PeerReviewPair[]> {
  return http.get<PeerReviewPair[]>('/v1/reviews/pairs')
}

export function createReviewPair(data: {
  solverAId: number
  solverBId: number
}): Promise<PeerReviewPair> {
  return http.post<PeerReviewPair>('/v1/reviews/pairs', data)
}

export function deleteReviewPair(id: number): Promise<void> {
  return http.delete<void>(`/v1/reviews/pairs/${id}`)
}

// --- Reviews ---

export function getPendingReviews(userId: number): Promise<ReviewTaskSummary[]> {
  return http.get<ReviewTaskSummary[]>(`/v1/reviews/pending/${userId}`)
}

export function createReview(data: {
  reviewerId: number
  solverId: number
  taskId: string
}): Promise<Review> {
  return http.post<Review>('/v1/reviews/', data)
}

export function getReview(id: number): Promise<Review> {
  return http.get<Review>(`/v1/reviews/${id}`)
}

export function updateReview(
  id: number,
  data: { status?: string },
): Promise<Review> {
  return http.put<Review>(`/v1/reviews/${id}`, data)
}

export function getReviewBySolverAndTask(
  solverId: number,
  taskId: string,
): Promise<Review[]> {
  return http.get<Review[]>(`/v1/reviews/solver/${solverId}/task/${taskId}`)
}

export function getCrossEvents(
  targetUserId: number,
  taskId: string,
  attemptId?: number,
): Promise<EventRead[]> {
  const params: Record<string, string | undefined> = {}
  if (attemptId !== undefined) {
    params.attemptId = String(attemptId)
  }
  return http.get<EventRead[]>(`/v1/events/cross/${targetUserId}/tasks/${taskId}`, { params })
}

export function getCrossReviewBySolverTask(
  solverId: number,
  taskId: string,
): Promise<ReviewSolverRead[]> {
  return http.get<ReviewSolverRead[]>(`/v1/reviews/cross/${solverId}/task/${taskId}`)
}

// --- Tags ---

export function getReviewTags(reviewId: number): Promise<ReviewTag[]> {
  return http.get<ReviewTag[]>(`/v1/reviews/${reviewId}/tags`)
}

export function addReviewTag(
  reviewId: number,
  data: { solverNodeId: string; quality: string },
): Promise<ReviewTag> {
  return http.post<ReviewTag>(`/v1/reviews/${reviewId}/tags`, data)
}

export function deleteReviewTag(
  reviewId: number,
  tagId: number,
): Promise<void> {
  return http.delete<void>(`/v1/reviews/${reviewId}/tags/${tagId}`)
}
