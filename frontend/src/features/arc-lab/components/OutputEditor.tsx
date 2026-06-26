import { ChevronLeft, ChevronRight } from 'lucide-react'
import { EditableGrid } from './EditableGrid'
import { SymbolPicker } from './SymbolPicker'
import { formatSize } from '../utils'
import { useTranslation } from '../../../lib/i18n'
import type { GridData, ToolMode } from '../types'

type OutputEditorProps = {
  grid: GridData
  toolMode: ToolMode
  selectedSymbol: number
  showNumbers?: boolean
  selectedCells: Set<string>
  sizeInput: string
  readOnly?: boolean
  onSizeInputChange: (value: string) => void
  onResize: () => void
  onCopyFromInput: () => void
  onCellClick: (x: number, y: number) => void
  onSelectionChange: (cells: Set<string>) => void
  onToolModeChange: (mode: ToolMode) => void
  onSymbolSelect: (symbol: number) => void
  onPrev: () => void
  onNext: () => void
  canGoPrev: boolean
  canGoNext: boolean
}

export function OutputEditor({
  grid,
  toolMode,
  selectedSymbol,
  showNumbers = false,
  selectedCells,
  sizeInput,
  readOnly = false,
  onSizeInputChange,
  onResize,
  onCopyFromInput,
  onCellClick,
  onSelectionChange,
  onToolModeChange,
  onSymbolSelect,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
}: OutputEditorProps) {
  const { t } = useTranslation()

  const handleSizeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onResize()
  }

  return (
    <div data-testid="output-editor" className="p-4">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canGoPrev}
          data-testid="prev-btn"
          className="shrink-0 rounded-md border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-30"
          title={t('button.prev')}
        >
          <ChevronLeft size={16} />
        </button>

        <div data-testid="output-grid" className="relative">
          <EditableGrid
              grid={grid}
              toolMode={toolMode}
              showNumbers={showNumbers}
              selectedCells={selectedCells}
              readOnly={readOnly}
              onCellClick={onCellClick}
              onSelectionChange={onSelectionChange}
              onToolModeChange={onToolModeChange}
            />
          </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          data-testid="next-btn"
          className="shrink-0 rounded-md border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-30"
          title={t('button.next')}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-6">
        <SymbolPicker selectedSymbol={selectedSymbol} onSelect={onSymbolSelect} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">{t('label.size')}</label>
          <input
            type="text"
            value={sizeInput}
            onChange={(e) => onSizeInputChange(e.target.value)}
            onKeyDown={handleSizeKeyDown}
            disabled={readOnly}
            data-testid="output-grid-size"
            className="w-14 rounded-md border border-gray-700 bg-gray-800 px-2 py-1.5 text-center text-xs text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none disabled:opacity-40"
            placeholder="3x3"
          />
          <button
            type="button"
            onClick={onResize}
            disabled={readOnly}
            data-testid="resize-btn"
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-40"
          >
            {t('button.resize')}
          </button>
          <button
            type="button"
            onClick={onCopyFromInput}
            disabled={readOnly}
            data-testid="copy-from-input"
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-40"
          >
            {t('button.copy_input')}
          </button>
          <button
            type="button"
            onClick={() => onToolModeChange('object_select')}
            disabled={readOnly}
            aria-pressed={toolMode === 'object_select'}
            data-testid="select-object-btn"
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
              toolMode === 'object_select'
                ? 'border border-blue-500 bg-blue-600 text-white'
                : 'border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {t('button.select_object')}
          </button>
        </div>
      </div>

      <div data-testid="size-readout" className="hidden">
        {formatSize(grid.length, grid[0]?.length ?? 0)}
      </div>
    </div>
  )
}
