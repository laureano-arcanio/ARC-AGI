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
import { useActivityStats } from '../queries'

function formatHour(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function ActivityPage() {
  const { t } = useTranslation()
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())

  const { data, isLoading, error } = useActivityStats()

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
                  {et.type}
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
