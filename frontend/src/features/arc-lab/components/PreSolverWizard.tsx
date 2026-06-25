import { useState, useCallback, useRef, useEffect } from 'react'
import { DemonstrationPanel } from './DemonstrationPanel'
import { GridDisplay } from './GridDisplay'
import { useTranslation } from '../../../lib/i18n'
import type { CognitiveIntent, TaskPair } from '../types'

function PreSolverModal({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation()
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0" onClick={onDismiss} />
      <div className="relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-100">{t('pre_solver.modal_title')}</h2>

        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          {t('pre_solver.modal_intro')}
        </p>

        <ol className="mt-4 space-y-3">
          <li className="text-sm leading-relaxed text-gray-300">
            <span className="font-semibold text-gray-100">{t('pre_solver.modal_step1_label')}</span>
            {' — '}
            {t('pre_solver.modal_step1_desc')}
          </li>
          <li className="text-sm leading-relaxed text-gray-300">
            <span className="font-semibold text-gray-100">{t('pre_solver.modal_step2_label')}</span>
            {' — '}
            {t('pre_solver.modal_step2_desc')}
          </li>
          <li className="text-sm leading-relaxed text-gray-300">
            <span className="font-semibold text-gray-100">{t('pre_solver.modal_step3_label')}</span>
            {' — '}
            {t('pre_solver.modal_step3_desc')}
          </li>
        </ol>

        <div className="mt-5 rounded-lg border border-gray-700/50 bg-gray-800/50 p-3">
          <p className="text-sm font-semibold text-gray-100">{t('pre_solver.modal_annotation_title')}</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-400">
            {t('pre_solver.modal_annotation_desc')}
          </p>
        </div>

        <div className="mt-3 rounded-lg border border-amber-700/40 bg-amber-900/20 p-3">
          <p className="text-sm leading-relaxed text-amber-200">
            {t('pre_solver.modal_multi_test_warning')}
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md bg-green-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            {t('pre_solver.modal_dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}

type RevisionType = 'confirmed' | 'refined' | 'invalidated' | 'uncertain'

type PreSolverWizardProps = {
  train: TaskPair[]
  test: TaskPair[]
  visibleTrainPairCount: number
  onSetVisibleCount: (count: number) => void
  onAddCognitiveNode: (intent: CognitiveIntent, text: string, details?: Record<string, unknown>) => void
  onComplete: () => void
}

const REVISION_TYPES: { key: RevisionType; labelKey: string }[] = [
  { key: 'confirmed', labelKey: 'pre_solver.confirmed' },
  { key: 'refined', labelKey: 'pre_solver.refined' },
  { key: 'invalidated', labelKey: 'pre_solver.invalidated' },
  { key: 'uncertain', labelKey: 'pre_solver.uncertain' },
]

// Once the user has entered a rule, the "I can't find the rule" escape hatch is
// removed from revision steps so reasoning is captured end-to-end.
const REVISION_OPTIONS = REVISION_TYPES.filter((r) => r.key !== 'uncertain')

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function PreSolverWizard({
  train,
  test,
  visibleTrainPairCount,
  onSetVisibleCount,
  onAddCognitiveNode,
  onComplete,
}: PreSolverWizardProps) {
  const { t } = useTranslation()
  const totalSteps = train.length + test.length
  const [modalOpen, setModalOpen] = useState(true)
  const [wizardStep, setWizardStep] = useState(0)
  const [hypothesisText, setHypothesisText] = useState('')
  const [revisionType, setRevisionType] = useState<RevisionType | null>(null)
  const [revisionText, setRevisionText] = useState('')
  const [invalidatedContradictionText, setInvalidatedContradictionText] = useState('')
  const [invalidatedNewHypothesisText, setInvalidatedNewHypothesisText] = useState('')
  const [finalAlgorithmText, setFinalAlgorithmText] = useState('')
  const [showFinalStep, setShowFinalStep] = useState(false)
  const [error, setError] = useState('')
  const [enteredRule, setEnteredRule] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const lastHypothesisRef = useRef('')

  useEffect(() => {
    if (!modalOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen])

  const isValid = wordCount(hypothesisText) >= 5
  const isTestStep = wizardStep >= train.length
  const testIndex = wizardStep - train.length
  const isLastTestStep = testIndex >= test.length - 1

  const advanceToNext = useCallback(() => {
    const nextCount = Math.min(visibleTrainPairCount + 1, train.length)
    onSetVisibleCount(nextCount)
    setWizardStep((s) => s + 1)
  }, [visibleTrainPairCount, onSetVisibleCount, train.length])

  const handleInitialSubmit = useCallback(() => {
    if (!isValid) {
      setError(t('pre_solver.no_text'))
      return
    }
    setError('')
    const trimmed = hypothesisText.trim()
    onAddCognitiveNode('initial_hypothesis', trimmed, {
      visibleTrainPairIndexes: Array.from({ length: visibleTrainPairCount }, (_, i) => i),
    })
    lastHypothesisRef.current = trimmed
    setEnteredRule(true)
    setHypothesisText('')
    advanceToNext()
  }, [isValid, hypothesisText, onAddCognitiveNode, visibleTrainPairCount, advanceToNext, t])

  const handleRevisionSelect = useCallback((key: RevisionType) => {
    setError('')

    if (key === 'confirmed' || key === 'uncertain') {
      onAddCognitiveNode('hypothesis_revision', '', {
        revisionType: key,
        visibleTrainPairIndexes: Array.from({ length: visibleTrainPairCount }, (_, i) => i),
      })
      setRevisionType(null)
      const nextCount = Math.min(visibleTrainPairCount + 1, train.length)
      onSetVisibleCount(nextCount)
      setWizardStep((s) => s + 1)
    } else if (key === 'refined') {
      setRevisionType(key)
      setRevisionText(lastHypothesisRef.current)
      setInvalidatedContradictionText('')
      setInvalidatedNewHypothesisText('')
    } else if (key === 'invalidated') {
      setRevisionType(key)
      setRevisionText('')
      setInvalidatedContradictionText('')
      setInvalidatedNewHypothesisText('')
    }
  }, [onAddCognitiveNode, visibleTrainPairCount, onSetVisibleCount, train.length])

  const handleRevisionContinue = useCallback(() => {
    if (!revisionType) {
      setError(t('pre_solver.no_text'))
      return
    }

    let text = ''
    const details: Record<string, unknown> = {
      revisionType,
      visibleTrainPairIndexes: Array.from({ length: visibleTrainPairCount }, (_, i) => i),
    }

    if (revisionType === 'refined') {
      if (wordCount(revisionText) < 5) {
        setError(t('pre_solver.no_text'))
        return
      }
      text = revisionText.trim()
    } else if (revisionType === 'invalidated') {
      if (wordCount(invalidatedContradictionText) < 5 || wordCount(invalidatedNewHypothesisText) < 5) {
        setError(t('pre_solver.no_text_invalidated'))
        return
      }
      text = invalidatedNewHypothesisText.trim()
      details.contradiction = invalidatedContradictionText.trim()
    } else {
      return
    }

    setError('')
    onAddCognitiveNode('hypothesis_revision', text, details)
    lastHypothesisRef.current = text
    setEnteredRule(true)

    setRevisionType(null)
    setRevisionText('')
    setInvalidatedContradictionText('')
    setInvalidatedNewHypothesisText('')
    advanceToNext()
  }, [revisionType, revisionText, invalidatedContradictionText, invalidatedNewHypothesisText, onAddCognitiveNode, visibleTrainPairCount, advanceToNext, t])

  const advanceToNextTest = useCallback(() => {
    if (isLastTestStep) {
      if (lastHypothesisRef.current) {
        setIsEditing(false)
        setShowFinalStep(true)
      } else {
        onComplete()
      }
    } else {
      setRevisionType(null)
      setRevisionText('')
      setInvalidatedContradictionText('')
      setInvalidatedNewHypothesisText('')
      setWizardStep((s) => s + 1)
    }
  }, [isLastTestStep, onComplete])

  // Logged escape hatch for the exploring phase: the user still has no rule.
  // Records an `uncertain` node (train or test) so the reasoning flow is visible
  // end-to-end even when no hypothesis has been written yet.
  const handleExploringUncertain = useCallback(() => {
    setError('')
    onAddCognitiveNode('hypothesis_revision', '', {
      revisionType: 'uncertain',
      ...(isTestStep
        ? { testIndex }
        : { visibleTrainPairIndexes: Array.from({ length: visibleTrainPairCount }, (_, i) => i) }),
    })
    setHypothesisText('')
    if (isTestStep) {
      advanceToNextTest()
    } else {
      advanceToNext()
    }
  }, [isTestStep, testIndex, visibleTrainPairCount, onAddCognitiveNode, advanceToNext, advanceToNextTest])

  const handleTestRevisionSelect = useCallback((key: RevisionType) => {
    setError('')

    if (key === 'confirmed' || key === 'uncertain') {
      onAddCognitiveNode('hypothesis_revision', '', {
        revisionType: key,
        visibleTrainPairIndexes: Array.from({ length: visibleTrainPairCount }, (_, i) => i),
        testIndex,
      })
      advanceToNextTest()
    } else if (key === 'refined') {
      setRevisionType(key)
      setRevisionText(lastHypothesisRef.current)
      setInvalidatedContradictionText('')
      setInvalidatedNewHypothesisText('')
    } else if (key === 'invalidated') {
      setRevisionType(key)
      setRevisionText('')
      setInvalidatedContradictionText('')
      setInvalidatedNewHypothesisText('')
    }
  }, [onAddCognitiveNode, visibleTrainPairCount, testIndex, advanceToNextTest])

  const handleTestRevisionContinue = useCallback(() => {
    if (!revisionType) {
      setError(t('pre_solver.no_text'))
      return
    }

    let text = ''
    const details: Record<string, unknown> = {
      revisionType,
      visibleTrainPairIndexes: Array.from({ length: visibleTrainPairCount }, (_, i) => i),
      testIndex,
    }

    if (revisionType === 'refined') {
      if (wordCount(revisionText) < 5) {
        setError(t('pre_solver.no_text'))
        return
      }
      text = revisionText.trim()
    } else if (revisionType === 'invalidated') {
      if (wordCount(invalidatedContradictionText) < 5 || wordCount(invalidatedNewHypothesisText) < 5) {
        setError(t('pre_solver.no_text_invalidated'))
        return
      }
      text = invalidatedNewHypothesisText.trim()
      details.contradiction = invalidatedContradictionText.trim()
    } else {
      return
    }

    setError('')
    onAddCognitiveNode('hypothesis_revision', text, details)
    lastHypothesisRef.current = text
    setEnteredRule(true)

    advanceToNextTest()
  }, [revisionType, revisionText, invalidatedContradictionText, invalidatedNewHypothesisText, onAddCognitiveNode, visibleTrainPairCount, testIndex, advanceToNextTest, t])

  const handleFinalConfirm = useCallback(() => {
    const text = lastHypothesisRef.current.trim()
    onAddCognitiveNode('hypothesis_finalized', text, {
      visibleTrainPairIndexes: Array.from({ length: visibleTrainPairCount }, (_, i) => i),
    })
    setShowFinalStep(false)
    onComplete()
  }, [onAddCognitiveNode, visibleTrainPairCount, onComplete])

  const handleStartEdit = useCallback(() => {
    setFinalAlgorithmText(lastHypothesisRef.current)
    setIsEditing(true)
  }, [])

  const handleFinalEditConfirm = useCallback(() => {
    if (wordCount(finalAlgorithmText) < 5) {
      setError(t('pre_solver.no_text'))
      return
    }
    setError('')
    const trimmed = finalAlgorithmText.trim()
    onAddCognitiveNode('hypothesis_finalized', trimmed, {
      visibleTrainPairIndexes: Array.from({ length: visibleTrainPairCount }, (_, i) => i),
      edited: true,
    })
    lastHypothesisRef.current = trimmed
    setShowFinalStep(false)
    onComplete()
  }, [finalAlgorithmText, onAddCognitiveNode, visibleTrainPairCount, onComplete, t])

  if (train.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center">
          <p className="text-gray-300">{t('panel.empty')}</p>
        </div>
      </div>
    )
  }

  const isFinalStep = showFinalStep
  // The "exploring" phase lasts until the user writes their first rule. During
  // it we keep showing the initial prompt (with the "I can't find the rule"
  // escape hatch) on every step — train or test — so we never wrongly assume
  // a prior hypothesis. Once a rule exists, we switch to the revision UI and
  // drop the escape hatch so reasoning is captured for every remaining step.
  const isInitialStep = !isFinalStep && !enteredRule
  const needsInput = revisionType === 'refined' || revisionType === 'invalidated'

  return (
    <>
      {modalOpen && <PreSolverModal onDismiss={() => setModalOpen(false)} />}
      <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">
          {t('pre_solver.step_title', { current: isFinalStep ? totalSteps + 1 : wizardStep + 1, total: totalSteps + (isFinalStep ? 1 : 0) })}
        </h2>
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps + (isFinalStep ? 1 : 0) }, (_, i) => (
            <div
              key={i}
              className={`h-2 w-8 rounded-full transition-colors ${
                isFinalStep || i <= wizardStep ? 'bg-green-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      <DemonstrationPanel pairs={train} visibleCount={isTestStep ? train.length : visibleTrainPairCount} />

      {isTestStep && test.length > 0 && testIndex < test.length && (
        <div className="mt-4 overflow-hidden rounded-xl border border-amber-700/50 bg-gray-900">
          <div className="border-b border-amber-700/30 bg-amber-950/20 px-4 py-2">
            <span className="text-sm font-semibold text-amber-400">
              {test.length > 1
                ? t('pre_solver.test_input_n', { current: testIndex + 1, total: test.length })
                : t('panel.test_input')}
            </span>
          </div>
          <div className="flex justify-center px-4 py-4">
            <GridDisplay grid={test[testIndex].input} containerSize={500} maxCellSize={120} />
          </div>
        </div>
      )}

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
            <div className="mt-3 flex justify-center border-t border-gray-700 pt-3">
              <button
                type="button"
                onClick={handleExploringUncertain}
                data-testid="pre-solver-uncertain"
                className="rounded-md border border-gray-600 bg-gray-800 px-4 py-1.5 text-xs font-medium text-gray-300 transition hover:border-gray-500 hover:text-gray-100"
              >
                {t('pre_solver.uncertain')}
              </button>
            </div>
          </div>
        )}

        {!isInitialStep && !isTestStep && (
          <div>
            <p className="mb-3 text-sm font-medium text-gray-200">
              {t('pre_solver.revision_question')}
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {REVISION_OPTIONS.map(({ key, labelKey }) => (
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

            {revisionType === 'refined' && (
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

            {revisionType === 'invalidated' && (
              <div className="mb-3 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-300">
                    {t('pre_solver.invalidated_contradiction_prompt')}
                  </label>
                  <textarea
                    ref={(el) => el?.focus()}
                    rows={2}
                    value={invalidatedContradictionText}
                    onChange={(e) => { setInvalidatedContradictionText(e.target.value); setError('') }}
                    data-testid="pre-solver-invalidated-contradiction"
                    className="w-full resize-none rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-green-500 focus:outline-none"
                  />
                  <span className={`mt-1 block text-xs ${wordCount(invalidatedContradictionText) >= 5 ? 'text-green-400' : 'text-gray-500'}`}>
                    {t('pre_solver.words', { count: wordCount(invalidatedContradictionText) })}
                  </span>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-300">
                    {t('pre_solver.invalidated_new_hypothesis_prompt')}
                  </label>
                  <textarea
                    rows={3}
                    value={invalidatedNewHypothesisText}
                    onChange={(e) => { setInvalidatedNewHypothesisText(e.target.value); setError('') }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRevisionContinue() } }}
                    data-testid="pre-solver-invalidated-new-hypothesis"
                    className="w-full resize-none rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-green-500 focus:outline-none"
                  />
                  <span className={`mt-1 block text-xs ${wordCount(invalidatedNewHypothesisText) >= 5 ? 'text-green-400' : 'text-gray-500'}`}>
                    {t('pre_solver.words', { count: wordCount(invalidatedNewHypothesisText) })}
                  </span>
                </div>
              </div>
            )}

            {needsInput && (
              <div className="flex items-center justify-between">
                {error && <span className="text-xs text-red-400">{error}</span>}
                <div className="ml-auto">
                  <button
                    type="button"
                    onClick={handleRevisionContinue}
                    data-testid="pre-solver-next"
                    className="rounded-md bg-green-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-40"
                  >
                    {t('pre_solver.next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isFinalStep && !isEditing && (
          <div>
            <p className="mb-3 text-sm font-medium text-gray-200">
              {t('pre_solver.review_prompt')}
            </p>
            <div className="rounded-md border border-gray-600 bg-gray-900/60 px-4 py-3 text-sm leading-relaxed text-gray-200">
              {lastHypothesisRef.current}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleFinalConfirm}
                data-testid="pre-solver-confirm"
                className="rounded-md bg-green-600 px-5 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
              >
                {t('pre_solver.confirmed')}
              </button>
              <button
                type="button"
                onClick={handleStartEdit}
                data-testid="pre-solver-edit"
                className="rounded-md border border-gray-600 bg-gray-800 px-5 py-1.5 text-xs font-medium text-gray-300 transition hover:border-gray-500 hover:text-gray-100"
              >
                {t('pre_solver.edit')}
              </button>
            </div>
          </div>
        )}

        {isFinalStep && isEditing && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">
              {t('pre_solver.final_prompt')}
            </label>
            <textarea
              ref={(el) => el?.focus()}
              rows={4}
              value={finalAlgorithmText}
              onChange={(e) => { setFinalAlgorithmText(e.target.value); setError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFinalEditConfirm() } }}
              data-testid="pre-solver-final"
              className="w-full resize-none rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-green-500 focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className={`text-xs ${wordCount(finalAlgorithmText) >= 5 ? 'text-green-400' : 'text-gray-500'}`}>
                {t('pre_solver.words', { count: wordCount(finalAlgorithmText) })}
              </span>
              <button
                type="button"
                onClick={handleFinalEditConfirm}
                disabled={wordCount(finalAlgorithmText) < 5}
                data-testid="pre-solver-start-solving"
                className="rounded-md bg-green-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-40"
              >
                {t('pre_solver.start_solving')}
              </button>
            </div>
          </div>
        )}

        {isTestStep && !isFinalStep && enteredRule && (
          <div>
            <p className="mb-3 text-sm font-medium text-gray-200">
              {t('pre_solver.revision_question')}
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {REVISION_OPTIONS.map(({ key, labelKey }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTestRevisionSelect(key)}
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

            {revisionType === 'refined' && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-gray-300">
                  {t('pre_solver.revision_prompt')}
                </label>
                <textarea
                  ref={(el) => el?.focus()}
                  rows={3}
                  value={revisionText}
                  onChange={(e) => { setRevisionText(e.target.value); setError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTestRevisionContinue() } }}
                  data-testid="pre-solver-revision-text"
                  className="w-full resize-none rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-green-500 focus:outline-none"
                />
                <span className={`mt-1 block text-xs ${wordCount(revisionText) >= 5 ? 'text-green-400' : 'text-gray-500'}`}>
                  {t('pre_solver.words', { count: wordCount(revisionText) })}
                </span>
              </div>
            )}

            {revisionType === 'invalidated' && (
              <div className="mb-3 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-300">
                    {t('pre_solver.invalidated_contradiction_prompt')}
                  </label>
                  <textarea
                    ref={(el) => el?.focus()}
                    rows={2}
                    value={invalidatedContradictionText}
                    onChange={(e) => { setInvalidatedContradictionText(e.target.value); setError('') }}
                    data-testid="pre-solver-invalidated-contradiction"
                    className="w-full resize-none rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-green-500 focus:outline-none"
                  />
                  <span className={`mt-1 block text-xs ${wordCount(invalidatedContradictionText) >= 5 ? 'text-green-400' : 'text-gray-500'}`}>
                    {t('pre_solver.words', { count: wordCount(invalidatedContradictionText) })}
                  </span>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-300">
                    {t('pre_solver.invalidated_new_hypothesis_prompt')}
                  </label>
                  <textarea
                    rows={3}
                    value={invalidatedNewHypothesisText}
                    onChange={(e) => { setInvalidatedNewHypothesisText(e.target.value); setError('') }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTestRevisionContinue() } }}
                    data-testid="pre-solver-invalidated-new-hypothesis"
                    className="w-full resize-none rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-green-500 focus:outline-none"
                  />
                  <span className={`mt-1 block text-xs ${wordCount(invalidatedNewHypothesisText) >= 5 ? 'text-green-400' : 'text-gray-500'}`}>
                    {t('pre_solver.words', { count: wordCount(invalidatedNewHypothesisText) })}
                  </span>
                </div>
              </div>
            )}

            {revisionType !== null && (
              <div className="flex items-center justify-between">
                {error && <span className="text-xs text-red-400">{error}</span>}
                <div className="ml-auto">
                  <button
                    type="button"
                    onClick={handleTestRevisionContinue}
                    disabled={revisionType === null}
                    data-testid="pre-solver-start-solving"
                    className="rounded-md bg-green-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-40"
                  >
                    {isLastTestStep ? t('pre_solver.start_solving') : t('pre_solver.next_test')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
    </>
  )
}
