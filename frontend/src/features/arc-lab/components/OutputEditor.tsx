import * as Tooltip from '@radix-ui/react-tooltip'
import { ChevronLeft, ChevronRight, ClipboardCopy, ClipboardPaste, Copy, MoveDiagonal, RectangleHorizontal, RotateCcw, Scan, Scissors } from 'lucide-react'
import type { ReactNode } from 'react'
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
  clipboard: GridData | null
  sizeInput: string
  readOnly?: boolean
  onSizeInputChange: (value: string) => void
  onResize: () => void
  onCopyFromInput: () => void
  onCellClick: (x: number, y: number) => void
  onSelectionChange: (cells: Set<string>) => void
  onToolModeChange: (mode: ToolMode) => void
  onSymbolSelect: (symbol: number) => void
  onCopySelection: () => void
  onCutSelection: () => void
  onPasteSelection: () => void
  onReset: () => void
  onPrev: () => void
  onNext: () => void
  canGoPrev: boolean
  canGoNext: boolean
}

function Tip({ label, desc, children }: { label: string; desc: string; children: ReactNode }) {
  return (
    <Tooltip.Root delayDuration={0}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="bottom"
          align="center"
          sideOffset={4}
          collisionPadding={8}
          className="z-50 max-w-48 rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1.5 shadow-lg"
        >
          <p className="text-xs font-medium text-gray-200">{label}</p>
          <p className="text-[10px] text-gray-400">{desc}</p>
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export function OutputEditor({
  grid,
  toolMode,
  selectedSymbol,
  showNumbers = false,
  selectedCells,
  clipboard,
  sizeInput,
  readOnly = false,
  onSizeInputChange,
  onResize,
  onCopyFromInput,
  onCellClick,
  onSelectionChange,
  onToolModeChange,
  onSymbolSelect,
  onCopySelection,
  onCutSelection,
  onPasteSelection,
  onReset,
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
    <Tooltip.Provider delayDuration={0}>
    <div data-testid="output-editor" className="p-4">
      <div className="flex items-center justify-center gap-2">
        <Tip label={t('button.prev')} desc={t('tooltip.prev')}>
          <button
            type="button"
            onClick={onPrev}
            disabled={!canGoPrev}
            data-testid="prev-btn"
            className="shrink-0 rounded-md border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
        </Tip>

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

        <Tip label={t('button.next')} desc={t('tooltip.next')}>
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext}
            data-testid="next-btn"
            className="shrink-0 rounded-md border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </Tip>
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
          <Tip label={t('button.resize')} desc={t('tooltip.resize')}>
            <button
              type="button"
              onClick={onResize}
              disabled={readOnly}
              data-testid="resize-btn"
              className="shrink-0 rounded-md border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-40"
            >
              <MoveDiagonal size={14} />
            </button>
          </Tip>
          <Tip label={t('button.copy_input')} desc={t('tooltip.copy_input')}>
            <button
              type="button"
              onClick={onCopyFromInput}
              disabled={readOnly}
              data-testid="copy-from-input"
              className="shrink-0 rounded-md border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-40"
            >
              <ClipboardCopy size={14} />
            </button>
          </Tip>
          <Tip label={t('button.select_object')} desc={t('tooltip.select_object')}>
            <button
              type="button"
              onClick={() => onToolModeChange('object_select')}
              disabled={readOnly}
              aria-pressed={toolMode === 'object_select'}
              data-testid="select-object-btn"
              className={`shrink-0 rounded-md border p-2 transition disabled:opacity-40 ${
                toolMode === 'object_select'
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Scan size={14} />
            </button>
          </Tip>
          <Tip label={t('button.select_area')} desc={t('tooltip.select_area')}>
            <button
              type="button"
              onClick={() => onToolModeChange('area_select')}
              disabled={readOnly}
              aria-pressed={toolMode === 'area_select'}
              data-testid="select-area-btn"
              className={`shrink-0 rounded-md border p-2 transition disabled:opacity-40 ${
                toolMode === 'area_select'
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <RectangleHorizontal size={14} />
            </button>
          </Tip>
          <Tip label={t('button.copy')} desc={t('tooltip.copy')}>
            <button
              type="button"
              onClick={onCopySelection}
              disabled={readOnly || selectedCells.size === 0}
              data-testid="copy-selection-btn"
              className="shrink-0 rounded-md border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Copy size={14} />
            </button>
          </Tip>
          <Tip label={t('button.cut')} desc={t('tooltip.cut')}>
            <button
              type="button"
              onClick={onCutSelection}
              disabled={readOnly || selectedCells.size === 0}
              data-testid="cut-selection-btn"
              className="shrink-0 rounded-md border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Scissors size={14} />
            </button>
          </Tip>
          <Tip label={t('button.paste')} desc={t('tooltip.paste')}>
            <button
              type="button"
              onClick={onPasteSelection}
              disabled={readOnly || !clipboard}
              data-testid="paste-selection-btn"
              className="shrink-0 rounded-md border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ClipboardPaste size={14} />
            </button>
          </Tip>
          <span className="mx-1 h-5 w-px bg-gray-700" />
          <Tip label={t('button.reset')} desc={t('tooltip.reset')}>
            <button
              type="button"
              onClick={onReset}
              disabled={readOnly}
              data-testid="reset-btn"
              className="shrink-0 rounded-md border border-gray-700 bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-40"
            >
              <RotateCcw size={14} />
            </button>
          </Tip>
        </div>
      </div>

      <div data-testid="size-readout" className="hidden">
        {formatSize(grid.length, grid[0]?.length ?? 0)}
      </div>
    </div>
    </Tooltip.Provider>
  )
}