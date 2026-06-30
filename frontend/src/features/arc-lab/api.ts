import { http } from '../../lib/http'
import type { ArcTaskRead, AttemptRead, EventPayload } from './types'

export function fetchRandomTasks(count = 10, userId?: number): Promise<ArcTaskRead[]> {
  const params: Record<string, string | undefined> = { count: String(count) }
  if (userId !== undefined) {
    params.userId = String(userId)
  }
  return http.get<ArcTaskRead[]>('/v1/arc-tasks/random', { params })
}

export function fetchTaskById(taskId: string): Promise<ArcTaskRead> {
  return http.get<ArcTaskRead>(`/v1/arc-tasks/${encodeURIComponent(taskId)}`)
}

export function createAttempt(
  userId: number,
  taskId: string,
): Promise<AttemptRead> {
  return http.post<AttemptRead>('/v1/attempts/', { userId, taskId })
}

export function postEvent(event: EventPayload): Promise<unknown> {
  return http.post('/v1/events/', event)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Reasoning data matters more than a fast post, so retry a failing event up to
// `maxAttempts` times before giving up. Resolves on the first success; rejects
// only after every attempt has failed so the caller can surface an error.
export async function postEventWithRetry(
  event: EventPayload,
  maxAttempts = 10,
): Promise<void> {
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await postEvent(event)
      return
    } catch (err) {
      lastError = err
      if (attempt < maxAttempts - 1) {
        await delay(Math.min(500 * (attempt + 1), 3000))
      }
    }
  }
  throw lastError
}

export type SubmitPayload = {
  userId: number
  taskId: string
  attemptId: number
  nodeId: string
  parentNodeId: string | null
  testPairIndex: number
  grids: Record<number, number[][]>
  stateSnapshot: number[][]
  timestamp: number
}

// The server validates the submitted grids against the stored solutions and is
// the sole authority on correctness; it also records the submit event.
export async function submitAttempt(
  payload: SubmitPayload,
): Promise<{ correct: boolean }> {
  const res = await http.post<{ trigger?: { details?: { correct?: boolean } } }>(
    '/v1/events/submit',
    payload,
  )
  return { correct: res.trigger?.details?.correct === true }
}

export type PreSolverEventRead = {
  id: number
  nodeId: string
  parentNodeId: string | null
  testPairIndex: number | null
  trigger: Record<string, unknown>
  stateSnapshot: number[][]
  timestamp: number
}

export function fetchEventsByAttempt(
  userId: number,
  taskId: string,
  attemptId: number,
): Promise<PreSolverEventRead[]> {
  return http.get<PreSolverEventRead[]>(
    `/v1/events/users/${userId}/tasks/${taskId}`,
    { params: { attemptId: String(attemptId) } },
  )
}

export type ResumableAttemptRead = {
  id: number
  userId: number
  taskId: string
  status: string | null
}

export function fetchResumableAttempt(
  userId: number,
  taskId: string,
): Promise<ResumableAttemptRead | null> {
  return http.get<ResumableAttemptRead | null>(
    `/v1/attempts/users/${userId}/tasks/${encodeURIComponent(taskId)}/resumable`,
  )
}
