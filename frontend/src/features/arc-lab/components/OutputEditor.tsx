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
  hypothesisText: string
  onHypothesisChange: (value: string) => void
  onHypothesisSubmit: () => void
  onSizeInputChange: (value: string) => void
  onResize: () => void
  onCopyFromInput: () => void
  onReset: () => void
  onSubmit: () => void
  onAbandon: () => void
  onCellClick: (x: number, y: number) => void
  onSelectionChange: (cells: Set<string>) => void
  onToolModeChange: (mode: ToolMode) => void
  onSymbolSelect: (symbol: number) => void
}

export function OutputEditor({
  grid,
  toolMode,
  selectedSymbol,
  showNumbers = false,
  selectedCells,
  sizeInput,
  readOnly = false,
  hypothesisText,
  onHypothesisChange,
  onHypothesisSubmit,
  onSizeInputChange,
  onResize,
  onCopyFromInput,
  onReset,
  onSubmit,
  onAbandon,
  onCellClick,
  onSelectionChange,
  onToolModeChange,
  onSymbolSelect,
}: OutputEditorProps) {
  const { t } = useTranslation()
  const wordCount = hypothesisText.trim().split(/\s+/).filter(Boolean).length
  const canSubmit = wordCount >= 5

  const handleSizeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onResize()
  }

  return (
    <div data-testid="output-editor" className="mt-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onAbandon}
          data-testid="abandon-btn"
          className="rounded-md bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
        >
          {t('button.abandon')}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          data-testid="submit-btn"
          className="rounded-md bg-green-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
        >
          {t('button.submit')}
        </button>
      </div>

      <div data-testid="output-grid" className="relative flex justify-center">
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
        {readOnly && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[30rem] rounded-xl border border-gray-600 bg-gray-800 p-4 shadow-xl">
              <label className="mb-1.5 block text-xs font-medium text-gray-300">
                {t('hypothesis.label')}
              </label>
              <textarea
                rows={5}
                value={hypothesisText}
                onChange={(e) => onHypothesisChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onHypothesisSubmit()
                  }
                }}
                placeholder={t('hypothesis.placeholder')}
                data-testid="hypothesis-textarea"
                className="w-full resize-none rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-green-500 focus:outline-none"
              />
              <div className="mt-1.5 flex items-center justify-between">
                <span className={`text-xs ${canSubmit ? 'text-green-400' : 'text-gray-500'}`}>
                  {t('hypothesis.words', { count: wordCount })}
                </span>
                <button
                  type="button"
                  onClick={onHypothesisSubmit}
                  disabled={!canSubmit}
                  data-testid="hypothesis-submit"
                  className="rounded-md bg-green-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-40"
                >
                  {t('hypothesis.submit')}
                </button>
              </div>
            </div>
          </div>
        )}
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
            onClick={onReset}
            disabled={readOnly}
            data-testid="reset-btn"
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-40"
          >
            {t('button.reset')}
          </button>
        </div>
      </div>

      <div data-testid="size-readout" className="hidden">
        {formatSize(grid.length, grid[0]?.length ?? 0)}
      </div>
    </div>
  )
}
