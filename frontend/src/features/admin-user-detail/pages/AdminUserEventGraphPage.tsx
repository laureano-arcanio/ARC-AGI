import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useUserDetail, useAttempts, useEvents } from '../queries'
import { eventsToGraphNodes, getNodeLabel } from '../utils'
import { EventGraph } from '../components/EventGraph'
import { EventDetailsPanel } from '../components/EventDetailsPanel'
import type { GraphNode } from '../../../shared/types/arc-graph'

export function AdminUserEventGraphPage() {
  const { t } = useTranslation()
  const { isAdmin, isLoading: authLoading } = useAuth()
  const { userId, taskId } = useParams<{ userId: string; taskId: string }>()
  const numericId = Number(userId)

  const { data: user, isLoading: userLoading } = useUserDetail(numericId)
  const { data: attempts, isLoading: attemptsLoading } = useAttempts(
    numericId,
    taskId ?? '',
    !!taskId,
  )

  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null)

  const { data: events, isLoading: eventsLoading } = useEvents(
    numericId,
    taskId ?? '',
    selectedAttemptId ?? undefined,
    !!taskId,
  )

  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)

  if (authLoading || userLoading || attemptsLoading) {
    return (
      <div className="flex items-center gap-3 text-gray-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
        {t('admin_detail.graph_loading')}
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

  const nodes: GraphNode[] = events ? eventsToGraphNodes(events) : []
  const activeNode = nodes.find((n) => n.id === activeNodeId) ?? null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          to={`/admin/users/${numericId}`}
          className="text-sm text-gray-400 transition hover:text-white"
        >
          &larr; {t('admin_detail.graph_back')}
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{t('admin_detail.graph_title')}</h1>
        {user && (
          <p className="mt-1 text-sm text-gray-400">
            {user.email} &mdash; <span className="font-mono">{taskId}</span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-400">{t('admin_detail.graph_select_attempt')}</span>
        {(attempts ?? []).map((attempt, idx) => (
          <button
            key={attempt.id}
            onClick={() => {
              setSelectedAttemptId(attempt.id)
              setActiveNodeId(null)
            }}
            className={`rounded px-3 py-1 text-xs font-medium transition ${
              selectedAttemptId === attempt.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {t('admin_detail.attempt_n', { n: idx + 1 })}
          </button>
        ))}
      </div>

      {eventsLoading ? (
        <div className="flex items-center justify-center rounded-lg border border-gray-800 bg-gray-900/50 px-6 py-16">
          <div className="flex items-center gap-3 text-gray-400">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
            {t('admin_detail.graph_loading')}
          </div>
        </div>
      ) : selectedAttemptId === null ? (
        <div className="flex items-center justify-center rounded-lg border border-gray-800 bg-gray-900/50 px-6 py-16">
          <p className="text-gray-500">{t('admin_detail.graph_select_attempt')}</p>
        </div>
      ) : nodes.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-gray-800 bg-gray-900/50 px-6 py-16">
          <p className="text-gray-500">{t('admin_detail.graph_no_events')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <EventGraph
              nodes={nodes}
              activeNodeId={activeNodeId}
              onNodeClick={(nodeId) => setActiveNodeId(activeNodeId === nodeId ? null : nodeId)}
              getLabel={getNodeLabel}
            />
          </div>
          {activeNode && (
            <div className="xl:col-span-1">
              <EventDetailsPanel
                node={activeNode}
                onClose={() => setActiveNodeId(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
