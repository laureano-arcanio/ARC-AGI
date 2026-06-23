import { GridDisplay } from './GridDisplay'
import { useTranslation } from '../../../lib/i18n'

type TestInputPanelProps = {
  input: number[][]
  currentIndex: number
  total: number
  showNumbers?: boolean
}

export function TestInputPanel({
  input,
  currentIndex,
  total,
  showNumbers = false,
}: TestInputPanelProps) {
  const { t } = useTranslation()

  return (
    <div
      data-testid="test-input-panel"
      className="overflow-hidden rounded-xl"
    >
      <div className="flex justify-center px-4 py-4" data-testid="evaluation-input">
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
