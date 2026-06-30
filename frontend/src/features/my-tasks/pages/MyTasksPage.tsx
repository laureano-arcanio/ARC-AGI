import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useMyBatches, useMyTaskSummaries } from '../queries'
import { usePendingReviews } from '../../reviews/queries'
import { fetchResumableAttempt } from '../api'
import type { UserTaskSummary } from '../types'

function taskStatus(summary: UserTaskSummary | undefined): {
  label: string
  className: string
} {
  if (!summary || summary.attemptCount === 0)
    return { label: 'my_tasks.status_pending', className: 'text-gray-500' }
  if (summary.solved)
    return { label: 'my_tasks.status_verified', className: 'text-green-400' }
  if (summary.abandoned)
    return { label: 'my_tasks.status_abandoned', className: 'text-red-400' }
  return { label: 'my_tasks.status_retry', className: 'text-amber-400' }
}

function buttonConfig(summary: UserTaskSummary | undefined): {
  label: string | null
  className: string
  disabled: boolean
} {
  if (!summary || summary.attemptCount === 0) {
    return {
      label: 'my_tasks.start',
      className: 'bg-green-600 hover:bg-green-700 text-white',
      disabled: false,
    }
  }
  if (summary.solved) {
    return { label: null, className: '', disabled: true }
  }
  if (summary.abandoned) {
    return {
      label: 'my_tasks.retry',
      className: 'bg-amber-600 hover:bg-amber-700 text-white',
      disabled: false,
    }
  }
  return {
    label: 'my_tasks.continue',
    className: 'bg-blue-600 hover:bg-blue-700 text-white',
    disabled: false,
  }
}

export function MyTasksPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId, isLoading: authLoading } = useAuth()

  const { data: batches, isLoading: batchesLoading } = useMyBatches(userId ?? 0)
  const { data: taskSummaries } = useMyTaskSummaries(userId ?? 0)
  const { data: pendingReviews } = usePendingReviews(userId ?? 0)

  if (authLoading || batchesLoading) {
    return (
      <div className="flex items-center gap-3 text-gray-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
        {t('my_tasks.loading')}
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="text-center">
        <p className="text-gray-400">{t('my_tasks.please_login')}</p>
        <a
          href="/dashboard"
          className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {t('nav.dashboard')}
        </a>
      </div>
    )
  }

  const summaryMap = new Map(
    (taskSummaries ?? []).map((s) => [s.taskId, s]),
  )

  const handleTaskClick = async (taskId: string) => {
    if (!userId) return
    const resumable = await fetchResumableAttempt(userId, taskId).catch(() => null)
    if (resumable) {
      navigate(`/solve/${userId}/${taskId}?attemptId=${resumable.id}`)
    } else {
      navigate(`/hypothesize/${userId}/${taskId}`)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('my_tasks.title')}</h1>
      </div>

      {(batches?.length ?? 0) === 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-gray-400">{t('my_tasks.no_batches')}</p>
          <p className="mt-2 text-sm text-gray-600">{t('my_tasks.no_batches_hint')}</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {batches?.map((batch) => (
          <div
            key={batch.id}
            className="rounded-lg border border-gray-800 bg-gray-900"
          >
            <div className="flex items-center gap-2 border-b border-gray-800 p-4">
              <h3 className="font-semibold text-white">{batch.name}</h3>
              <span className="text-xs text-gray-500">
                {batch.taskIds.length} {t('my_tasks.tasks_count')}
              </span>
            </div>

            {batch.taskIds.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">
                {t('my_tasks.no_tasks_in_batch')}
              </p>
            ) : (
              <div className="divide-y divide-gray-800">
                {batch.taskIds.map((taskId) => {
                  const summary = summaryMap.get(taskId)
                  const status = taskStatus(summary)
                  const btn = buttonConfig(summary)
                  return (
                    <button
                      key={taskId}
                      onClick={() => { if (!btn.disabled) handleTaskClick(taskId) }}
                      disabled={btn.disabled}
                      className={`flex w-full items-center justify-between p-4 text-left transition ${
                        btn.disabled
                          ? 'cursor-default opacity-60'
                          : 'hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm text-blue-400">
                          {taskId}
                        </span>
                        <span className="text-xs text-gray-500">
                          {summary
                            ? t('my_tasks.attempts', { count: summary.attemptCount })
                            : t('my_tasks.no_attempts')}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.className} border-current`}
                        >
                          {t(status.label)}
                        </span>
                      </div>
                      {btn.label && (
                        <span className={`w-28 text-center rounded-lg px-3 py-1.5 text-sm font-semibold transition ${btn.className}`}>
                          {t(btn.label)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pending Reviews Section */}
      {(pendingReviews?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-amber-800 bg-amber-950/10">
          <div className="flex items-center gap-2 border-b border-amber-800/50 p-4">
            <h3 className="font-semibold text-amber-300">{t('my_tasks.pending_reviews')}</h3>
            <span className="text-xs text-amber-500">
              {pendingReviews?.length} {t('my_tasks.tasks_count')}
            </span>
          </div>
          <div className="divide-y divide-amber-800/20">
            {pendingReviews?.map((review) => (
              <button
                key={`${review.solverId}-${review.taskId}`}
                onClick={() =>
                  navigate(`/review/${review.solverId}/${review.taskId}`)
                }
                className="flex w-full items-center justify-between p-4 text-left transition hover:bg-amber-900/10"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-amber-400">
                    {review.taskId}
                  </span>

                </div>
                <span className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-700">
                  {t('my_tasks.review')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
