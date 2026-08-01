import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronDown, ClipboardCopy } from 'lucide-react'
import { useTranslation } from '../../../lib/i18n'
import { useAuth } from '../../../lib/auth'
import { useTaskById } from '../../arc-lab/queries'
import { PairDisplay } from '../../synthetic-reviews/components/PairDisplay'
import type { SyntheticTask } from '../../synthetic-reviews/types'
import {
  useMyAnonymousSolvers,
  useMyUserReview,
  useResolvedSyntheticTasks,
  useUpdateUserReview,
} from '../queries'

const REVIEW_STATUS: Record<
  string,
  { label: string; color: string }
> = {
  pending_review: {
    label: 'my_reviews.status_pending_review',
    color: 'bg-gray-800 text-gray-400',
  },
  needs_revision: {
    label: 'my_reviews.status_needs_revision',
    color: 'bg-red-900/40 text-red-400',
  },
  done: {
    label: 'my_reviews.status_done',
    color: 'bg-green-900/40 text-green-400',
  },
}

function ReviewVariantCard({
  variant,
  variantIndex,
}: {
  variant: SyntheticTask
  variantIndex: number
}) {
  const { t } = useTranslation()
  const [notesAccordionOpen, setNotesAccordionOpen] = useState(true)
  const [newNote, setNewNote] = useState('')

  const { data: review } = useMyUserReview(variant.id)
  const updateReview = useUpdateUserReview(variant.id)

  const statusInfo =
    REVIEW_STATUS[review?.status ?? 'pending_review'] ?? REVIEW_STATUS.pending_review

  const handleToggleNeedsRevision = () => {
    const current = review?.status ?? 'pending_review'
    const next =
      current === 'done'
        ? 'pending_review'
        : current === 'needs_revision'
          ? 'done'
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

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-300">
            {t('my_reviews.detail.variant_n', { n: variantIndex + 1 })}
          </h2>
          <p className="mt-1 font-mono text-xs text-purple-400">{variant.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded px-2.5 py-1 text-xs font-medium ${statusInfo.color}`}>
            {t(statusInfo.label)}
          </span>
          {review?.correct === true && (
            <span className="rounded bg-green-900/40 px-2.5 py-1 text-xs font-medium text-green-400">
              {t('my_reviews.detail.correct')}
            </span>
          )}
          {review?.correct === false && (
            <span className="rounded bg-red-900/40 px-2.5 py-1 text-xs font-medium text-red-400">
              {t('my_reviews.detail.incorrect')}
            </span>
          )}
          {review?.verified && (
            <span className="rounded bg-blue-900/40 px-2.5 py-1 text-xs font-medium text-blue-400">
              {t('my_reviews.detail.verified')}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">
            {t('my_reviews.detail.model')}
          </span>
          <span className="text-xs text-gray-200">{variant.modelName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">
            {t('my_reviews.detail.witness')}
          </span>
          <span className="text-xs text-gray-200">
            {variant.witnessPassed
              ? t('my_reviews.detail.witness_passed')
              : t('my_reviews.detail.witness_failed', {
                  n: variant.witnessNPassed ?? 0,
                  total: variant.witnessNTotal ?? 0,
                })}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() =>
            updateReview.mutate({ verified: !review?.verified })
          }
          disabled={updateReview.isPending}
          className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
            review?.verified
              ? 'bg-blue-700 text-white hover:bg-blue-600'
              : 'border border-blue-700 text-blue-400 hover:bg-blue-950 hover:text-blue-300'
          }`}
        >
          {review?.verified
            ? t('my_reviews.detail.verified')
            : t('my_reviews.detail.verify')}
        </button>
        <button
          onClick={handleToggleNeedsRevision}
          disabled={updateReview.isPending}
          className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
            review?.status === 'needs_revision'
              ? 'bg-red-700 text-white hover:bg-red-600'
              : 'border border-red-700 text-red-400 hover:bg-red-950 hover:text-red-300'
          }`}
        >
          {review?.status === 'needs_revision'
            ? t('my_reviews.detail.remove_mark')
            : t('my_reviews.detail.needs_revision')}
        </button>
        {!variant.witnessPassed && (
          <button
            onClick={() => updateReview.mutate({ correct: true })}
            disabled={updateReview.isPending}
            className="rounded border border-green-700 px-3 py-1.5 text-xs font-medium text-green-400 transition hover:bg-green-950 hover:text-green-300"
          >
            {t('my_reviews.detail.mark_correct')}
          </button>
        )}
        {review?.correct === true && (
          <button
            onClick={() => updateReview.mutate({ correct: null })}
            disabled={updateReview.isPending}
            className="rounded border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition hover:border-gray-500 hover:text-gray-300"
          >
            {t('my_reviews.detail.unmark')}
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500">
          {t('my_reviews.detail.generated_task')}
        </h3>
        <button
          onClick={() =>
            handleCopy({ train: variant.train, test: variant.test })
          }
          className="rounded bg-gray-800/50 px-2 py-1 text-gray-400 hover:text-white"
        >
          <ClipboardCopy size={12} />
        </button>
      </div>
      <div className="mt-3 space-y-4">
        {variant.train.map((pair, i) => (
          <PairDisplay key={`gen-train-${i}`} label={`Train ${i + 1}`} pair={pair} />
        ))}
        {variant.test.length > 0 && (
          <div className="mt-4 border-t border-gray-800 pt-4">
            <p className="mb-2 text-xs font-semibold text-gray-600">Test</p>
            {variant.test.map((pair, i) => (
              <PairDisplay key={`gen-test-${i}`} label={`Test ${i + 1}`} pair={pair} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-gray-800 pt-3">
        <button
          onClick={() => setNotesAccordionOpen(!notesAccordionOpen)}
          className="flex w-full items-center justify-between"
        >
          <span className="text-xs font-semibold text-gray-300">
            {t('my_reviews.detail.notes')} ({review?.notes.length ?? 0})
          </span>
          <ChevronDown
            size={14}
            className={`transition ${notesAccordionOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {notesAccordionOpen && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex gap-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={t('my_reviews.detail.add_note')}
                className="min-h-[60px] flex-1 rounded border border-gray-700 bg-gray-950 p-2 text-xs text-gray-200 placeholder-gray-600 focus:border-purple-500 focus:outline-none"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || updateReview.isPending}
                className="self-end rounded bg-purple-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-purple-600 disabled:opacity-40"
              >
                {t('my_reviews.detail.add_note_btn')}
              </button>
            </div>
            {(!review?.notes || review.notes.length === 0) && (
              <p className="text-xs text-gray-600">
                {t('my_reviews.detail.no_notes')}
              </p>
            )}
            {review?.notes.map((note, i) => (
              <div
                key={i}
                className="rounded border border-gray-800 bg-gray-950 p-2"
              >
                <p className="whitespace-pre-wrap text-xs text-gray-300">
                  {note}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function MyReviewPage() {
  const { t } = useTranslation()
  const { taskId } = useParams<{ taskId: string }>()
  const { userId, isLoading: authLoading } = useAuth()

  const { data: tasks, isLoading: tasksLoading } = useResolvedSyntheticTasks(
    taskId ?? '',
  )

  const originalTaskId = tasks && tasks.length > 0 ? tasks[0].originalTaskId : ''
  const { data: originalTask } = useTaskById(originalTaskId)
  const { data: solvers = [] } = useMyAnonymousSolvers(originalTaskId)

  if (authLoading || tasksLoading) {
    return (
      <div className="flex items-center gap-3 text-gray-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-purple-400" />
        {t('my_reviews.loading')}
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="text-center">
        <p className="text-gray-400">{t('my_reviews.please_login')}</p>
      </div>
    )
  }

  const handleCopy = (obj: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          to="/my-reviews"
          className="text-sm text-gray-400 transition hover:text-white"
        >
          &larr; {t('my_reviews.detail.back')}
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('my_reviews.detail.title')}</h1>
          <p className="mt-1 font-mono text-sm text-purple-400">{taskId}</p>
        </div>
      </div>

      {(!tasks || tasks.length === 0) && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-gray-400">{t('my_reviews.detail.no_variants')}</p>
        </div>
      )}

      {(tasks?.length ?? 0) > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
              <p className="text-xs font-semibold text-gray-500">
                {t('my_reviews.detail.original_task')}
              </p>
              <p className="mt-1 font-mono text-sm text-gray-200">
                {originalTaskId}
              </p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
              <p className="text-xs font-semibold text-gray-500">
                {t('my_reviews.detail.variants_count', {
                  n: tasks?.length ?? 0,
                })}
              </p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
              <p className="text-xs font-semibold text-gray-500">
                {t('my_reviews.detail.solvers')}
              </p>
              {solvers.length === 0 && (
                <span className="mt-1 block text-xs text-gray-600">
                  {t('my_reviews.detail.no_solvers')}
                </span>
              )}
            </div>
          </div>

          {solvers.length > 0 && (
            <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
              <p className="text-xs font-semibold text-gray-500">
                {t('my_reviews.detail.solvers')}
              </p>
              <div className="mt-2 flex flex-col gap-3">
                {solvers.map((s, i) => (
                  <div
                    key={i}
                    className="rounded border border-gray-800 bg-gray-950 p-3"
                  >
                    <span className="text-xs text-gray-500">
                      {t('my_reviews.detail.solver_label', { n: i + 1 })}
                    </span>
                    {s.hypothesis ? (
                      <p className="mt-1 whitespace-pre-wrap text-xs text-gray-300">
                        {s.hypothesis}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-600">
                        {t('my_reviews.detail.no_hypothesis')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {originalTask && (
            <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-300">
                  {t('my_reviews.detail.original_task')}
                </h2>
                <button
                  onClick={() => handleCopy(originalTask)}
                  className="rounded bg-gray-800/50 px-2 py-1 text-gray-400 hover:text-white"
                >
                  <ClipboardCopy size={12} />
                </button>
              </div>
              <div className="mt-3 space-y-4">
                {originalTask.train.map(
                  (
                    pair: { input: number[][]; output: number[][] },
                    i: number,
                  ) => (
                    <PairDisplay
                      key={`orig-train-${i}`}
                      label={`Train ${i + 1}`}
                      pair={pair}
                    />
                  ),
                )}
                {originalTask.test.length > 0 && (
                  <div className="mt-4 border-t border-gray-800 pt-4">
                    <p className="mb-2 text-xs font-semibold text-gray-600">
                      Test
                    </p>
                    {originalTask.test.map(
                      (
                        pair: { input: number[][]; output: number[][] },
                        i: number,
                      ) => (
                        <PairDisplay
                          key={`orig-test-${i}`}
                          label={`Test ${i + 1}`}
                          pair={pair}
                        />
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-6">
            {tasks!.map((variant, i) => (
              <ReviewVariantCard
                key={variant.id}
                variant={variant}
                variantIndex={i}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
