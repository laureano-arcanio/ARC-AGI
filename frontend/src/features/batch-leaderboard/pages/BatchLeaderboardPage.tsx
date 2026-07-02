import { useState } from 'react'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useBatches } from '../../batches/queries'
import { useBatchLeaderboard } from '../queries'

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs.toFixed(0)}s`
}

function formatAvg(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs.toFixed(0)}s`
}

export function BatchLeaderboardPage() {
  const { t } = useTranslation()
  const { isAdmin, isLoading: authLoading } = useAuth()
  const { data: batches, isLoading: batchesLoading } = useBatches()
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null)
  const { data: leaderboard, isLoading: leaderboardLoading } = useBatchLeaderboard(selectedBatchId)

  const selectedBatch = batches?.find((b) => b.id === selectedBatchId)

  if (authLoading) {
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Leaderboard</h1>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">Batch:</label>
        <select
          value={selectedBatchId ?? ''}
          onChange={(e) => setSelectedBatchId(e.target.value ? Number(e.target.value) : null)}
          className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="">{batchesLoading ? '...' : t('admin.batches_placeholder')}</option>
          {batches?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {selectedBatch && (
          <span className="text-xs text-gray-500">
            {selectedBatch.taskIds.length} tasks
          </span>
        )}
      </div>

      {leaderboardLoading && selectedBatchId !== null && (
        <div className="flex items-center gap-3 text-gray-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
          Loading...
        </div>
      )}

      {leaderboard && leaderboard.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Total time</th>
                <th className="px-4 py-3 font-medium">Avg time</th>
                <th className="px-4 py-3 font-medium">Total actions</th>
                <th className="px-4 py-3 font-medium">Avg actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {leaderboard.map((entry, i) => (
                <tr key={entry.userId} className="transition hover:bg-gray-900/50">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 text-gray-200">{entry.email}</td>
                  <td className="px-4 py-3 text-gray-300">{formatMs(entry.totalTimeMs)}</td>
                  <td className="px-4 py-3 font-medium text-gray-100">
                    {formatAvg(entry.avgTimeMs)}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{entry.totalActions}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {entry.avgActions.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {leaderboard && leaderboard.length === 0 && selectedBatchId !== null && (
        <p className="text-gray-500">No data for this batch.</p>
      )}
    </div>
  )
}
