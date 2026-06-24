import { useState, useCallback } from 'react'
import { DemonstrationPanel } from './DemonstrationPanel'
import { useTranslation } from '../../../lib/i18n'
import type { CognitiveIntent, TaskPair } from '../types'

type RevisionType = 'confirmed' | 'refined' | 'contradicted' | 'uncertain'

type PreSolverWizardProps = {
  train: TaskPair[]
  visibleTrainPairCount: number
  onSetVisibleCount: (count: number) => void
  onAddCognitiveNode: (intent: CognitiveIntent, text: string, details?: Record<string, unknown>) => void
  onComplete: () => void
}

const REVISION_TYPES: { key: RevisionType; labelKey: string }[] = [
  { key: 'confirmed', labelKey: 'pre_solver.confirmed' },
  { key: 'refined', labelKey: 'pre_solver.refined' },
  { key: 'contradicted', labelKey: 'pre_solver.contradicted' },
  { key: 'uncertain', labelKey: 'pre_solver.uncertain' },
]

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function PreSolverWizard({
  train,
  visibleTrainPairCount,
  onSetVisibleCount,
  onAddCognitiveNode,
  onComplete,
}: PreSolverWizardProps) {
  const { t } = useTranslation()
  const totalSteps = train.length
  const [wizardStep, setWizardStep] = useState(0)
  const [hypothesisText, setHypothesisText] = useState('')
  const [revisionType, setRevisionType] = useState<RevisionType | null>(null)
  const [revisionText, setRevisionText] = useState('')
  const [error, setError] = useState('')

  const isValid = wordCount(hypothesisText) >= 5
  const isLastStep = wizardStep === totalSteps - 1

  const handleInitialSubmit = useCallback(() => {
    if (!isValid) {
      setError(t('pre_solver.no_text'))
      return
    }
    setError('')
    onAddCognitiveNode('initial_hypothesis', hypothesisText.trim(), {
      visibleTrainPairIndexes: Array.from({ length: visibleTrainPairCount }, (_, i) => i),
    })
    setHypothesisText('')
    if (train.length === 1) {
      onComplete()
      return
    }
    const nextCount = Math.min(visibleTrainPairCount + 1, train.length)
    onSetVisibleCount(nextCount)
    setWizardStep((s) => s + 1)
  }, [isValid, hypothesisText, onAddCognitiveNode, visibleTrainPairCount, onSetVisibleCount, train.length, onComplete, t])

  const handleRevisionContinue = useCallback(() => {
    if (!revisionType) {
      setError(t('pre_solver.no_text'))
      return
    }
    const needsText = revisionType !== 'confirmed'
    if (needsText && wordCount(revisionText) < 5) {
      setError(t('pre_solver.no_text'))
      return
    }
    setError('')
    onAddCognitiveNode('hypothesis_revision', needsText ? revisionText.trim() : '', {
      revisionType,
      visibleTrainPairIndexes: Array.from({ length: visibleTrainPairCount }, (_, i) => i),
    })
    setRevisionType(null)
    setRevisionText('')
    if (isLastStep) {
      onComplete()
      return
    }
    const nextCount = Math.min(visibleTrainPairCount + 1, train.length)
    onSetVisibleCount(nextCount)
    setWizardStep((s) => s + 1)
  }, [revisionType, revisionText, onAddCognitiveNode, visibleTrainPairCount, onSetVisibleCount, train.length, isLastStep, onComplete, t])

  const handleRevisionSelect = (key: RevisionType) => {
    setRevisionType(key)
    setError('')
  }

  if (train.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center">
          <p className="text-gray-300">{t('panel.empty')}</p>
        </div>
      </div>
    )
  }

  const isInitialStep = wizardStep === 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">
          {t('pre_solver.step_title', { current: wizardStep + 1, total: totalSteps })}
        </h2>
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-2 w-8 rounded-full transition-colors ${
                i <= wizardStep ? 'bg-green-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      <DemonstrationPanel pairs={train} visibleCount={visibleTrainPairCount} />

      <div className="mt-6 rounded-xl border border-gray-700 bg-gray-800/50 p-6">
        {isInitialStep && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">
              {t('pre_solver.initial_prompt')}
            </label>
            <textarea
              ref={(el) => el?.focus()}
              rows={3}
              value={hypothesisText}
              onChange={(e) => { setHypothesisText(e.target.value); setError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInitialSubmit() } }}
              data-testid="pre-solver-hypothesis"
              className="w-full resize-none rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-green-500 focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className={`text-xs ${isValid ? 'text-green-400' : 'text-gray-500'}`}>
                {t('pre_solver.words', { count: wordCount(hypothesisText) })}
              </span>
              <button
                type="button"
                onClick={handleInitialSubmit}
                disabled={!isValid}
                data-testid="pre-solver-record"
                className="rounded-md bg-green-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-40"
              >
                {t('pre_solver.record')}
              </button>
            </div>
          </div>
        )}

        {!isInitialStep && (
          <div>
            <p className="mb-3 text-sm font-medium text-gray-200">
              {t('pre_solver.revision_question')}
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {REVISION_TYPES.map(({ key, labelKey }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRevisionSelect(key)}
                  data-testid={`revision-${key}`}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                    revisionType === key
                      ? 'border-green-500 bg-green-900/30 text-green-300'
                      : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>

            {revisionType !== null && revisionType !== 'confirmed' && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-gray-300">
                  {t('pre_solver.revision_prompt')}
                </label>
                <textarea
                  ref={(el) => el?.focus()}
                  rows={3}
                  value={revisionText}
                  onChange={(e) => { setRevisionText(e.target.value); setError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRevisionContinue() } }}
                  data-testid="pre-solver-revision-text"
                  className="w-full resize-none rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-green-500 focus:outline-none"
                />
                <span className={`mt-1 block text-xs ${wordCount(revisionText) >= 5 ? 'text-green-400' : 'text-gray-500'}`}>
                  {t('pre_solver.words', { count: wordCount(revisionText) })}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              {error && <span className="text-xs text-red-400">{error}</span>}
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={handleRevisionContinue}
                  disabled={!revisionType}
                  data-testid="pre-solver-next"
                  className="rounded-md bg-green-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-40"
                >
                  {isLastStep ? t('pre_solver.start_solving') : t('pre_solver.next')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
