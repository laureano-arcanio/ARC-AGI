import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useUsers, useUpdateUser, useDeleteUser } from '../queries'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'

export function AdminUsersPage() {
  const { t } = useTranslation()
  const { isAdmin, isLoading: authLoading } = useAuth()
  const { data: users, isLoading, error } = useUsers()
  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

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
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t('admin.table.id')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.table.email')}</th>
              <th className="px-4 py-3 font-medium">{t('admin.table.role')}</th>
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
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
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
