import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useAllBatchLeaderboards } from '../queries'
import type { LeaderboardEntry } from '../types'

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

function rankLabel(i: number): string {
  if (i === 0) return '🥇'
  if (i === 1) return '🥈'
  if (i === 2) return '🥉'
  return `${i + 1}`
}

function LeaderboardTable({
  batchName,
  entries,
  isLoading,
}: {
  batchName: string
  entries: LeaderboardEntry[] | undefined
  isLoading: boolean
}) {
  return (
    <div>
      <h2 className="mb-3 text-xl font-semibold text-gray-100">{batchName}</h2>
      {isLoading && (
        <div className="flex items-center gap-3 text-gray-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
          Loading...
        </div>
      )}
      {entries && entries.length === 0 && (
        <p className="text-gray-500">No data for this batch.</p>
      )}
      {entries && entries.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Completed</th>
                <th className="px-4 py-3 font-medium">Abandoned</th>
                <th className="px-4 py-3 font-medium">Incomplete</th>
                <th className="px-4 py-3 font-medium">Not started</th>
                <th className="px-4 py-3 font-medium">Total time</th>
                <th className="px-4 py-3 font-medium">Avg time</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {entries.map((entry, i) => (
                <tr key={entry.userId} className="transition hover:bg-gray-900/50">
                  <td className="px-4 py-3 text-gray-500">{rankLabel(i)}</td>
                  <td className="px-4 py-3 text-gray-200">{entry.email}</td>
                  <td className="px-4 py-3 text-green-400">
                    {entry.completedTasks}/{entry.totalTasks}
                  </td>
                  <td className="px-4 py-3 text-yellow-400">
                    {entry.abandonedTasks}
                  </td>
                  <td className="px-4 py-3 text-orange-400">
                    {entry.incompleteTasks}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {entry.notStartedTasks}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatMs(entry.totalTimeMs)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-100">
                    {formatAvg(entry.avgTimeMs)}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {entry.totalActions}
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

export function BatchLeaderboardPage() {
  const { t } = useTranslation()
  const { isAdmin, isLoading: authLoading } = useAuth()
  const { batches, batchesLoading, leaderboards } = useAllBatchLeaderboards()

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

  if (batchesLoading) {
    return (
      <div className="flex items-center gap-3 text-gray-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
        Loading...
      </div>
    )
  }

  if (batches.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-gray-500">No batches found.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-3xl font-bold">Leaderboard</h1>
      {batches.map((batch, index) => (
        <LeaderboardTable
          key={batch.id}
          batchName={batch.name}
          entries={leaderboards[index]?.data}
          isLoading={leaderboards[index]?.isLoading ?? false}
        />
      ))}
    </div>
  )
}
