import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { batchTypeStyle } from '../../batches/batchType'
import { useMyReviewBatches, useMyReviewProgress } from '../queries'
import type { ReviewEntryProgress } from '../types'

function reviewStatus(
  progress: ReviewEntryProgress | undefined,
): { label: string; className: string } {
  if (!progress) {
    return {
      label: 'my_reviews.status_pending_review',
      className: 'text-gray-500',
    }
  }
  if (progress.status === 'needs_revision') {
    return {
      label: 'my_reviews.status_needs_revision',
      className: 'text-red-400',
    }
  }
  if (progress.status === 'done') {
    return {
      label: 'my_reviews.status_done',
      className: 'text-green-400',
    }
  }
  return {
    label: 'my_reviews.status_pending_review',
    className: 'text-gray-500',
  }
}

export function MyReviewsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId, isLoading: authLoading } = useAuth()

  const { data: batches, isLoading: batchesLoading } = useMyReviewBatches(
    userId ?? 0,
  )

  const allTaskIds = useMemo(
    () => batches?.flatMap((b) => b.taskIds) ?? [],
    [batches],
  )

  const { data: progress } = useMyReviewProgress(userId ?? 0, allTaskIds)

  const [expandedBatches, setExpandedBatches] = useState<Set<number>>(
    new Set(),
  )

  if (authLoading || batchesLoading) {
    return (
      <div className="flex items-center gap-3 text-gray-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-purple-400" />
        {t('my_reviews.loading')}
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="text-center">
        <p className="text-gray-400">{t('my_reviews.please_login')}</p>
        <a
          href="/dashboard"
          className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {t('nav.dashboard')}
        </a>
      </div>
    )
  }

  const progressMap = new Map((progress ?? []).map((p) => [p.entryId, p]))

  const toggleBatch = (id: number) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const progressList = [...progressMap.values()]
  const doneCount = progressList.reduce((acc, p) => acc + p.done, 0)
  const needsRevisionCount = progressList.reduce(
    (acc, p) => acc + p.needsRevision,
    0,
  )
  const pendingCount = progressList.reduce((acc, p) => acc + p.pending, 0)
  const totalCount = progressList.reduce((acc, p) => acc + p.total, 0)

  const completedBatches =
    batches?.filter((batch) =>
      batch.taskIds.every((id) => progressMap.get(id)?.status === 'done'),
    ).length ?? 0

  const overallCompletion =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  function batchCompletion(batch: { taskIds: string[] }): {
    done: number
    total: number
    percent: number
  } {
    let done = 0
    let total = 0
    for (const id of batch.taskIds) {
      const p = progressMap.get(id)
      if (p) {
        done += p.done
        total += p.total
      }
    }
    const percent = total > 0 ? Math.round((done / total) * 100) : 0
    return { done, total, percent }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('my_reviews.title')}</h1>
      </div>

      {(batches?.length ?? 0) > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
            <p className="text-xs text-gray-500">{t('my_reviews.stats_batches')}</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {batches?.length ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
            <p className="text-xs text-gray-500">
              {t('my_reviews.stats_completed_batches')}
            </p>
            <p className="mt-1 text-xl font-semibold text-green-400">
              {completedBatches}
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
            <p className="text-xs text-gray-500">{t('my_reviews.stats_progress')}</p>
            <p className="mt-1 text-xl font-semibold text-purple-400">
              {overallCompletion}%
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
            <p className="text-xs text-gray-500">{t('my_reviews.stats_pending')}</p>
            <p className="mt-1 text-xl font-semibold text-gray-400">
              {pendingCount}
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
            <p className="text-xs text-gray-500">
              {t('my_reviews.stats_needs_revision')}
            </p>
            <p className="mt-1 text-xl font-semibold text-red-400">
              {needsRevisionCount}
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
            <p className="text-xs text-gray-500">{t('my_reviews.stats_done')}</p>
            <p className="mt-1 text-xl font-semibold text-green-400">
              {doneCount}
            </p>
          </div>
        </div>
      )}

      {(batches?.length ?? 0) === 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-gray-400">{t('my_reviews.no_batches')}</p>
          <p className="mt-2 text-sm text-gray-600">
            {t('my_reviews.no_batches_hint')}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {batches?.map((batch) => {
          const isExpanded = expandedBatches.has(batch.id)
          const { done, total, percent } = batchCompletion(batch)
          const typeStyle = batchTypeStyle(batch.batchType ?? 'review')
          return (
            <div
              key={batch.id}
              className={`rounded-lg border border-gray-800 border-l-4 bg-gray-900 ${typeStyle.border}`}
            >
              <button
                onClick={() => toggleBatch(batch.id)}
                className="flex w-full items-center gap-2 p-4 text-left transition hover:bg-gray-800/30"
                aria-expanded={isExpanded}
                aria-label={
                  isExpanded
                    ? t('my_reviews.collapse')
                    : t('my_reviews.expand')
                }
              >
                <span className="text-sm text-gray-500 transition-transform duration-200">
                  {isExpanded ? '▲' : '▼'}
                </span>
                <h3 className="font-semibold text-white">{batch.name}</h3>
                <span className="rounded border border-purple-800 bg-purple-900/40 px-2 py-0.5 text-[10px] font-medium text-purple-400">
                  {typeStyle.label}
                </span>
                <span className="text-xs text-gray-500">
                  {total} {t('my_reviews.tasks_count')}
                </span>
                {total > 0 && (
                  <span className="ml-auto text-xs font-medium tabular-nums">
                    <span
                      className={
                        percent === 100 ? 'text-green-400' : 'text-purple-400'
                      }
                    >
                      {t('my_reviews.batch_completion', { done, total, percent })}
                    </span>
                  </span>
                )}
              </button>

              {isExpanded && (
                <>
                  {batch.taskIds.length === 0 ? (
                    <p className="border-t border-gray-800 p-4 text-sm text-gray-500">
                      {t('my_reviews.no_tasks_in_batch')}
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-800 border-t border-gray-800">
                      {batch.taskIds.map((taskId) => {
                        const entry = progressMap.get(taskId)
                        const status = reviewStatus(entry)
                        return (
                          <button
                            key={taskId}
                            onClick={() => navigate(`/my-reviews/${taskId}`)}
                            className="flex w-full items-center justify-between p-4 text-left transition hover:bg-gray-800/50"
                          >
                            <div className="flex items-center gap-4">
                              <span className="font-mono text-sm text-purple-400">
                                {taskId}
                              </span>
                              {entry && entry.total > 1 && (
                                <span className="text-xs text-gray-600">
                                  {entry.done}/{entry.total}{' '}
                                  {t('my_reviews.tasks_count')}
                                </span>
                              )}
                              {entry && entry.total === 0 && (
                                <span className="rounded border border-gray-700 px-2 py-0.5 text-xs text-gray-500">
                                  {t('my_reviews.no_variants')}
                                </span>
                              )}
                              <span
                                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.className} border-current`}
                              >
                                {t(status.label)}
                              </span>
                            </div>
                            <span className="w-28 text-center rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-purple-700">
                              {t('my_reviews.review')}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
