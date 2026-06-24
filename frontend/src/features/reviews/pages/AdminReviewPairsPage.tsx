import { useState } from 'react'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useUsers } from '../../admin-users/queries'
import {
  useReviewPairs,
  useCreateReviewPair,
  useDeleteReviewPair,
} from '../queries'

export function AdminReviewPairsPage() {
  const { t } = useTranslation()
  const { isAdmin, isLoading: authLoading } = useAuth()

  const [solverAId, setSolverAId] = useState<number | ''>('')
  const [solverBId, setSolverBId] = useState<number | ''>('')
  const [error, setError] = useState('')

  const { data: pairs, isLoading } = useReviewPairs()
  const { data: users } = useUsers()
  const createMutation = useCreateReviewPair()
  const deleteMutation = useDeleteReviewPair()

  const userMap = new Map(
    (users ?? []).map((u) => [u.id, u.email]),
  )

  const solvers = (users ?? []).filter((u) => u.role !== 'admin')

  async function handleCreate() {
    if (solverAId === '' || solverBId === '') {
      setError(t('review_pairs.invalid_ids'))
      return
    }
    if (solverAId === solverBId) {
      setError(t('review_pairs.same_user'))
      return
    }
    setError('')
    try {
      await createMutation.mutateAsync({ solverAId, solverBId })
      setSolverAId('')
      setSolverBId('')
    } catch {
      setError(t('review_pairs.create_error'))
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center gap-3 text-gray-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
        {t('review_pairs.loading')}
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
        <p className="font-semibold">{t('review_pairs.unauthorized')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">{t('review_pairs.title')}</h1>
        <p className="mt-1 text-sm text-gray-400">
          {t('review_pairs.subtitle')}
        </p>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-300">
          {t('review_pairs.create_pair')}
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[10px] text-gray-500">
              {t('review_pairs.solver_a')}
            </label>
            <select
              value={solverAId}
              onChange={(e) => setSolverAId(Number(e.target.value) || '')}
              className="w-52 rounded border border-gray-700 bg-gray-950 px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">{t('review_pairs.select_user')}</option>
              {solvers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-gray-500">
              {t('review_pairs.solver_b')}
            </label>
            <select
              value={solverBId}
              onChange={(e) => setSolverBId(Number(e.target.value) || '')}
              className="w-52 rounded border border-gray-700 bg-gray-950 px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">{t('review_pairs.select_user')}</option>
              {solvers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending
              ? t('review_pairs.creating')
              : t('review_pairs.create')}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-400">
          {t('review_pairs.existing_pairs')} ({pairs?.length ?? 0})
        </h2>
        {pairs && pairs.length > 0 ? (
          <div className="overflow-x-auto rounded border border-gray-700">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-700 bg-gray-800/50 text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">ID</th>
                  <th className="px-3 py-2 font-medium">
                    {t('review_pairs.solver_a')}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t('review_pairs.solver_b')}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t('review_pairs.created')}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t('review_pairs.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {pairs.map((pair) => (
                  <tr key={pair.id} className="hover:bg-gray-900/50">
                    <td className="px-3 py-2 text-gray-400">{pair.id}</td>
                    <td className="px-3 py-2 text-gray-200">
                      {userMap.get(pair.solverAId) ?? pair.solverAId}
                    </td>
                    <td className="px-3 py-2 text-gray-200">
                      {userMap.get(pair.solverBId) ?? pair.solverBId}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {pair.createdAt
                        ? new Date(pair.createdAt).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => deleteMutation.mutate(pair.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded bg-red-800/50 px-2 py-0.5 text-[10px] text-red-300 transition hover:bg-red-700 disabled:opacity-50"
                      >
                        {t('review_pairs.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">{t('review_pairs.no_pairs')}</p>
        )}
      </div>
    </div>
  )
}
