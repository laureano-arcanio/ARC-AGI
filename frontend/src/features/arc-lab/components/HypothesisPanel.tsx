import { useState } from 'react'
import { useTranslation } from '../../../lib/i18n'

type HypothesisPanelProps = {
  hypothesisText: string | null
  isUncertain: boolean
  onRuleFound: (text: string) => void
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function HypothesisPanel({ hypothesisText, isUncertain, onRuleFound }: HypothesisPanelProps) {
  const { t } = useTranslation()
  const [showInput, setShowInput] = useState(false)
  const [inputText, setInputText] = useState('')

  if (!hypothesisText && !isUncertain) return null

  return (
    <div data-testid="hypothesis-panel">
      <span className="mb-2 mt-4 block text-sm font-semibold text-gray-200">
        {t('panel.hypothesis')}
      </span>

      {hypothesisText ? (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
          <p className="text-sm text-gray-300 leading-relaxed">{hypothesisText}</p>
        </div>
      ) : showInput ? (
        <div className="overflow-hidden rounded-xl border border-amber-700/50 bg-gray-900 px-5 py-4">
          <textarea
            ref={(el) => el?.focus()}
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            data-testid="hypothesis-panel-input"
            placeholder={t('pre_solver.write_rule_placeholder')}
            className="w-full resize-none rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-green-500 focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-xs ${wordCount(inputText) >= 5 ? 'text-green-400' : 'text-gray-500'}`}>
              {t('pre_solver.words', { count: wordCount(inputText) })}
            </span>
            <button
              type="button"
              onClick={() => { onRuleFound(inputText.trim()); setShowInput(false); setInputText('') }}
              disabled={wordCount(inputText) < 5}
              data-testid="hypothesis-panel-submit"
              className="rounded-md bg-green-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-40"
            >
              {t('pre_solver.record')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 overflow-hidden rounded-xl border border-amber-700/50 bg-gray-900 px-5 py-3">
          <span className="text-sm text-amber-300">
            {t('pre_solver.hypothesis_explorando')}
          </span>
          <button
            type="button"
            onClick={() => setShowInput(true)}
            data-testid="hypothesis-panel-have-rule"
            className="ml-auto rounded-md bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
          >
            {t('pre_solver.have_rule')}
          </button>
        </div>
      )}
    </div>
  )
}
