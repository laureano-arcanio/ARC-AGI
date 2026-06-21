import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useMyBatches, useMyTaskSummaries, useMyAccessibleTaskIds } from '../queries'

export function MyTasksPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId, isLoading: authLoading } = useAuth()

  const { data: batches, isLoading: batchesLoading } = useMyBatches(userId ?? 0)
  const { data: taskSummaries } = useMyTaskSummaries(userId ?? 0)
  const { data: accessibleIds } = useMyAccessibleTaskIds(userId ?? 0)
  const [expandedBatch, setExpandedBatch] = useState<number | null>(null)

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
    (taskSummaries ?? []).map((s) => [s.taskId, s.attemptCount]),
  )

  const handleTaskClick = (taskId: string) => {
    navigate(`/solve/${userId}/${taskId}`)
  }

  const handleRandomTaskClick = () => {
    if (accessibleIds && accessibleIds.length > 0) {
      const idx = Math.floor(Math.random() * accessibleIds.length)
      const taskId = accessibleIds[idx]
      navigate(`/solve/${userId}/${taskId}`)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('my_tasks.title')}</h1>
        <button
          onClick={handleRandomTaskClick}
          disabled={!accessibleIds || accessibleIds.length === 0}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
        >
          {t('my_tasks.random_task')}
        </button>
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
            <button
              className="flex w-full items-center gap-2 p-4 text-left"
              onClick={() =>
                setExpandedBatch(expandedBatch === batch.id ? null : batch.id)
              }
            >
              <span className="text-sm text-gray-500">
                {expandedBatch === batch.id ? '▾' : '▸'}
              </span>
              <div>
                <h3 className="font-semibold text-white">{batch.name}</h3>
                <p className="text-xs text-gray-500">
                  {batch.taskIds.length} {t('my_tasks.tasks_count')}
                </p>
              </div>
            </button>

            {expandedBatch === batch.id && (
              <div className="border-t border-gray-800">
                {batch.taskIds.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">
                    {t('my_tasks.no_tasks_in_batch')}
                  </p>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {batch.taskIds.map((taskId) => {
                      const attempts = summaryMap.get(taskId) ?? 0
                      return (
                        <button
                          key={taskId}
                          onClick={() => handleTaskClick(taskId)}
                          className="flex w-full items-center justify-between p-4 text-left transition hover:bg-gray-800/50"
                        >
                          <div>
                            <span className="font-mono text-sm text-blue-400">
                              {taskId}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">
                              {attempts === 0
                                ? t('my_tasks.no_attempts')
                                : t('my_tasks.attempts', { count: attempts })}
                            </span>
                            <span className="text-sm text-gray-600">
                              {t('my_tasks.start')} →
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
