import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from '../../../lib/i18n'
import { useActivityBatchBreakdown, useActivityStats } from '../queries'
import type { ActivityBatchBreakdown, TaskSolveStats } from '../types'

function formatHour(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}m ${sec.toFixed(0)}s`
}

export function ActivityPage() {
  const { t } = useTranslation()
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())

  const activeFilters = selectedTypes.size > 0 ? Array.from(selectedTypes) : undefined
  const { data, isLoading, error } = useActivityStats(activeFilters)
  const { data: breakdown, isLoading: breakdownLoading } = useActivityBatchBreakdown()

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        {t('activity.loading')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 text-red-400">
        {t('activity.error')}
      </div>
    )
  }

  if (!data) return null

  const hasFilterActive = selectedTypes.size > 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('activity.title')}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t('activity.last_event')}
          value={
            data.lastEventTimestamp
              ? new Date(data.lastEventTimestamp).toLocaleString()
              : t('activity.no_events')
          }
        />
        <StatCard
          label={t('activity.active_users')}
          value={String(data.activeUsers)}
        />
        <StatCard
          label={t('activity.total_events')}
          value={String(data.totalEvents)}
        />
      </div>

      {data.eventTypeSummary.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-gray-400">
            {t('activity.filter_types')}
          </p>
          <div className="flex flex-wrap gap-2">
            {data.eventTypeSummary.map((et) => {
              const active = selectedTypes.has(et.type)
              return (
                <button
                  key={et.type}
                  type="button"
                  onClick={() => toggleType(et.type)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    active
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  {t(`activity.event_type.${et.type}`)}
                  <span className="ml-1.5 opacity-60">{et.count}</span>
                </button>
              )
            })}
            {hasFilterActive && (
              <button
                type="button"
                onClick={() => setSelectedTypes(new Set())}
                className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-500 transition hover:border-gray-600 hover:text-gray-400"
              >
                {t('activity.clear_filter')}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
        {data.timeline.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            {t('activity.no_chart_data')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="bucket"
                stroke="#9CA3AF"
                tickFormatter={formatHour}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#D1D5DB',
                }}
                content={(props) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const { active, payload } = props as any
                  if (!active || !payload?.length) return null
                  const row = payload[0].payload
                  return (
                    <div
                      style={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        color: '#D1D5DB',
                      }}
                    >
                      <p>{formatHour(row.bucket)}</p>
                      <p className="text-amber-400">{row.count} {t('activity.events')}</p>
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#F59E0B' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <BatchBreakdownSection
        breakdown={breakdown ?? null}
        isLoading={breakdownLoading}
      />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-gray-100">
        {value}
      </p>
    </div>
  )
}

function SolveTimeTable({
  batchName,
  tasks,
}: {
  batchName: string
  tasks: TaskSolveStats[]
}) {
  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold text-gray-200">{batchName}</h3>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Task</th>
              <th className="px-4 py-3 font-medium">Solved</th>
              <th className="px-4 py-3 font-medium">Avg</th>
              <th className="px-4 py-3 font-medium">Min</th>
              <th className="px-4 py-3 font-medium">Max</th>
              <th className="px-4 py-3 font-medium">P95</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {tasks.map((t) => (
              <tr key={t.taskId} className="transition hover:bg-gray-900/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-300">
                  {t.taskId}
                </td>
                <td className="px-4 py-3 text-gray-200">{t.completedCount}</td>
                <td className="px-4 py-3 text-gray-100">
                  {formatMs(t.avgTimeMs)}
                </td>
                <td className="px-4 py-3 text-gray-100">
                  {formatMs(t.minTimeMs)}
                </td>
                <td className="px-4 py-3 text-gray-100">
                  {formatMs(t.maxTimeMs)}
                </td>
                <td className="px-4 py-3 text-gray-100">
                  {formatMs(t.p95TimeMs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BatchBreakdownSection({
  breakdown,
  isLoading,
}: {
  breakdown: ActivityBatchBreakdown | null
  isLoading: boolean
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-100">Batch Breakdown</h2>
      {isLoading && (
        <div className="flex items-center gap-3 text-gray-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
          Loading...
        </div>
      )}
      {!isLoading && !breakdown && (
        <p className="text-gray-500">No data available.</p>
      )}
      {!isLoading && breakdown && breakdown.batches.length === 0 && (
        <p className="text-gray-500">No batches found.</p>
      )}
      {breakdown?.batches.map((b) => (
        <SolveTimeTable
          key={b.batchId}
          batchName={b.batchName}
          tasks={b.tasks}
        />
      ))}
    </div>
  )
}
