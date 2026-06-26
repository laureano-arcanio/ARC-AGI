import { useTranslation } from '../../../lib/i18n'

type HypothesisPanelProps = {
  hypothesisText: string | null
  isUncertain: boolean
  onRuleFound?: (text: string) => void
}

export function HypothesisPanel({ hypothesisText, isUncertain }: HypothesisPanelProps) {
  const { t } = useTranslation()

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
      ) : (
        <div className="overflow-hidden rounded-xl border border-amber-700/50 bg-gray-900 px-5 py-3">
          <p className="text-sm text-amber-300">
            {t('pre_solver.hypothesis_explorando')}
          </p>
        </div>
      )}
    </div>
  )
}
