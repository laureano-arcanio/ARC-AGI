import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import {
  useAttempts,
  useEvents,
  useDeleteAttempts,
} from '../queries'
import { eventsToGraphNodes, getNodeLabel } from '../utils'
import { EventGraph } from '../components/EventGraph'
import { EventDetailsPanel } from '../components/EventDetailsPanel'
import type { GraphNode } from '../../../shared/types/arc-graph'

export function AdminUserTaskDetailPage() {
  const { t } = useTranslation()
  const { isAdmin, isLoading: authLoading } = useAuth()
  const { userId, taskId } = useParams<{ userId: string; taskId: string }>()
  const numericId = Number(userId)

  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null)
  const [selectedTestPairIndex, setSelectedTestPairIndex] = useState<number | null>(null)
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [eventsAccordionOpen, setEventsAccordionOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const {
    data: attempts,
    isLoading: attemptsLoading,
  } = useAttempts(numericId, taskId ?? '', true)

  const deleteAttemptsMutation = useDeleteAttempts(numericId, taskId ?? '')

  const activeAttemptId = selectedAttemptId ?? undefined

  const {
    data: events,
    isLoading: eventsLoading,
  } = useEvents(
    numericId,
    taskId ?? '',
    activeAttemptId,
    true,
  )

  function handleExportJSONL() {
    if (!events || events.length === 0) return
    const distinctTestSet = new Set<number>()
    for (const ev of events) {
      if (ev.testPairIndex !== null && ev.testPairIndex !== undefined) distinctTestSet.add(ev.testPairIndex)
    }
    const sortedTests = [...distinctTestSet].sort((a, b) => a - b)
    const activeTest = selectedTestPairIndex ?? sortedTests[0] ?? null
    const exportEvents = activeTest !== null
      ? events.filter((ev) => ev.testPairIndex === activeTest)
      : events
    const lines = exportEvents.map((ev) => JSON.stringify(ev))
    const blob = new Blob([lines.join('\n')], { type: 'application/jsonl' })
    const url = URL.createObjectURL(blob)
    const suffix = activeTest !== null ? `_test${activeTest + 1}` : ''
    const a = document.createElement('a')
    a.href = url
    a.download = `events_${taskId}${suffix}_${selectedAttemptId ?? 'all'}.jsonl`
    a.click()
    URL.revokeObjectURL(url)
  }

  function toggleSelect(attemptId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(attemptId)) {
        next.delete(attemptId)
      } else {
        next.add(attemptId)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (!attempts) return
    if (selectedIds.size === attempts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(attempts.map((a) => a.id)))
    }
  }

  function handleDeleteAttempts() {
    deleteAttemptsMutation.mutate([...selectedIds], {
      onSuccess: () => {
        setSelectedIds(new Set())
        setSelectedAttemptId(null)
        setShowDeleteDialog(false)
      },
      onError: () => {
        setShowDeleteDialog(false)
      },
    })
  }

  if (authLoading) {
    return (
      <div className="flex items-center gap-3 text-gray-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
        {t('admin_detail.loading')}
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
        <h1 className="text-3xl font-bold">
          {t('admin_detail.graph_title')}
        </h1>
        <p className="mt-1 font-mono text-sm text-gray-400">
          {t('admin_detail.table.taskId')}: {taskId}
        </p>
      </div>

      {attemptsLoading ? (
        <div className="py-8 text-center text-gray-500">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
          {' '}{t('admin_detail.loading_events')}
        </div>
      ) : attempts && attempts.length > 0 ? (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-400">{t('admin_detail.graph_select_attempt')}</span>
            <button
              onClick={() => {
                setSelectedAttemptId(null)
                setSelectedTestPairIndex(null)
                setActiveNodeId(null)
              }}
              className={`rounded px-3 py-1 text-xs font-medium transition ${
                selectedAttemptId === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {t('admin_detail.all_events')}
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="ml-auto rounded bg-red-800 px-3 py-1 text-xs font-medium text-red-200 transition hover:bg-red-700"
              >
                {t('admin_detail.delete_attempts')} ({selectedIds.size})
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded border border-gray-700">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-700 bg-gray-800/50 text-gray-500">
                <tr>
                  <th className="w-8 px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={attempts.length > 0 && selectedIds.size === attempts.length}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 text-blue-600"
                    />
                  </th>
                  <th className="px-3 py-1.5 font-medium">{t('admin_detail.attempt')}</th>
                  <th className="px-3 py-1.5 font-medium">{t('admin_detail.attempt_status')}</th>
                  <th className="px-3 py-1.5 font-medium">{t('admin_detail.table.timestamp')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {attempts.map((attempt) => {
                  const statusBadgeColors: Record<string, string> = {
                    completed: 'bg-green-900/50 text-green-300',
                    failed: 'bg-red-900/50 text-red-300',
                    abandoned: 'bg-yellow-900/50 text-yellow-300',
                    in_progress: 'bg-gray-800 text-gray-400',
                  }
                  const statusLabelKey: Record<string, string> = {
                    completed: 'admin_detail.status_completed',
                    failed: 'admin_detail.status_failed',
                    abandoned: 'admin_detail.status_abandoned',
                    in_progress: 'admin_detail.status_in_progress',
                  }
                  const st = attempt.status ?? 'in_progress'
                  const isChecked = selectedIds.has(attempt.id)
                  const isGraphSelected = selectedAttemptId === attempt.id
                  return (
                    <tr
                      key={attempt.id}
                      className={`transition hover:bg-gray-800/50 ${
                        isGraphSelected ? 'border-l-blue-500 bg-blue-950/30' : ''
                      } ${isChecked ? 'bg-blue-950/10' : ''}`}
                    >
                      <td className="w-8 px-3 py-1.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(attempt.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 text-blue-600"
                        />
                      </td>
                      <td
                        className="cursor-pointer px-3 py-1.5 font-mono text-gray-200 transition hover:text-blue-400"
                        onClick={() => {
                          setSelectedAttemptId(attempt.id)
                          setSelectedTestPairIndex(null)
                          setActiveNodeId(null)
                        }}
                      >
                        {t('admin_detail.attempt_n', { n: attempts.indexOf(attempt) + 1 })}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadgeColors[st] ?? 'bg-gray-800 text-gray-400'}`}>
                          {t(statusLabelKey[st] ?? 'admin_detail.status_in_progress')}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-gray-400">
                        {attempt.createdAt
                          ? new Date(attempt.createdAt).toLocaleString()
                          : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {showDeleteDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-gray-200">
                  {t('admin_detail.delete_attempts_confirm_title')}
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  {t('admin_detail.delete_attempts_confirm_message', { count: selectedIds.size })}
                </p>
                {deleteAttemptsMutation.isError && (
                  <p className="mt-2 text-sm text-red-400">
                    {t('admin_detail.delete_attempts_error')}
                  </p>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setShowDeleteDialog(false)}
                    className="rounded bg-gray-800 px-4 py-1.5 text-sm font-medium text-gray-400 transition hover:bg-gray-700 hover:text-white"
                  >
                    {t('admin_detail.delete_attempts_confirm_cancel')}
                  </button>
                  <button
                    onClick={handleDeleteAttempts}
                    disabled={deleteAttemptsMutation.isPending}
                    className="rounded bg-red-800 px-4 py-1.5 text-sm font-medium text-red-200 transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteAttemptsMutation.isPending
                      ? `${t('admin_detail.delete_attempts_confirm_confirm')}...`
                      : t('admin_detail.delete_attempts_confirm_confirm')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-gray-800 p-8 text-center text-gray-500">
          {t('admin_detail.graph_no_attempts')}
        </div>
      )}

      {eventsLoading ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-8 text-center text-gray-500">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />{' '}
          {t('admin_detail.graph_loading')}
        </div>
      ) : events && events.length > 0 ? (
        <>
          {(() => {
            const distinctTests = new Set<number>()
            for (const ev of events) {
              if (ev.testPairIndex !== null && ev.testPairIndex !== undefined) distinctTests.add(ev.testPairIndex)
            }
            const testIndices = [...distinctTests].sort((a, b) => a - b)
            const activeTest = selectedTestPairIndex ?? testIndices[0] ?? null
            const filteredEvents = activeTest !== null
              ? events.filter((ev) => ev.testPairIndex === activeTest)
              : events
            const nodes: GraphNode[] = eventsToGraphNodes(filteredEvents)
            const activeNode = nodes.find((n) => n.id === activeNodeId) ?? null
            return (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400">Test:</span>
                  {testIndices.length === 0 ? (
                    <span className="text-[10px] text-gray-600 italic">no test pair data</span>
                  ) : (
                    testIndices.map((tpi) => (
                      <button
                        key={tpi}
                        onClick={() => setSelectedTestPairIndex(tpi)}
                        className={`rounded px-2.5 py-0.5 text-xs font-medium transition ${
                          activeTest === tpi
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        Test {tpi + 1}
                      </button>
                    ))
                  )}
                  <span className="text-[10px] text-gray-500">
                    {nodes.length} nodes
                  </span>
                </div>
                <EventGraph
                  nodes={nodes}
                  activeNodeId={activeNodeId}
                  onNodeClick={(nodeId) => setActiveNodeId(activeNodeId === nodeId ? null : nodeId)}
                  getLabel={getNodeLabel}
                />
                <div className="flex items-start gap-4">
                  {activeNode && (
                    <div className="w-80 shrink-0">
                      <EventDetailsPanel
                        node={activeNode}
                        onClose={() => setActiveNodeId(null)}
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-end">
                      <button
                        onClick={handleExportJSONL}
                        className="rounded bg-gray-800 px-3 py-1 text-xs font-medium text-gray-400 transition hover:bg-gray-700 hover:text-white"
                      >
                        {t('admin_detail.graph_export_jsonl')}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-700 pt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEventsAccordionOpen(!eventsAccordionOpen)}
                      className="flex flex-1 items-center justify-between rounded bg-gray-800/50 px-3 py-2 text-xs font-medium text-gray-400 transition hover:bg-gray-700 hover:text-white"
                    >
                      <span>Raw Events ({filteredEvents.length})</span>
                      <svg
                        className={`h-4 w-4 transition ${eventsAccordionOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        const text = filteredEvents.map((ev) => JSON.stringify(ev, null, 2)).join('\n\n')
                        navigator.clipboard.writeText(text)
                      }}
                      className="rounded bg-gray-800/50 px-2.5 py-2 text-gray-400 transition hover:bg-gray-700 hover:text-white"
                      title="Copy displayed events"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    </button>
                  </div>
                  {eventsAccordionOpen && (
                    <table className="mt-3 w-full text-left text-xs">
                      <thead className="border-b border-gray-700 text-gray-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">
                            {t('admin_detail.table.nodeId')}
                          </th>
                          <th className="px-3 py-2 font-medium">
                            Test
                          </th>
                          <th className="px-3 py-2 font-medium">
                            {t('admin_detail.table.timestamp')}
                          </th>
                          <th className="px-3 py-2 font-medium">
                            {t('admin_detail.table.trigger')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {filteredEvents.map((ev) => (
                          <tr
                            key={ev.id}
                            className="transition hover:bg-gray-900/50"
                          >
                            <td className="px-3 py-2 font-mono text-gray-300">
                              {ev.nodeId}
                            </td>
                            <td className="px-3 py-2 text-gray-400">
                              {ev.testPairIndex !== null && ev.testPairIndex !== undefined
                                ? ev.testPairIndex + 1
                                : '-'}
                            </td>
                            <td className="px-3 py-2 text-gray-400">
                              {ev.timestamp}
                            </td>
                            <td className="max-w-[400px] truncate px-3 py-2 font-mono text-gray-400">
                              {JSON.stringify(ev.trigger)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )
          })()}
        </>
      ) : (
        <div className="rounded-lg border border-gray-800 p-8 text-center text-gray-500">
          {t('admin_detail.graph_no_events')}
        </div>
      )}
    </div>
  )
}
