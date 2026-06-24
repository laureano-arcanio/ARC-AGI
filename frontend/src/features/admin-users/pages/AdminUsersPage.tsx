import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useUsersBatchCompletion } from '../queries'
import { useBatches, useAssignBatchToUser, useUnassignBatchFromUser } from '../../batches/queries'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { HttpClientError } from '../../../lib/http'
import type { BatchRead } from '../../batches/types'

export function AdminUsersPage() {
  const { t } = useTranslation()
  const { isAdmin, isLoading: authLoading } = useAuth()
  const { data: users, isLoading, error } = useUsers()
  const { data: batches, isLoading: batchesLoading } = useBatches()
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()
  const assignMutation = useAssignBatchToUser()
  const unassignMutation = useUnassignBatchFromUser()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  const userIds = (users ?? []).map((u) => u.id)
  const { completedByUser, inProgressByUser } = useUsersBatchCompletion(userIds)

  const getUserBatches = (userId: number): BatchRead[] =>
    (batches ?? []).filter(b => b.assignedUserIds.includes(userId))

  const isMutating = assignMutation.isPending || unassignMutation.isPending

  const resetCreateForm = () => {
    setNewEmail('')
    setNewPassword('')
    setCreateError('')
    setCreateSuccess('')
  }

  const handleCreateUser = async () => {
    if (!newEmail.trim() || !newPassword.trim()) {
      setCreateError(t('dashboard.fields_required'))
      return
    }
    if (newPassword.length < 6) {
      setCreateError(t('admin.create_error'))
      return
    }
    setCreateError('')
    setCreateSuccess('')
    try {
      await createUserMutation.mutateAsync({
        email: newEmail.trim(),
        password: newPassword,
      })
      setCreateSuccess(t('admin.create_success'))
      setNewEmail('')
      setNewPassword('')
      setShowCreateForm(false)
    } catch (err) {
      if (err instanceof HttpClientError && err.status === 409) {
        setCreateError(t('admin.email_exists'))
      } else {
        setCreateError(t('admin.create_error'))
      }
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center gap-3 text-gray-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
        {t('admin.loading')}
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
        <p className="font-semibold">{t('admin.unauthorized')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
        <p className="font-semibold">{t('admin.error')}</p>
        <p className="mt-1 text-sm">{error.message}</p>
      </div>
    )
  }

  const handleRoleChange = (id: number, role: string) => {
    updateUserMutation.mutate({ id, data: { role } })
  }

  const handleDelete = (id: number) => {
    setDeleteTarget(id)
  }

  const confirmDelete = () => {
    if (deleteTarget !== null) {
      deleteUserMutation.mutate(deleteTarget, {
        onSettled: () => setDeleteTarget(null),
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm)
            resetCreateForm()
          }}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {t('admin.create_user')}
        </button>
      </div>

      {showCreateForm && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value)
                  setCreateError('')
                }}
                placeholder={t('dashboard.email_placeholder')}
                autoComplete="off"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setCreateError('')
                }}
                placeholder={t('dashboard.password_placeholder')}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
              className="rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              {createUserMutation.isPending
                ? t('admin.creating_user')
                : t('admin.create_user_button')}
            </button>
          </div>
          {createError && (
            <p className="mt-3 text-sm text-red-400">{createError}</p>
          )}
          {createSuccess && !createError && (
            <p className="mt-3 text-sm text-green-400">{createSuccess}</p>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t('admin.table.id')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.table.email')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.table.role')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.table.batches')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.table.createdAt')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users?.map((user) => (
              <tr key={user.id} className="transition hover:bg-gray-900/50">
                <td className="px-4 py-3 text-gray-300">{user.id}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/admin/users/${user.id}`}
                    className="text-blue-400 transition hover:text-blue-300"
                  >
                    {user.email}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="admin">admin</option>
                    <option value="solver">solver</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <BatchPills
                    userBatches={getUserBatches(user.id)}
                    allBatches={batches ?? []}
                    userId={user.id}
                    onAssign={(batchId) => assignMutation.mutate({ batchId, userId: user.id })}
                    onUnassign={(batchId) => unassignMutation.mutate({ batchId, userId: user.id })}
                    completedBatchIds={completedByUser.get(user.id) ?? new Set()}
                    inProgressBatchIds={inProgressByUser.get(user.id) ?? new Set()}
                    disabled={isMutating}
                    batchesLoading={batchesLoading}
                    placeholder={t('admin.batches_placeholder')}
                  />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : '-'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="rounded bg-red-600/10 px-3 py-1 text-xs font-medium text-red-400 transition hover:bg-red-600/20"
                  >
                    {t('admin.delete')}
                  </button>
                </td>
              </tr>
            ))}
            {users?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  {t('admin.no_users')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('admin.delete_title')}
        message={t('admin.delete_message')}
        confirmLabel={t('dialog.confirm')}
        cancelLabel={t('dialog.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  )
}

type BatchPillsProps = {
  userBatches: BatchRead[]
  allBatches: BatchRead[]
  userId: number
  onAssign: (batchId: number) => void
  onUnassign: (batchId: number) => void
  completedBatchIds: Set<number>
  inProgressBatchIds: Set<number>
  disabled: boolean
  batchesLoading: boolean
  placeholder: string
}

function getBatchPillColor(batchId: number, completed: Set<number>, inProgress: Set<number>) {
  if (completed.has(batchId)) {
    return 'bg-green-600/20 text-green-400 border-green-600/30'
  }
  if (inProgress.has(batchId)) {
    return 'bg-amber-600/20 text-amber-400 border-amber-600/30'
  }
  return 'bg-gray-600/20 text-gray-400 border-gray-600/30'
}

function BatchPills({
  userBatches,
  allBatches,
  userId,
  onAssign,
  onUnassign,
  completedBatchIds,
  inProgressBatchIds,
  disabled,
  batchesLoading,
  placeholder,
}: BatchPillsProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        close()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, close])

  const unassigned = allBatches.filter(
    b => !b.assignedUserIds.includes(userId)
  )

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 200),
      })
    }
    setOpen(!open)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {batchesLoading && userBatches.length === 0 && (
        <span className="text-xs text-gray-500">...</span>
      )}
      {userBatches.map((batch) => (
        <button
          key={batch.id}
          type="button"
          disabled={disabled}
          onClick={() => onUnassign(batch.id)}
          title={batch.name}
          className={`rounded-md border px-2 py-0.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-50 ${getBatchPillColor(batch.id, completedBatchIds, inProgressBatchIds)}`}
        >
          {batch.name}
        </button>
      ))}
      {!batchesLoading && userBatches.length === 0 && (
        <span className="text-xs text-gray-500">{placeholder}</span>
      )}
      <div className="relative inline-flex">
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled || unassigned.length === 0}
          onClick={handleToggle}
          className="flex h-5 w-5 items-center justify-center rounded border border-dashed border-gray-600 text-xs text-gray-500 transition hover:border-gray-400 hover:text-gray-300 disabled:opacity-40"
        >
          +
        </button>
        {open && position && createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
            className="z-50 max-h-48 overflow-auto rounded border border-gray-700 bg-gray-900 shadow-lg"
          >
            {unassigned.map((batch) => (
              <button
                key={batch.id}
                type="button"
                onClick={() => {
                  onAssign(batch.id)
                  close()
                }}
                className="w-full cursor-pointer px-3 py-1.5 text-left text-xs text-gray-300 transition hover:bg-gray-800"
              >
                {batch.name}
              </button>
            ))}
            {unassigned.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-500">No batches available</p>
            )}
          </div>,
          document.body,
        )}
      </div>
    </div>
  )
}
