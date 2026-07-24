import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, ClipboardCopy } from 'lucide-react'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useTaskSolvers } from '../../admin-task-search/queries'
import { useTaskById } from '../../arc-lab/queries'
import { getAttempts, getEvents } from '../../admin-user-detail/api'
import { eventsToGraphNodes, synthesizeGraphNodes, getNodeLabel, formatDelta } from '../../admin-user-detail/utils'
import { EventGraph } from '../../admin-user-detail/components/EventGraph'
import { EventDetailsPanel } from '../../admin-user-detail/components/EventDetailsPanel'
import { useQuery } from '@tanstack/react-query'
import { COLOR_MAP } from '../../../shared/types/arc-graph'
import type { GraphNode } from '../../../shared/types/arc-graph'
import type { TaskPair } from '../../arc-lab/types'

function RenderGrid({ grid, label }: { grid: number[][]; label: string }) {
  if (!grid.length || !grid[0]?.length) return null
  const cellSize = Math.max(6, Math.min(20, 180 / Math.max(grid.length, grid[0]?.length ?? 1)))
  return (
    <div>
      <p className="mb-1 text-[10px] text-gray-500">{label} ({grid.length}x{grid[0].length})</p>
      <div className="inline-block rounded border border-gray-700 overflow-hidden">
        {grid.map((row, ri) => (
          <div key={ri} className="flex">
            {row.map((cell, ci) => (
              <div
                key={ci}
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  backgroundColor: COLOR_MAP[cell] ?? '#555',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function RenderTaskPair({ pair, index, type }: { pair: TaskPair; index: number; type: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-gray-300">{type} {index + 1}</p>
      <div className="flex items-start gap-3">
        <RenderGrid grid={pair.input} label="Input" />
        {pair.output.length > 0 && (
          <>
            <ChevronRight size={16} className="mt-5 text-gray-600" />
            <RenderGrid grid={pair.output} label="Output" />
          </>
        )}
      </div>
    </div>
  )
}

function SolverSection({ userId, email, taskId }: { userId: number; email: string; taskId: string }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(true)
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null)
  const [selectedTestPairIndex, setSelectedTestPairIndex] = useState<number | null>(null)
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [eventsAccordionOpen, setEventsAccordionOpen] = useState(false)

  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['task-solutions', 'attempts', userId, taskId],
    queryFn: () => getAttempts(userId, taskId),
    enabled: expanded,
  })

  const activeAttempt = selectedAttemptId ?? (attempts && attempts.length > 0 ? attempts[0].id : null)

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['task-solutions', 'events', userId, taskId, activeAttempt],
    queryFn: () => getEvents(userId, taskId, activeAttempt ?? undefined),
    enabled: expanded && activeAttempt !== null,
  })

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

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-gray-800/50"
      >
        <ChevronDown
          size={16}
          className={`text-gray-500 transition ${expanded ? 'rotate-0' : '-rotate-90'}`}
        />
        <div className="flex flex-1 items-center gap-3">
          <Link
            to={`/admin/users/${userId}/task/${taskId}`}
            className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {email}
          </Link>
          {attempts && (
            <span className="text-xs text-gray-500">
              {attempts.length} {t('admin_detail.attempts')}
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 px-4 py-3">
          {attemptsLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
              {t('task_search.loading_solver')}
            </div>
          ) : attempts && attempts.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto rounded border border-gray-700">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-700 bg-gray-800/50 text-gray-500">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">{t('admin_detail.attempt')}</th>
                      <th className="px-3 py-1.5 font-medium">{t('admin_detail.attempt_status')}</th>
                      <th className="px-3 py-1.5 font-medium">{t('admin_detail.table.timestamp')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {attempts.map((attempt, idx) => {
                      const st = attempt.status ?? 'in_progress'
                      return (
                        <tr
                          key={attempt.id}
                          className={`transition hover:bg-gray-800/50 cursor-pointer ${
                            selectedAttemptId === attempt.id ? 'border-l-blue-500 bg-blue-950/30' : ''
                          }`}
                          onClick={() => {
                            setSelectedAttemptId(attempt.id)
                            setSelectedTestPairIndex(null)
                            setActiveNodeId(null)
                          }}
                        >
                          <td className="px-3 py-1.5 font-mono text-gray-200">
                            {t('admin_detail.attempt_n', { n: idx + 1 })}
                          </td>
                          <td className="px-3 py-1.5">
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadgeColors[st] ?? 'bg-gray-800 text-gray-400'}`}>
                              {t(statusLabelKey[st] ?? 'admin_detail.status_in_progress')}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-gray-400">
                            {attempt.createdAt ? new Date(attempt.createdAt).toLocaleString() : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {eventsLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
                  {t('task_search.loading_events')}
                </div>
              ) : events && events.length > 0 ? (
                (() => {
                  const distinctTests = new Set<number>()
                  for (const ev of events) {
                    if (ev.testPairIndex !== null && ev.testPairIndex !== undefined) distinctTests.add(ev.testPairIndex)
                  }
                  const testIndices = [...distinctTests].sort((a, b) => a - b)
                  const activeTest = selectedTestPairIndex ?? testIndices[0] ?? null
                  const filteredEvents = activeTest !== null
                    ? events.filter((ev) => ev.testPairIndex === activeTest)
                    : events
                  const nodes: GraphNode[] = synthesizeGraphNodes(eventsToGraphNodes(filteredEvents))
                  const activeNode = nodes.find((n) => n.id === activeNodeId) ?? null

                  const firstEvent = filteredEvents[0]
                  const lastEvent = filteredEvents[filteredEvents.length - 1]
                  const totalTime = firstEvent && lastEvent ? lastEvent.timestamp - firstEvent.timestamp : 0
                  const firstCognitive = filteredEvents.find(
                    (ev) => (ev.trigger as { kind?: string }).kind === 'cognitive',
                  )
                  const timeToFirstAction = firstCognitive && firstEvent
                    ? firstCognitive.timestamp - firstEvent.timestamp
                    : null

                  return (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400">{t('admin_detail.graph_select_attempt')}:</span>
                        {testIndices.length === 0 ? (
                          <span className="text-[10px] text-gray-600 italic">{t('admin_detail.graph_no_events')}</span>
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
                              {t('timeline.test')} {tpi + 1}
                            </button>
                          ))
                        )}
                        <span className="text-[10px] text-gray-500">
                          {nodes.length} {t('admin_detail.graph_node_label')}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="rounded border border-gray-700 bg-gray-900/50 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-wider text-gray-500">
                            {t('admin_detail.stats_time_to_first_action')}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-gray-200">
                            {timeToFirstAction !== null ? formatDelta(timeToFirstAction) : '-'}
                          </p>
                        </div>
                        <div className="rounded border border-gray-700 bg-gray-900/50 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-wider text-gray-500">
                            {t('admin_detail.stats_total_time')}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-gray-200">
                            {formatDelta(totalTime)}
                          </p>
                        </div>
                        <div className="rounded border border-gray-700 bg-gray-900/50 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-wider text-gray-500">
                            {t('admin_detail.stats_total_actions')}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-gray-200">
                            {filteredEvents.length}
                          </p>
                        </div>
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
                      </div>

                      <div className="border-t border-gray-700 pt-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEventsAccordionOpen(!eventsAccordionOpen)}
                            className="flex flex-1 items-center justify-between rounded bg-gray-800/50 px-3 py-2 text-xs font-medium text-gray-400 transition hover:bg-gray-700 hover:text-white"
                          >
                            <span>{t('admin_detail.graph_details')} ({filteredEvents.length})</span>
                            <ChevronDown size={16} className={`transition ${eventsAccordionOpen ? 'rotate-180' : ''}`} />
                          </button>
                          <button
                            onClick={() => {
                              const text = filteredEvents.map((ev) => JSON.stringify(ev, null, 2)).join('\n\n')
                              navigator.clipboard.writeText(text)
                            }}
                            className="rounded bg-gray-800/50 px-2.5 py-2 text-gray-400 transition hover:bg-gray-700 hover:text-white"
                            title="Copy displayed events"
                          >
                            <ClipboardCopy size={14} />
                          </button>
                        </div>
                        {eventsAccordionOpen && (
                          <table className="mt-3 w-full text-left text-xs">
                            <thead className="border-b border-gray-700 text-gray-500">
                              <tr>
                                <th className="px-3 py-2 font-medium">{t('admin_detail.table.nodeId')}</th>
                                <th className="px-3 py-2 font-medium">{t('timeline.test')}</th>
                                <th className="px-3 py-2 font-medium">{t('admin_detail.table.timestamp')}</th>
                                <th className="px-3 py-2 font-medium">{t('admin_detail.table.delta_t')}</th>
                                <th className="px-3 py-2 font-medium">{t('admin_detail.table.trigger')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                              {filteredEvents.map((ev, idx) => (
                                <tr key={ev.id} className="transition hover:bg-gray-900/50">
                                  <td className="px-3 py-2 font-mono text-gray-300">{ev.nodeId}</td>
                                  <td className="px-3 py-2 text-gray-400">
                                    {ev.testPairIndex !== null && ev.testPairIndex !== undefined
                                      ? ev.testPairIndex + 1 : '-'}
                                  </td>
                                  <td className="px-3 py-2 text-gray-400">
                                    {new Date(ev.timestamp).toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2 font-mono text-gray-400">
                                    {idx === 0 ? '0ms' : formatDelta(ev.timestamp - filteredEvents[idx - 1].timestamp)}
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
                })()
              ) : activeAttempt !== null ? (
                <p className="py-3 text-center text-xs text-gray-500">{t('admin_detail.graph_no_events')}</p>
              ) : null}
            </div>
          ) : (
            <p className="py-3 text-center text-xs text-gray-500">{t('admin_detail.graph_no_attempts')}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function TaskSolutionsPage() {
  const { t } = useTranslation()
  const { isAdmin, isLoading: authLoading } = useAuth()
  const { taskId } = useParams<{ taskId: string }>()

  const { data: solvers, isLoading: solversLoading } = useTaskSolvers(taskId ?? '')
  const { data: task } = useTaskById(taskId ?? '')

  if (authLoading || solversLoading) {
    return (
      <div className="flex items-center gap-3 text-gray-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
        {t('task_search.loading')}
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
        <p className="font-semibold">{t('task_search.unauthorized')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          to="/admin/task-search"
          className="text-sm text-gray-400 transition hover:text-white"
        >
          &larr; {t('task_search.back_to_search')}
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{t('task_search.solutions_title')}</h1>
        <p className="mt-1 font-mono text-sm text-gray-400">
          {t('admin_detail.table.taskId')}: {taskId}
        </p>
        {solvers && (
          <p className="mt-1 text-sm text-gray-500">
            {solvers.length} {t('task_search.solvers_count')}
          </p>
        )}
      </div>

      {task && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-300">{t('task_search.task_preview')}</h3>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-6">
              {task.train.map((pair, i) => (
                <RenderTaskPair key={i} pair={pair} index={i} type="Train" />
              ))}
            </div>
            {task.test.length > 0 && (
              <div className="flex flex-wrap gap-6">
                {task.test.map((pair, i) => (
                  <RenderTaskPair key={i} pair={pair} index={i} type="Test" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {solvers && solvers.length > 0 ? (
        <div className="flex flex-col gap-3">
          {solvers.map((solver) => (
            <SolverSection
              key={solver.userId}
              userId={solver.userId}
              email={solver.email}
              taskId={taskId ?? ''}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 p-8 text-center text-gray-500">
          {t('task_search.no_solvers')}
        </div>
      )}
    </div>
  )
}
