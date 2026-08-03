import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronDown, ClipboardCopy } from 'lucide-react'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useTaskById } from '../../arc-lab/queries'
import { useSyntheticTask, useSyntheticReview, useSolverReviewDetails, useTaskSolvers, useUpdateSyntheticReview } from '../queries'
import { PairDisplay } from '../components/PairDisplay'

export function SyntheticReviewDetailPage() {
  const { t } = useTranslation()
  const { isAdmin, isLoading: authLoading } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [notesAccordionOpen, setNotesAccordionOpen] = useState(true)
  const [newNote, setNewNote] = useState('')

  const { data: synthTask, isLoading: taskLoading } = useSyntheticTask(id ?? '')
  const { data: review, isLoading: reviewLoading } = useSyntheticReview(id ?? '')
  const { data: originalTask } = useTaskById(synthTask?.originalTaskId ?? '')
  const { data: solvers = [] } = useTaskSolvers(synthTask?.originalTaskId ?? '')
  const { data: solverReviewDetails = [] } = useSolverReviewDetails(
    synthTask?.originalTaskId ?? '',
  )
  const updateReview = useUpdateSyntheticReview(id ?? '')

  if (authLoading || taskLoading || reviewLoading) {
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

  if (!synthTask) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
        <p className="font-semibold">Tarea sintética no encontrada</p>
      </div>
    )
  }

  const handleToggleNeedsRevision = () => {
    const current = review?.status ?? 'pending_review'
    const next = current === 'done' ? 'pending_review'
      : current === 'needs_revision' ? 'done'
      : 'needs_revision'
    updateReview.mutate({ status: next })
  }

  const handleAddNote = () => {
    const trimmed = newNote.trim()
    if (!trimmed) return
    const currentNotes = review?.notes ?? []
    updateReview.mutate({ notes: [...currentNotes, trimmed] })
    setNewNote('')
  }

  const handleCopy = (obj: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2))
  }

  const reviewStatusLabel: Record<string, { label: string; color: string }> = {
    pending_review: { label: 'Pendiente', color: 'bg-gray-800 text-gray-400' },
    needs_revision: { label: 'Necesita revisión', color: 'bg-red-900/40 text-red-400' },
    done: { label: 'Hecho', color: 'bg-green-900/40 text-green-400' },
  }

  const statusInfo = reviewStatusLabel[review?.status ?? 'pending_review']

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          to="/admin/synthetic-reviews"
          className="text-sm text-gray-400 transition hover:text-white"
        >
          &larr; Volver a revisiones sintéticas
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revisión sintética</h1>
          <p className="mt-1 font-mono text-sm text-blue-400">
            {synthTask.id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded px-3 py-1 text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          {review?.correct === true && (
            <span className="rounded bg-green-900/40 px-3 py-1 text-sm font-medium text-green-400">
              ✓ Correcta
            </span>
          )}
          {review?.correct === false && (
            <span className="rounded bg-red-900/40 px-3 py-1 text-sm font-medium text-red-400">
              ✗ Incorrecta
            </span>
          )}
          {review?.verified && (
            <span className="rounded bg-blue-900/40 px-3 py-1 text-sm font-medium text-blue-400">
              ✓ Verificada
            </span>
          )}
          <button
            onClick={() => updateReview.mutate({ verified: !review?.verified })}
            disabled={updateReview.isPending}
            className={`rounded px-4 py-2 text-sm font-semibold transition ${
              review?.verified
                ? 'bg-blue-700 text-white hover:bg-blue-600'
                : 'border border-blue-700 text-blue-400 hover:bg-blue-950 hover:text-blue-300'
            }`}
          >
            {review?.verified ? '✓ VERIFICADA' : 'VERIFICAR'}
          </button>
          <button
            onClick={handleToggleNeedsRevision}
            disabled={updateReview.isPending}
            className={`rounded px-4 py-2 text-sm font-semibold transition ${
              review?.status === 'needs_revision'
                ? 'bg-red-700 text-white hover:bg-red-600'
                : 'border border-red-700 text-red-400 hover:bg-red-950 hover:text-red-300'
            }`}
          >
            {review?.status === 'needs_revision' ? 'QUITAR MARCA' : 'NECESITA REVISIÓN'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
          <p className="text-xs font-semibold text-gray-500">Modelo</p>
          <p className="mt-1 text-sm text-gray-200">{synthTask.modelName}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
          <p className="text-xs font-semibold text-gray-500">Tarea original</p>
          <Link
            to={`/admin/tasks/${synthTask.originalTaskId}/solutions`}
            className="mt-1 block text-sm text-blue-400 hover:underline"
          >
            {synthTask.originalTaskId}
          </Link>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
          <p className="text-xs font-semibold text-gray-500">Witness</p>
          <p className="mt-1 text-sm text-gray-200">
            {synthTask.witnessPassed
              ? '✓ Pasó'
              : `✗ Falló (${synthTask.witnessNPassed}/${synthTask.witnessNTotal})`}
          </p>
          {!synthTask.witnessPassed && (
            <div className="mt-2 flex gap-2">
              {review?.correct !== true ? (
                <button
                  onClick={() => updateReview.mutate({ correct: true })}
                  disabled={updateReview.isPending}
                  className="rounded border border-green-700 px-3 py-1 text-xs font-medium text-green-400 transition hover:bg-green-950 hover:text-green-300"
                >
                  Marcar como correcta (falso − del witness)
                </button>
              ) : (
                <>
                  <span className="text-xs font-medium text-green-400 self-center">
                    ✓ Correcta (falso negativo)
                  </span>
                  <button
                    onClick={() => updateReview.mutate({ correct: null })}
                    disabled={updateReview.isPending}
                    className="rounded border border-gray-700 px-2 py-1 text-xs text-gray-400 transition hover:border-gray-500 hover:text-gray-300"
                  >
                    Desmarcar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
        <p className="text-xs font-semibold text-gray-500">Resolvieron la tarea original</p>
        {solvers.length === 0 && (
          <span className="mt-2 block text-xs text-gray-600">Sin datos</span>
        )}
        <div className="mt-2 flex flex-col gap-3">
          {solvers.map((s) => (
            <div key={s.userId} className="rounded border border-gray-800 bg-gray-950 p-3">
              <span className="text-xs text-blue-400">{s.email}</span>
              {s.hypothesis ? (
                <p className="mt-1 whitespace-pre-wrap text-xs text-gray-300">{s.hypothesis}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-600">Sin hipótesis</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
        <p className="text-xs font-semibold text-gray-500">Revisión de los solvers</p>
        {solverReviewDetails.length === 0 && (
          <span className="mt-2 block text-xs text-gray-600">Sin datos</span>
        )}
        <div className="mt-2 flex flex-col gap-3">
          {solverReviewDetails.map((s) => (
            <div key={s.userId} className="rounded border border-gray-800 bg-gray-950 p-3">
              <span className="text-xs text-blue-400">{s.email}</span>
              <div className="mt-2 flex flex-col gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-600">Hipótesis original</p>
                  {s.originalHypothesis ? (
                    <p className="mt-0.5 whitespace-pre-wrap text-xs text-gray-300">{s.originalHypothesis}</p>
                  ) : (
                    <p className="mt-0.5 text-xs text-gray-600">Sin hipótesis</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Hipótesis revisada</p>
                  {s.revisedHypothesis ? (
                    <p className="mt-0.5 whitespace-pre-wrap text-xs text-gray-300">{s.revisedHypothesis}</p>
                  ) : (
                    <p className="mt-0.5 text-xs text-gray-600">Sin hipótesis revisada</p>
                  )}
                </div>
                {s.variants.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs font-semibold text-gray-600">Variantes revisadas</p>
                    <div className="mt-1 flex flex-col gap-1">
                      {s.variants.map((v) => (
                        <div key={v.synthTaskId} className="flex items-center gap-2 rounded bg-gray-900/60 px-2 py-1">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              v.correct === false
                                ? 'bg-red-900/40 text-red-400'
                                : v.correct === true
                                  ? 'bg-green-900/40 text-green-400'
                                  : 'bg-gray-800 text-gray-400'
                            }`}
                          >
                            {v.correct === false ? '✗' : v.correct === true ? '✓' : '—'}
                          </span>
                          <span className="font-mono text-[10px] text-gray-400">{v.synthTaskId}</span>
                          <span className="ml-auto text-[10px] text-gray-500">{v.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {synthTask.concept && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
          <p className="text-xs font-semibold text-gray-500">Concepto</p>
          <p className="mt-1 text-sm text-gray-200 whitespace-pre-wrap">{synthTask.concept}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">Tarea original</h2>
            <button onClick={() => handleCopy(originalTask)} className="rounded bg-gray-800/50 px-2 py-1 text-gray-400 hover:text-white">
              <ClipboardCopy size={12} />
            </button>
          </div>
          {originalTask && (
            <div className="mt-3 space-y-4">
              {originalTask.train.map((pair: { input: number[][]; output: number[][] }, i: number) => (
                <PairDisplay key={`orig-train-${i}`} label={`Train ${i + 1}`} pair={pair} />
              ))}
              {originalTask.test.length > 0 && (
                <div className="mt-4 border-t border-gray-800 pt-4">
                  <p className="mb-2 text-xs font-semibold text-gray-600">Test</p>
                  {originalTask.test.map((pair: { input: number[][]; output: number[][] }, i: number) => (
                    <PairDisplay key={`orig-test-${i}`} label={`Test ${i + 1}`} pair={pair} />
                  ))}
                </div>
              )}
            </div>
          )}
          {!originalTask && (
            <p className="mt-3 text-xs text-gray-600">Tarea original no encontrada</p>
          )}
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">Tarea generada</h2>
            <button onClick={() => handleCopy({ train: synthTask.train, test: synthTask.test })} className="rounded bg-gray-800/50 px-2 py-1 text-gray-400 hover:text-white">
              <ClipboardCopy size={12} />
            </button>
          </div>
          <div className="mt-3 space-y-4">
            {synthTask.train.map((pair, i) => (
              <PairDisplay key={`gen-train-${i}`} label={`Train ${i + 1}`} pair={pair} />
            ))}
            {synthTask.test.length > 0 && (
              <div className="mt-4 border-t border-gray-800 pt-4">
                <p className="mb-2 text-xs font-semibold text-gray-600">Test</p>
                {synthTask.test.map((pair, i) => (
                  <PairDisplay key={`gen-test-${i}`} label={`Test ${i + 1}`} pair={pair} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
        <button
          onClick={() => setNotesAccordionOpen(!notesAccordionOpen)}
          className="flex w-full items-center justify-between"
        >
          <span className="text-sm font-semibold text-gray-300">
            Notas ({review?.notes.length ?? 0})
          </span>
          <ChevronDown size={16} className={`transition ${notesAccordionOpen ? 'rotate-180' : ''}`} />
        </button>
        {notesAccordionOpen && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex gap-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Agregar nota..."
                className="min-h-[60px] flex-1 rounded border border-gray-700 bg-gray-950 p-2 text-xs text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || updateReview.isPending}
                className="self-end rounded bg-blue-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-600 disabled:opacity-40"
              >
                Agregar
              </button>
            </div>
            {(!review?.notes || review.notes.length === 0) && (
              <p className="text-xs text-gray-600">Sin notas</p>
            )}
            {review?.notes.map((note, i) => (
              <div key={i} className="rounded border border-gray-800 bg-gray-950 p-2">
                <p className="text-xs text-gray-300 whitespace-pre-wrap">{note}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
