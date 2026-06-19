import { GridDisplay } from './GridDisplay'
import { gridHeight, gridWidth } from '../utils'
import { useTranslation } from '../../../lib/i18n'
import type { TaskPair } from '../types'

type DemonstrationPanelProps = {
  pairs: TaskPair[]
  showNumbers?: boolean
}

export function DemonstrationPanel({ pairs, showNumbers = false }: DemonstrationPanelProps) {
  const { t } = useTranslation()

  return (
    <div
      data-testid="demonstration-panel"
      className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900"
    >
      <div className="border-b border-gray-800 bg-gray-800/50 px-4 py-3 text-center text-sm font-semibold text-gray-200">
        {t('panel.demonstration')}
      </div>

      <div>
        {pairs.map((pair, i) => {
          const inputH = gridHeight(pair.input)
          const inputW = gridWidth(pair.input)
          const outputH = gridHeight(pair.output)
          const outputW = gridWidth(pair.output)
          return (
            <div
              key={i}
              data-testid={`pair-${i}`}
              className="flex items-center gap-6 border-b border-gray-800/50 p-4 last:border-b-0"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                  {t('panel.input')} <span className="text-gray-400">{inputH}×{inputW}</span>
                </span>
                <div data-testid={`pair-${i}-input`}>
                  <GridDisplay grid={pair.input} showNumbers={showNumbers} containerSize={190} />
                </div>
              </div>
              <div className="text-gray-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                  {t('panel.output')} <span className="text-gray-400">{outputH}×{outputW}</span>
                </span>
                <div data-testid={`pair-${i}-output`}>
                  <GridDisplay grid={pair.output} showNumbers={showNumbers} containerSize={190} />
                </div>
              </div>
            </div>
          )
        })}
        {pairs.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-gray-500">
            {t('panel.empty')}
          </div>
        )}
      </div>
    </div>
  )
}
