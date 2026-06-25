import { useState } from 'react'
import { useTranslation } from '../../../lib/i18n'

type AhaMomentModalProps = {
  open: boolean
  onSubmit: (text: string) => void
  mode?: 'aha' | 'capture'
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function AhaMomentModal({ open, onSubmit, mode = 'aha' }: AhaMomentModalProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const valid = wordCount(text) >= 5
  const isCapture = mode === 'capture'

  const handleSubmit = () => {
    if (!valid) {
      setError(t('pre_solver.no_text'))
      return
    }
    setError('')
    onSubmit(text.trim())
    setText('')
  }

  return (
    <div
      data-testid="aha-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    >
      <div className="mx-auto w-full max-w-lg rounded-xl border border-amber-700/50 bg-gray-800 p-6 shadow-2xl">
        <h2 className="mb-2 text-lg font-bold text-amber-400">
          {isCapture ? t('post_solve_capture.title') : t('pre_solver.aha_title')}
        </h2>
        <p className="mb-4 text-sm text-gray-300">
          {isCapture ? t('post_solve_capture.subtitle') : t('pre_solver.aha_subtitle')}
        </p>
        <textarea
          ref={(el) => el?.focus()}
          rows={5}
          value={text}
          onChange={(e) => { setText(e.target.value); setError('') }}
          data-testid="aha-textarea"
          placeholder={t('pre_solver.write_rule_placeholder')}
          className="w-full resize-none rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-between">
          {error ? (
            <span className="text-xs text-red-400">{error}</span>
          ) : (
            <span className={`text-xs ${valid ? 'text-green-400' : 'text-gray-500'}`}>
              {t('pre_solver.words', { count: wordCount(text) })}
            </span>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!valid}
            data-testid="aha-submit"
            className="rounded-md bg-amber-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-40"
          >
            {isCapture ? t('post_solve_capture.submit') : t('pre_solver.aha_submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
