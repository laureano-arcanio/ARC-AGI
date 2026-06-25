import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTaskById } from '../queries'
import { createAttempt, postEventWithRetry } from '../api'
import { createGrid } from '../utils'
import { PreSolverWizard } from '../components/PreSolverWizard'
import { useTranslation } from '../../../lib/i18n'
import type { CognitiveIntent, GridData } from '../types'

function makePreNodeId(n: number): string {
  return `pre_node_${String(n).padStart(3, '0')}`
}

export function HypothesizePage() {
  const { taskId, userId: routeUserId } = useParams<{ taskId: string; userId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [userId, setUserId] = useState<number | null>(null)
  const [saveError, setSaveError] = useState(false)
  const [visibleTrainPairCount, setVisibleTrainPairCount] = useState(1)
  const [attemptId, setAttemptId] = useState<number | null>(null)
  const nodeIdCounter = useRef(0)

  useEffect(() => {
    if (routeUserId) {
      const numericId = Number(routeUserId)
      if (!Number.isNaN(numericId)) setUserId(numericId)
    } else {
      setUserId(1)
    }
  }, [routeUserId])

  const { data: specificTask, isFetched: taskFetched } = useTaskById(taskId ?? '')

  useEffect(() => {
    if (userId === null || !taskId || taskId === 'random') return
    if (attemptId !== null) return
    let cancelled = false
    createAttempt(userId, taskId).then((attempt) => {
      if (!cancelled) setAttemptId(attempt.id)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [userId, taskId, attemptId])

  const ready = userId !== null && taskFetched && specificTask && attemptId !== null

  const lastPostedRef = useRef<string | null>(null)

  const handleAddCognitiveNode = useCallback((intent: CognitiveIntent, text: string, details?: Record<string, unknown>) => {
    if (!attemptId || !userId || !taskId) return
    const nodeId = makePreNodeId(nodeIdCounter.current)
    const dedupKey = `${nodeId}:${intent}:${text}`
    if (lastPostedRef.current === dedupKey) return
    lastPostedRef.current = dedupKey
    const parentId = nodeIdCounter.current > 0
      ? makePreNodeId(nodeIdCounter.current - 1)
      : null
    nodeIdCounter.current += 1
    const snapshot: GridData = createGrid(1, 1)
    postEventWithRetry({
      userId,
      taskId,
      attemptId,
      nodeId,
      parentNodeId: parentId,
      trigger: {
        kind: 'cognitive',
        intent,
        text,
        ...(details ? { details } : {}),
      },
      stateSnapshot: snapshot,
      timestamp: Date.now(),
      testPairIndex: 0,
    })
      .then(() => setSaveError(false))
      .catch(() => setSaveError(true))
  }, [attemptId, userId, taskId])

  const handleComplete = useCallback(() => {
    const base = routeUserId ? `/solve/${routeUserId}/${taskId}` : `/solve/${taskId}`
    const params = new URLSearchParams()
    if (attemptId !== null) params.set('attemptId', String(attemptId))
    navigate(`${base}?${params.toString()}`, { replace: true })
  }, [attemptId, routeUserId, taskId, navigate])

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <>
      {saveError && (
        <div
          role="alert"
          className="fixed inset-x-0 top-0 z-50 bg-red-600 px-4 py-2 text-center text-sm font-medium text-white"
        >
          {t('toast.event_save_failed')}
        </div>
      )}
      <PreSolverWizard
        train={specificTask.train}
        test={specificTask.test}
        visibleTrainPairCount={visibleTrainPairCount}
        onSetVisibleCount={setVisibleTrainPairCount}
        onAddCognitiveNode={handleAddCognitiveNode}
        onComplete={handleComplete}
      />
    </>
  )
}
