import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import {
  useUserDetail,
  useUserTasks,
  useUpdateUserPassword,
} from '../queries'

export function AdminUserDetailPage() {
  const { t } = useTranslation()
  const { isAdmin, isLoading: authLoading } = useAuth()
  const { userId } = useParams<{ userId: string }>()
  const numericId = Number(userId)
  const navigate = useNavigate()

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

  const [passwordValue, setPasswordValue] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const passwordMutation = useUpdateUserPassword()

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
            <p className="mt-1 text-sm text-gray-400">
              {user.email}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-400">
          {t('admin_detail.change_password')}
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input
            type="password"
            value={passwordValue}
            onChange={(e) => {
              setPasswordValue(e.target.value)
              setPasswordError('')
              setPasswordSuccess('')
            }}
            placeholder={t('dashboard.password_placeholder')}
            autoComplete="new-password"
            className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={async () => {
              if (!passwordValue.trim()) return
              setPasswordError('')
              setPasswordSuccess('')
              try {
                await passwordMutation.mutateAsync({
                  userId: numericId,
                  data: { password: passwordValue },
                })
                setPasswordSuccess(t('admin_detail.password_changed'))
                setPasswordValue('')
              } catch {
                setPasswordError(t('admin_detail.password_error'))
              }
            }}
            disabled={passwordMutation.isPending || !passwordValue.trim()}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {passwordMutation.isPending
              ? t('admin_detail.password_saving')
              : t('admin_detail.change_password')}
          </button>
        </div>
        {passwordError && (
          <p className="mt-2 text-sm text-red-400">{passwordError}</p>
        )}
        {passwordSuccess && (
          <p className="mt-2 text-sm text-green-400">{passwordSuccess}</p>
        )}
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
                <th className="px-4 py-3 font-medium">
                  {t('admin_detail.view_graph')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {tasks?.map((row) => (
                <tr
                  key={row.taskId}
                  onClick={() => navigate(`/admin/users/${numericId}/task/${row.taskId}`)}
                  className="cursor-pointer transition hover:bg-gray-900/50"
                >
                  <td className="px-4 py-3 font-mono text-gray-200">
                    {row.taskId}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {row.attemptCount}{' '}
                    {row.attemptCount === 1
                      ? t('admin_detail.attempt')
                      : t('admin_detail.attempts')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-400 transition group-hover:bg-gray-700">
                      {t('admin_detail.view_graph')}
                    </span>
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
