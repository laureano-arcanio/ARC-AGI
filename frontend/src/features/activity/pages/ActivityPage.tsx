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
import { downloadDataset } from '../api'
import { useActivityBatchBreakdown, useActivityStats, useActivitySummary, useActivityUserReviewStats } from '../queries'
import type { ActivitySummary, TimeWindowHours, UserReviewStats } from '../types'
import { TIME_WINDOW_OPTIONS } from '../types'

function formatHour(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(totalSeconds: number) {
  if (!totalSeconds) return '0s'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.round(totalSeconds % 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`}`
  return `${seconds}s`
}

export function ActivityPage() {
  const { t } = useTranslation()
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [hours, setHours] = useState<TimeWindowHours>(24)

  const activeFilters = selectedTypes.size > 0 ? Array.from(selectedTypes) : undefined
  const { data, isLoading, error } = useActivityStats(activeFilters, hours)
  const { data: breakdown } = useActivityBatchBreakdown()
  const { data: summary } = useActivitySummary()
  const { data: reviewStats } = useActivityUserReviewStats()

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('activity.title')}</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => downloadDataset()}
            className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20"
          >
            {t('activity.export_dataset')}
          </button>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">{t('activity.time_window')}</label>
            <select
              value={hours}
              onChange={(e) => {
                setHours(Number(e.target.value) as TimeWindowHours)
                setSelectedTypes(new Set())
              }}
              className="appearance-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 transition hover:border-gray-600 focus:border-amber-500 focus:outline-none"
            >
              {TIME_WINDOW_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}h
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
          label={t('activity.total_events', { hours })}
          value={String(data.totalEvents)}
        />
      </div>

      {data.activeUserEmails.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <p className="mb-2 text-xs font-medium text-gray-400">
            {t('activity.active_users_list')}
          </p>
          <div className="flex flex-wrap gap-2">
            {data.activeUserEmails.map((email) => (
              <span
                key={email}
                className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-300"
              >
                {email}
              </span>
            ))}
          </div>
        </div>
      )}

      {breakdown && breakdown.batches.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-xs text-gray-500">{t('activity.total_unique_tasks')}</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">
              {breakdown.totalUniqueTasks}
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-xs text-gray-500">{t('activity.total_solved')}</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">
              {breakdown.totalSolvedTasks}
            </p>
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-xs text-gray-500">{t('activity.total_to_review')}</p>
            <p className="mt-1 text-2xl font-bold text-blue-400">
              {summary.totalToReview}
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-xs text-gray-500">{t('activity.pending_user_reviews')}</p>
            <p className="mt-1 text-2xl font-bold text-purple-400">
              {summary.pendingUserReviews}
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-xs text-gray-500">{t('activity.total_done')}</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">
              {summary.totalDone}
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-xs text-gray-500">{t('activity.failed_reviews')}</p>
            <p className="mt-1 text-2xl font-bold text-red-400">
              {summary.failedReviews}
            </p>
          </div>
        </div>
      )}

      <SummarySection summary={summary ?? null} />

      <ReviewStatsSection reviewStats={reviewStats ?? []} />

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
    </div>
  )
}

function SummarySection({ summary }: { summary: ActivitySummary | null }) {
  const { t } = useTranslation()
  if (!summary) return null
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
      <h2 className="mb-3 text-lg font-semibold text-gray-100">
        {t('activity.summary_title')}
      </h2>
      <div className="mb-3">
        <span className="text-xs text-gray-500">{t('activity.total_tasks_resolved')}: </span>
        <span className="text-xl font-bold text-amber-400">{summary.totalUniqueTasksResolved}</span>
      </div>
      {summary.userOverlap.length > 0 && (
        <div>
          <div className="mb-2">
            <p className="text-xs font-medium text-gray-400">{t('activity.user_overlap')}</p>
            <p className="text-sm text-gray-300">
              {t('activity.total_tasks_resolved')}: {summary.userOverlap.reduce((s, b) => s + b.taskCount, 0)}
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('activity.overlap_count')}</th>
                  <th className="px-4 py-3 font-medium">{t('activity.task_count')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {summary.userOverlap.map((bucket) => (
                  <tr key={bucket.overlapCount} className="transition hover:bg-gray-900/50">
                    <td className="px-4 py-3 text-gray-200">{bucket.overlapCount}</td>
                    <td className="px-4 py-3 text-gray-200">{bucket.taskCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewStatsSection({ reviewStats }: { reviewStats: UserReviewStats[] }) {
  const { t } = useTranslation()
  if (reviewStats.length === 0) return null
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
      <h2 className="mb-3 text-lg font-semibold text-gray-100">
        {t('activity.review_stats_title')}
      </h2>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 bg-gray-900 text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t('activity.review_user')}</th>
              <th className="px-4 py-3 font-medium">{t('activity.review_count')}</th>
              <th className="px-4 py-3 font-medium">{t('activity.review_total')}</th>
              <th className="px-4 py-3 font-medium">{t('activity.review_avg')}</th>
              <th className="px-4 py-3 font-medium">{t('activity.review_min')}</th>
              <th className="px-4 py-3 font-medium">{t('activity.review_max')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {reviewStats.map((stat) => (
              <tr key={stat.userId} className="transition hover:bg-gray-900/50">
                <td className="px-4 py-3 text-gray-200">{stat.email || `#${stat.userId}`}</td>
                <td className="px-4 py-3 text-gray-200">{stat.reviewedCount}</td>
                <td className="px-4 py-3 text-gray-200">{formatDuration(stat.totalSeconds)}</td>
                <td className="px-4 py-3 text-gray-200">{formatDuration(Math.round(stat.avgSeconds))}</td>
                <td className="px-4 py-3 text-gray-200">{formatDuration(stat.minSeconds)}</td>
                <td className="px-4 py-3 text-gray-200">{formatDuration(stat.maxSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
