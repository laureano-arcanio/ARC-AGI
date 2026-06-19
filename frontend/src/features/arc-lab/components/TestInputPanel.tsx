import { GridDisplay } from './GridDisplay'
import { gridHeight, gridWidth } from '../utils'
import { useTranslation } from '../../../lib/i18n'

type TestInputPanelProps = {
  input: number[][]
  currentIndex: number
  total: number
  showNumbers?: boolean
  onNext: () => void
}

export function TestInputPanel({
  input,
  currentIndex,
  total,
  showNumbers = false,
  onNext,
}: TestInputPanelProps) {
  const { t } = useTranslation()

  return (
    <div
      data-testid="test-input-panel"
      className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900"
    >
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-800/50 px-4 py-3">
        <span className="text-sm font-semibold text-gray-200">
          {t('panel.test_input')}{' '}
          <span className="text-gray-400">{gridHeight(input)}×{gridWidth(input)}</span>{' '}
          <span className="text-gray-400">{currentIndex + 1}/{total}</span>
        </span>
        <button
          type="button"
          onClick={onNext}
          data-testid="next-test-input"
          disabled={total <= 1}
          className="rounded-md bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('button.next_test')}
        </button>
      </div>
      <div className="flex justify-center p-4" data-testid="evaluation-input">
        <GridDisplay grid={input} showNumbers={showNumbers} containerSize={500} maxCellSize={120} />
      </div>
      {total > 1 && currentIndex < total - 1 && (
        <div className="border-t border-yellow-800/50 bg-yellow-950/30 px-4 py-2 text-xs text-yellow-400">
          {t('panel.multi_test_warning')}
        </div>
      )}
    </div>
  )
}
