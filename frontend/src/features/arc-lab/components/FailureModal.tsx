import { useEffect, useState } from 'react'
import { useTranslation } from '../../../lib/i18n'

type FailureModalProps = {
  open: boolean
  onHypothesisWrong: (text: string) => void
  onPaintMistake: () => void
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function FailureModal({ open, onHypothesisWrong, onPaintMistake }: FailureModalProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'choice' | 'input'>('choice')
  const [inputText, setInputText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setStep('choice')
      setInputText('')
      setError('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onPaintMistake()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onPaintMistake])

  if (!open) return null

  const valid = wordCount(inputText) >= 5

  const handleSubmit = () => {
    if (!valid) {
      setError(t('pre_solver.no_text'))
      return
    }
    setError('')
    setStep('choice')
    setInputText('')
    onHypothesisWrong(inputText.trim())
  }

  return (
    <div
      data-testid="failure-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    >
      <div className="mx-auto w-full max-w-md rounded-xl border border-red-700/50 bg-gray-800 p-6 shadow-2xl">
        {step === 'choice' ? (
          <>
            <h2 className="mb-4 text-base font-semibold text-gray-100">
              {t('failure_modal.question')}
            </h2>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setStep('input')}
                data-testid="failure-modal-hypothesis-wrong"
                className="rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                {t('failure_modal.hypothesis_wrong')}
              </button>
              <button
                type="button"
                onClick={onPaintMistake}
                data-testid="failure-modal-paint-mistake"
                className="rounded-md border border-gray-700 bg-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-gray-600"
              >
                {t('failure_modal.paint_mistake')}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-4 text-base font-semibold text-gray-100">
              {t('failure_modal.hypothesis_wrong')}
            </h2>
            <textarea
              ref={(el) => el?.focus()}
              rows={4}
              value={inputText}
              onChange={(e) => { setInputText(e.target.value); setError('') }}
              data-testid="failure-modal-input"
              placeholder={t('failure_modal.new_hypothesis_placeholder')}
              className="w-full resize-none rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-red-500 focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-between">
              {error ? (
                <span className="text-xs text-red-400">{error}</span>
              ) : (
                <span className={`text-xs ${valid ? 'text-green-400' : 'text-gray-500'}`}>
                  {t('pre_solver.words', { count: wordCount(inputText) })}
                </span>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onPaintMistake}
                  className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700"
                >
                  {t('dialog.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!valid}
                  data-testid="failure-modal-submit"
                  className="rounded-md bg-red-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-40"
                >
                  {t('failure_modal.submit')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
