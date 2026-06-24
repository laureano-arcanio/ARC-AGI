import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useCrossEvents, useReviewTags, useAddReviewTag, useDeleteReviewTag } from '../queries'
import { createReview, updateReview, getCrossReviewBySolverTask } from '../api'
import { fetchTaskById } from '../../arc-lab/api'
import { COLOR_MAP } from '../../../shared/types/arc-graph'
import type { ReviewSolverRead } from '../types'
import type { EventRead } from '../../admin-user-detail/types'
import type { ArcTaskRead } from '../../arc-lab/types'

const QUALITY_ORDER = ['good', 'acceptable', 'wrong'] as const

const QUALITY_BTN: Record<string, string> = {
  good: 'border-green-600 bg-green-900/30 text-green-300 hover:bg-green-800/50',
  acceptable: 'border-amber-600 bg-amber-900/30 text-amber-300 hover:bg-amber-800/50',
  wrong: 'border-red-600 bg-red-900/30 text-red-300 hover:bg-red-800/50',
}

const QUALITY_ACTIVE: Record<string, string> = {
  good: 'border-green-400 bg-green-700 text-white',
  acceptable: 'border-amber-400 bg-amber-700 text-white',
  wrong: 'border-red-400 bg-red-700 text-white',
}

const QUALITY_BADGE: Record<string, string> = {
  good: 'bg-green-900/50 text-green-300',
  acceptable: 'bg-amber-900/50 text-amber-300',
  wrong: 'bg-red-900/50 text-red-300',
}

function isCognitiveEvent(ev: EventRead): boolean {
  const t = ev.trigger as { kind?: string }
  return t.kind === 'cognitive'
}

function getEventIntent(ev: EventRead): string {
  const t = ev.trigger as { intent?: string }
  return t.intent ?? 'cognitive'
}

function renderGrid(grid: number[][]) {
  if (!grid.length || !grid[0]?.length) return null
  const cellSize = Math.max(6, Math.min(20, 160 / Math.max(grid.length, grid[0].length)))
  return (
    <div className="inline-block rounded border border-gray-700 overflow-hidden">
      {grid.map((row, ri) => (
        <div key={ri} className="flex">
          {row.map((cell, ci) => (
            <div
              key={ci}
              style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                backgroundColor: COLOR_MAP[cell] ?? '#555',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ReviewTaskPage() {
  const { t } = useTranslation()
  const { solverId, taskId } = useParams<{ solverId: string; taskId: string }>()
  const { userId } = useAuth()
  const numericSolverId = Number(solverId)

  const [review, setReview] = useState<ReviewSolverRead | null>(null)
  const [reviewLoading, setReviewLoading] = useState(true)
  const [reviewStatus, setReviewStatus] = useState('assigned')
  const [eventIndex, setEventIndex] = useState(0)
  const [taskData, setTaskData] = useState<ArcTaskRead | null>(null)

  const { data: events, isLoading: eventsLoading } = useCrossEvents(
    numericSolverId,
    taskId ?? '',
    undefined,
    true,
  )

  useEffect(() => {
    if (!taskId) return
    fetchTaskById(taskId).then(setTaskData).catch(() => {})
  }, [taskId])

  const textEvents = useMemo(
    () => (events ?? []).filter(isCognitiveEvent),
    [events],
  )

  const currentEvent = textEvents[eventIndex] ?? null
  const currentNodeId = currentEvent?.nodeId ?? null

  const testInputGrid = useMemo(() => {
    if (!taskData || !currentEvent) return null
    const tpi = currentEvent.testPairIndex
    if (tpi === null || tpi === undefined) return null
    return taskData.test[tpi]?.input ?? null
  }, [taskData, currentEvent])

  useEffect(() => {
    setEventIndex(0)
  }, [solverId, taskId])

  useEffect(() => {
    async function initReview() {
      if (!userId || !taskId) return
      setReviewLoading(true)
      try {
        const existing = await getCrossReviewBySolverTask(numericSolverId, taskId)
        const existingReview = existing.length > 0 ? existing[0] : null
        if (existingReview) {
          setReview(existingReview)
          setReviewStatus(existingReview.status)
        }
      } catch {
        console.error('Failed to load review')
      } finally {
        setReviewLoading(false)
      }
    }
    initReview()
  }, [userId, numericSolverId, taskId])

  const { data: tags } = useReviewTags(review?.id ?? null)
  const addTagMutation = useAddReviewTag()
  const deleteTagMutation = useDeleteReviewTag()

  const currentTag = useMemo(
    () => (tags ?? []).find((tag) => tag.solverNodeId === currentNodeId) ?? null,
    [tags, currentNodeId],
  )

  const ensureReview = useCallback(async (): Promise<ReviewSolverRead | null> => {
    if (review) return review
    if (!userId || !taskId) return null
    try {
      const created = await createReview({
        reviewerId: userId,
        solverId: numericSolverId,
        taskId,
      })
      setReview(created)
      setReviewStatus(created.status)
      return created
    } catch {
      return null
    }
  }, [review, userId, numericSolverId, taskId])

  const handleTag = useCallback(async (quality: string) => {
    if (!currentNodeId) return
    if (currentTag?.quality === quality) {
      await deleteTagMutation.mutateAsync({ reviewId: currentTag.reviewId, tagId: currentTag.id })
      return
    }
    const r = await ensureReview()
    if (!r) return
    if (currentTag) {
      await deleteTagMutation.mutateAsync({ reviewId: r.id, tagId: currentTag.id })
    }
    await addTagMutation.mutateAsync({
      reviewId: r.id,
      data: { solverNodeId: currentNodeId, quality },
    })
  }, [currentNodeId, currentTag, deleteTagMutation, addTagMutation, ensureReview])

  async function handleComplete() {
    const r = await ensureReview()
    if (!r) return
    const updated = await updateReview(r.id, { status: 'completed' })
    setReview(updated)
    setReviewStatus('completed')
  }

  const isLoading = eventsLoading || reviewLoading

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-gray-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
        {t('review_page.loading')}
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          to="/my-tasks"
          className="text-sm text-gray-400 transition hover:text-white"
        >
          &larr; {t('review_page.back')}
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('review_page.title')}</h1>
          <p className="mt-0.5 font-mono text-sm text-gray-400">{taskId}</p>
        </div>
        {reviewStatus === 'completed' && (
          <span className="rounded bg-green-900/40 px-2.5 py-1 text-xs font-medium text-green-400">
            {t('review_page.completed')}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-3 text-xs text-amber-300">
        {t('review_page.disclaimer')}
      </div>

      {textEvents.length === 0 ? (
        <div className="rounded-lg border border-gray-800 p-8 text-center text-sm text-gray-500">
          No text events found for this task.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setEventIndex((i) => Math.max(0, i - 1))}
              disabled={eventIndex === 0}
              className="rounded bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:hover:bg-gray-800 disabled:hover:text-gray-400"
            >
              &larr; {t('review_page.prev')}
            </button>
            <span className="text-xs text-gray-500">
              {t('review_page.event_n_of', { n: eventIndex + 1, total: textEvents.length })}
            </span>
            <button
              onClick={() => setEventIndex((i) => Math.min(textEvents.length - 1, i + 1))}
              disabled={eventIndex === textEvents.length - 1}
              className="rounded bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:hover:bg-gray-800 disabled:hover:text-gray-400"
            >
              {t('review_page.next')} &rarr;
            </button>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="font-mono text-[10px] text-gray-500">{currentNodeId}</span>
              <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-500">
                {currentEvent ? getEventIntent(currentEvent) : ''}
              </span>
            </div>

            <div className="mb-4 flex justify-center gap-6">
              {testInputGrid && (
                <div>
                  <p className="mb-1 text-center text-[10px] text-gray-500">Input</p>
                  {renderGrid(testInputGrid)}
                </div>
              )}
              <div>
                <p className="mb-1 text-center text-[10px] text-gray-500">Output</p>
                {currentEvent ? renderGrid(currentEvent.stateSnapshot) : null}
              </div>
            </div>

            <div className="rounded border border-gray-700 bg-gray-950 p-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                {currentEvent ? (currentEvent.trigger as { text?: string }).text ?? '' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            {QUALITY_ORDER.map((q) => {
              const active = currentTag?.quality === q
              return (
                <button
                  key={q}
                  onClick={() => handleTag(q)}
                  disabled={addTagMutation.isPending || deleteTagMutation.isPending}
                  className={`rounded border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                    active ? QUALITY_ACTIVE[q] : QUALITY_BTN[q]
                  }`}
                >
                  {t(`review_page.quality_${q}`)}
                </button>
              )
            })}
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <h3 className="mb-3 text-xs font-semibold text-gray-400">
              {t('review_page.all_tags')} ({tags?.length ?? 0})
            </h3>
            {tags && tags.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 rounded border border-gray-700 bg-gray-800/30 px-3 py-1.5"
                  >
                    <span className="font-mono text-[10px] text-gray-500">{tag.solverNodeId}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${QUALITY_BADGE[tag.quality]}`}>
                      {tag.quality}
                    </span>
                    <button
                      onClick={() => deleteTagMutation.mutateAsync({ reviewId: tag.reviewId, tagId: tag.id })}
                      disabled={deleteTagMutation.isPending}
                      className="ml-auto rounded bg-red-800/50 px-2 py-0.5 text-[10px] text-red-300 transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {t('review_page.remove_tag')}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600">{t('review_page.no_tags')}</p>
            )}
          </div>

          {reviewStatus !== 'completed' && (
            <div className="flex justify-center">
              <button
                onClick={handleComplete}
                disabled={addTagMutation.isPending}
                className="rounded bg-green-700 px-6 py-2 text-sm font-semibold text-white transition hover:bg-green-600 disabled:opacity-50"
              >
                {t('review_page.mark_complete')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
