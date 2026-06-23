import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import {
  useUserDetail,
  useUserTasks,
  useUpdateUserPassword,
  useDeleteUserTask,
} from '../queries'

function ConfirmDialog({
  open,
  count,
  onCancel,
  onConfirm,
  isPending,
}: {
  open: boolean
  count: number
  onCancel: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-100">
          {t('admin_detail.delete_confirm_title')}
        </h3>
        <p className="mt-2 text-sm text-gray-400">
          {t('admin_detail.delete_confirm_message', { count })}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-700 disabled:opacity-50"
          >
            {t('admin_detail.delete_confirm_cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
          >
            {isPending ? '...' : t('admin_detail.delete_confirm_confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

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

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const deleteMutation = useDeleteUserTask()

  function toggleSelect(taskId: string) {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
    setDeleteStatus('idle')
  }

  function toggleSelectAll() {
    if (!tasks) return
    setSelectedTaskIds((prev) => {
      if (prev.size === tasks.length) {
        return new Set()
      }
      return new Set(tasks.map((t) => t.taskId))
    })
    setDeleteStatus('idle')
  }

  async function handleDeleteConfirm() {
    const ids = [...selectedTaskIds]
    try {
      for (const taskId of ids) {
        await deleteMutation.mutateAsync({ userId: numericId, taskId })
      }
      setSelectedTaskIds(new Set())
      setConfirmOpen(false)
      setDeleteStatus('success')
    } catch {
      setDeleteStatus('error')
    }
  }

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

  const allSelected = tasks ? selectedTaskIds.size === tasks.length : false

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
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">
              {tasks?.length ?? 0} tasks
              {selectedTaskIds.size > 0 && (
                <span className="ml-1 text-blue-400">
                  ({selectedTaskIds.size} selected)
                </span>
              )}
            </span>
            <button
              onClick={() => {
                if (selectedTaskIds.size === 0) return
                setConfirmOpen(true)
              }}
              disabled={selectedTaskIds.size === 0 || deleteMutation.isPending}
              className={`ml-auto rounded px-3 py-1 text-xs font-medium transition ${
                selectedTaskIds.size > 0
                  ? 'bg-red-800 text-red-200 hover:bg-red-700'
                  : 'bg-gray-800 text-gray-600'
              } disabled:opacity-40`}
            >
              {t('admin_detail.delete_tasks')}
            </button>
          </div>
          {deleteStatus === 'success' && (
            <p className="text-xs text-green-400">{t('admin_detail.delete_success')}</p>
          )}
          {deleteStatus === 'error' && (
            <p className="text-xs text-red-400">{t('admin_detail.delete_error')}</p>
          )}
          <div className="overflow-x-auto rounded border border-gray-700">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-700 bg-gray-800/50 text-gray-500">
                <tr>
                  <th className="w-8 px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 text-blue-600"
                    />
                  </th>
                  <th className="px-3 py-1.5 font-medium">
                    {t('admin_detail.table.taskId')}
                  </th>
                  <th className="px-3 py-1.5 font-medium">
                    {t('admin_detail.table.attempts')}
                  </th>
                  <th className="px-3 py-1.5 font-medium">
                    {t('admin_detail.view_graph')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {tasks?.map((row) => {
                  const isSelected = selectedTaskIds.has(row.taskId)
                  return (
                    <tr
                      key={row.taskId}
                      className={`transition ${
                        isSelected ? 'bg-blue-950/20' : 'hover:bg-gray-900/50'
                      }`}
                    >
                      <td className="w-8 px-3 py-1.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(row.taskId)}
                          className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 text-blue-600"
                        />
                      </td>
                      <td
                        className="cursor-pointer px-3 py-1.5 font-mono text-gray-200 hover:text-white"
                        onClick={() => navigate(`/admin/users/${numericId}/task/${row.taskId}`)}
                      >
                        <span className="flex items-center gap-2">
                          {row.taskId}
                          {row.solved && (
                            <span className="rounded bg-green-900/40 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
                              solved
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-gray-400">
                        {row.attemptCount}{' '}
                        {row.attemptCount === 1
                          ? t('admin_detail.attempt')
                          : t('admin_detail.attempts')}
                      </td>
                      <td className="px-3 py-1.5">
                        <button
                          onClick={() => navigate(`/admin/users/${numericId}/task/${row.taskId}`)}
                          className="rounded bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-400 transition hover:bg-gray-700 hover:text-white"
                        >
                          {t('admin_detail.view_graph')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        count={selectedTaskIds.size}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
