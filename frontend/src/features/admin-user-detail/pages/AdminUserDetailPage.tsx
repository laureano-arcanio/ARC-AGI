import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import {
  useUserDetail,
  useUserTasks,
  useAttempts,
  useEvents,
} from '../queries'

export function AdminUserDetailPage() {
  const { t } = useTranslation()
  const { isAdmin, isLoading: authLoading } = useAuth()
  const { userId } = useParams<{ userId: string }>()
  const numericId = Number(userId)

  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useUserDetail(numericId)
  const {
    data: tasks,
    isLoading: tasksLoading,
    error: tasksError,
  } = useUserTasks(numericId)

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null)

  const selectedTask = expandedTaskId

  const {
    data: attempts,
  } = useAttempts(numericId, selectedTask ?? '', !!selectedTask)

  const activeAttemptId = selectedAttemptId ?? undefined

  const {
    data: events,
    isLoading: eventsLoading,
  } = useEvents(
    numericId,
    selectedTask ?? '',
    activeAttemptId,
    !!selectedTask,
  )

  if (authLoading || userLoading || tasksLoading) {
    return (
      <div className="flex items-center gap-3 text-gray-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
        {t('admin_detail.loading')}
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
        <p className="font-semibold">{t('admin_detail.unauthorized')}</p>
      </div>
    )
  }

  if (userError) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
        <p className="font-semibold">{t('admin_detail.error')}</p>
        <p className="mt-1 text-sm">{userError.message}</p>
      </div>
    )
  }

  if (tasksError) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
        <p className="font-semibold">{t('admin_detail.error')}</p>
        <p className="mt-1 text-sm">{tasksError.message}</p>
      </div>
    )
  }

  const handleTaskClick = (taskId: string) => {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null)
      setSelectedAttemptId(null)
    } else {
      setExpandedTaskId(taskId)
      setSelectedAttemptId(null)
    }
  }

  const handleAttemptClick = (attemptId: number | null) => {
    setSelectedAttemptId(attemptId)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          to="/admin/users"
          className="text-sm text-gray-400 transition hover:text-white"
        >
          &larr; {t('admin_detail.back')}
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t('admin_detail.title')}
          </h1>
          {user && (
            <p className="mt-1 font-mono text-sm text-gray-400">
              UUID: {user.uuid}
            </p>
          )}
        </div>
      </div>

      {tasks && tasks.length === 0 ? (
        <div className="rounded-lg border border-gray-800 p-8 text-center text-gray-500">
          {t('admin_detail.no_tasks')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">
                  {t('admin_detail.table.taskId')}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t('admin_detail.table.attempts')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {tasks?.map((row) => (
                <tr
                  key={row.taskId}
                  onClick={() => handleTaskClick(row.taskId)}
                  className="cursor-pointer transition hover:bg-gray-900/50"
                >
                  <td className="px-4 py-3" colSpan={2}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-gray-200">
                          {row.taskId}
                        </span>
                        <span className="text-gray-400">
                          {row.attemptCount}{' '}
                          {row.attemptCount === 1
                            ? t('admin_detail.attempt')
                            : t('admin_detail.attempts')}
                        </span>
                      </div>

                      {expandedTaskId === row.taskId && (
                      <div className="mt-3 border-t border-gray-700 pt-3">
                        {attempts && attempts.length > 1 && (
                          <div className="mb-3 flex flex-wrap gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAttemptClick(null)
                              }}
                              className={`rounded px-3 py-1 text-xs font-medium transition ${
                                selectedAttemptId === null
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                              }`}
                            >
                              {t('admin_detail.all_events')}
                            </button>
                            {attempts.map((attempt, idx) => (
                              <button
                                key={attempt.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAttemptClick(attempt.id)
                                }}
                                className={`rounded px-3 py-1 text-xs font-medium transition ${
                                  selectedAttemptId === attempt.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                              >
                                {t('admin_detail.attempt_n', {
                                  n: idx + 1,
                                })}
                              </button>
                            ))}
                          </div>
                        )}

                        {eventsLoading ? (
                          <div className="py-4 text-center text-gray-500">
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />{' '}
                            {t('admin_detail.loading_events')}
                          </div>
                        ) : events && events.length > 0 ? (
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-gray-700 text-gray-500">
                              <tr>
                                <th className="px-3 py-2 font-medium">
                                  {t('admin_detail.table.nodeId')}
                                </th>
                                <th className="px-3 py-2 font-medium">
                                  {t('admin_detail.table.timestamp')}
                                </th>
                                <th className="px-3 py-2 font-medium">
                                  {t('admin_detail.table.trigger')}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                              {events.map((ev) => (
                                <tr
                                  key={ev.id}
                                  className="transition hover:bg-gray-900/50"
                                >
                                  <td className="px-3 py-2 font-mono text-gray-300">
                                    {ev.nodeId}
                                  </td>
                                  <td className="px-3 py-2 text-gray-400">
                                    {ev.timestamp}
                                  </td>
                                  <td className="max-w-[400px] truncate px-3 py-2 font-mono text-gray-400">
                                    {JSON.stringify(ev.trigger)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="py-4 text-center text-gray-500">
                            {t('admin_detail.no_events')}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
