import { useState } from 'react'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import {
  useBatches,
  useCreateBatch,
  useDeleteBatch,
  useAssignBatchToUser,
  useUnassignBatchFromUser,
} from '../queries'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'

export function AdminBatchesPage() {
  const { t } = useTranslation()
  const { isAdmin, isLoading: authLoading } = useAuth()
  const { data: batches, isLoading, error } = useBatches()
  const createBatchMutation = useCreateBatch()
  const deleteBatchMutation = useDeleteBatch()
  const assignMutation = useAssignBatchToUser()
  const unassignMutation = useUnassignBatchFromUser()

  const [name, setName] = useState('')
  const [taskIdsInput, setTaskIdsInput] = useState('')
  const [createError, setCreateError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [assignBatchId, setAssignBatchId] = useState<number | null>(null)
  const [assignUserIdInput, setAssignUserIdInput] = useState('')
  const [expandedBatch, setExpandedBatch] = useState<number | null>(null)

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center gap-3 text-gray-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
        {t('batches.loading')}
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
        <p className="font-semibold">{t('batches.unauthorized')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
        <p className="font-semibold">{t('batches.error')}</p>
        <p className="mt-1 text-sm">{error.message}</p>
      </div>
    )
  }

  const handleCreateBatch = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setCreateError(t('batches.name_required'))
      return
    }
    const taskIds = taskIdsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (taskIds.length === 0) {
      setCreateError(t('batches.tasks_required'))
      return
    }
    setCreateError('')
    try {
      await createBatchMutation.mutateAsync({ name: trimmedName, taskIds })
      setName('')
      setTaskIdsInput('')
    } catch {
      setCreateError(t('batches.create_error'))
    }
  }

  const handleDelete = (id: number) => {
    setDeleteTarget(id)
  }

  const confirmDelete = () => {
    if (deleteTarget !== null) {
      deleteBatchMutation.mutate(deleteTarget, {
        onSettled: () => setDeleteTarget(null),
      })
    }
  }

  const handleAssign = (batchId: number) => {
    const userId = parseInt(assignUserIdInput, 10)
    if (!userId) return
    assignMutation.mutate(
      { batchId, userId },
      { onSuccess: () => setAssignUserIdInput('') },
    )
  }

  const handleUnassign = (batchId: number, userId: number) => {
    unassignMutation.mutate({ batchId, userId })
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">{t('batches.title')}</h1>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">{t('batches.create_title')}</h2>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setCreateError('')
            }}
            placeholder={t('batches.name_placeholder')}
            className="rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <textarea
            value={taskIdsInput}
            onChange={(e) => {
              setTaskIdsInput(e.target.value)
              setCreateError('')
            }}
            placeholder={t('batches.task_ids_placeholder')}
            rows={3}
            className="rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          {createError && (
            <p className="text-sm text-red-400">{createError}</p>
          )}
          <button
            onClick={handleCreateBatch}
            disabled={createBatchMutation.isPending}
            className="self-start rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {createBatchMutation.isPending
              ? t('batches.creating')
              : t('batches.create')}
          </button>
        </div>
      </div>

      {batches?.length === 0 && (
        <p className="text-center text-gray-500">{t('batches.no_batches')}</p>
      )}

      <div className="flex flex-col gap-4">
        {batches?.map((batch) => (
          <div
            key={batch.id}
            className="rounded-lg border border-gray-800 bg-gray-900"
          >
            <div className="flex items-center justify-between p-4">
              <button
                className="flex items-center gap-2 text-left"
                onClick={() =>
                  setExpandedBatch(
                    expandedBatch === batch.id ? null : batch.id,
                  )
                }
              >
                <span className="text-sm text-gray-500">
                  {expandedBatch === batch.id ? '▾' : '▸'}
                </span>
                <div>
                  <h3 className="font-semibold text-white">{batch.name}</h3>
                  <p className="text-xs text-gray-500">
                    {batch.taskIds.length} {t('batches.tasks_count')}
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleDelete(batch.id)}
                className="rounded bg-red-600/10 px-3 py-1 text-xs font-medium text-red-400 transition hover:bg-red-600/20"
              >
                {t('batches.delete')}
              </button>
            </div>

            {expandedBatch === batch.id && (
              <div className="border-t border-gray-800 p-4">
                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-medium text-gray-400">
                    {t('batches.task_ids_label')}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {batch.taskIds.map((tid) => (
                      <span
                        key={tid}
                        className="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-gray-300"
                      >
                        {tid}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-medium text-gray-400">
                    {t('batches.assign_user')}
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={
                        assignBatchId === batch.id ? assignUserIdInput : ''
                      }
                      onChange={(e) => setAssignUserIdInput(e.target.value)}
                      onFocus={() => setAssignBatchId(batch.id)}
                      placeholder={t('batches.user_id_placeholder')}
                      className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleAssign(batch.id)}
                      disabled={!assignUserIdInput.trim() || assignMutation.isPending}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {t('batches.assign')}
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-medium text-gray-400">
                    {t('batches.assigned_users')}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {batch.assignedUserIds.length === 0 ? (
                      <span className="text-xs text-gray-600">
                        {t('batches.no_users_assigned')}
                      </span>
                    ) : (
                      batch.assignedUserIds.map((uid) => (
                        <span
                          key={uid}
                          className="inline-flex items-center gap-1 rounded bg-gray-800 px-2 py-1 text-xs text-gray-300"
                        >
                          #{uid}
                          <button
                            onClick={() => handleUnassign(batch.id, uid)}
                            className="ml-1 text-red-400 hover:text-red-300"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('batches.delete_title')}
        message={t('batches.delete_message')}
        confirmLabel={t('dialog.confirm')}
        cancelLabel={t('dialog.cancel')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  )
}
