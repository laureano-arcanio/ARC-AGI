import { useQueries } from '@tanstack/react-query'
import { getEvents } from '../../admin-user-detail/api'

type HypoInfo = {
  initial: string | null
  revisions: string[]
  final: string | null
  correctSubmission: boolean
}

function extractHypotheses(events: Record<string, unknown>[]): Map<number, HypoInfo> {
  const map = new Map<number, HypoInfo>()

  for (const ev of events) {
    const trigger = ev.trigger as Record<string, unknown> | undefined
    if (!trigger || trigger.kind !== 'cognitive') continue

    const intent = trigger.intent as string | undefined
    if (!intent || !['initial_hypothesis', 'hypothesis_revision', 'hypothesis_finalized'].includes(intent)) continue

    const tpi = (ev.testPairIndex ?? 0) as number
    const text = (trigger.text as string) ?? '(empty)'

    const existing = map.get(tpi) ?? { initial: null, revisions: [], final: null, correctSubmission: false }

    if (intent === 'initial_hypothesis') {
      existing.initial = text
    } else if (intent === 'hypothesis_revision') {
      existing.revisions.push(text)
    } else if (intent === 'hypothesis_finalized') {
      existing.final = text
    }

    map.set(tpi, existing)
  }

  for (const ev of events) {
    const trigger = ev.trigger as Record<string, unknown> | undefined
    if (!trigger || trigger.kind !== 'mechanical') continue
    if (trigger.action !== 'submit') continue

    const details = trigger.details as Record<string, unknown> | undefined
    if (!details || details.correct !== true) continue

    const tpi = (ev.testPairIndex ?? 0) as number
    const existing = map.get(tpi)
    if (existing) {
      map.set(tpi, { ...existing, correctSubmission: true })
    }
  }

  return map
}

export function HypothesisPanel({
  solvers,
  taskId,
}: {
  solvers: { userId: number; email: string }[]
  taskId: string
}) {
  const results = useQueries({
    queries: solvers.map((s) => ({
      queryKey: ['hypothesis-panel', 'events', s.userId, taskId],
      queryFn: () => getEvents(s.userId, taskId),
    })),
  })

  if (solvers.length === 0) return null

  return (
    <div>
      <div className="mb-2">
        <span className="text-base font-semibold text-gray-300">Hypotheses per solver</span>
      </div>
      <div className="flex flex-col gap-3">
          {solvers.map((solver, idx) => {
            const { data: events, isLoading } = results[idx]
            const hypoMap = events ? extractHypotheses(events as unknown as Record<string, unknown>[]) : null

            return (
              <div key={solver.userId} className="rounded border border-gray-800 bg-gray-900/30 p-3">
                <p className="mb-2 text-sm font-medium text-blue-400">{solver.email}</p>
                {isLoading ? (
                  <p className="text-xs text-gray-600">Loading events...</p>
                ) : hypoMap && hypoMap.size > 0 ? (
                  [...hypoMap.entries()]
                    .sort(([a], [b]) => a - b)
                    .map(([tpi, info]) => {
                      const revs = info.revisions.filter(
                        (r, i) => i === 0
                          ? r !== info.initial
                          : r !== info.revisions[i - 1],
                      )
                      const last = revs.length > 0 ? revs[revs.length - 1] : info.initial

                      return (
                        <div key={tpi} className="mb-2 last:mb-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-400">
                              Test {tpi + 1}
                            </span>
                            {info.correctSubmission && (
                              <span className="rounded bg-green-900/40 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
                                correct
                              </span>
                            )}
                          </div>
                          <div className="ml-2 mt-1 space-y-0.5">
                            {info.initial && (
                              <p className="text-xs text-gray-300">
                                <span className="text-gray-500">initial:</span> {info.initial}
                              </p>
                            )}
                            {revs.map((rev, ri) => (
                              <p key={ri} className="text-xs text-gray-300">
                                <span className="text-gray-500">revision:</span> {rev}
                              </p>
                            ))}
                            {info.final && info.final !== last && (
                              <p className="text-xs text-gray-300">
                                <span className="text-gray-500">final:</span> {info.final}
                              </p>
                            )}
                            {!info.initial && !revs.length && (
                              <p className="text-xs italic text-gray-600">No hypotheses found</p>
                            )}
                          </div>
                        </div>
                      )
                    })
                ) : (
                  <p className="text-xs italic text-gray-600">No hypotheses found</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
