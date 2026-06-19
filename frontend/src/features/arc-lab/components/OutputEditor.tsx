import { EditableGrid } from './EditableGrid'
import { ToolBar } from './ToolBar'
import { SymbolPicker } from './SymbolPicker'
import { formatSize } from '../utils'
import type { GridData, ToolMode } from '../types'

type OutputEditorProps = {
  grid: GridData
  toolMode: ToolMode
  selectedSymbol: number
  showNumbers: boolean
  selectedCells: Set<string>
  sizeInput: string
  onSizeInputChange: (value: string) => void
  onResize: () => void
  onCopyFromInput: () => void
  onReset: () => void
  onSubmit: () => void
  onCellClick: (x: number, y: number) => void
  onSelectionChange: (cells: Set<string>) => void
  onToolModeChange: (mode: ToolMode) => void
  onSymbolSelect: (symbol: number) => void
}

export function OutputEditor({
  grid,
  toolMode,
  selectedSymbol,
  showNumbers,
  selectedCells,
  sizeInput,
  onSizeInputChange,
  onResize,
  onCopyFromInput,
  onReset,
  onSubmit,
  onCellClick,
  onSelectionChange,
  onToolModeChange,
  onSymbolSelect,
}: OutputEditorProps) {
  const handleSizeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onResize()
  }

  return (
    <div data-testid="output-editor" className="mt-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Size:</label>
          <input
            type="text"
            value={sizeInput}
            onChange={(e) => onSizeInputChange(e.target.value)}
            onKeyDown={handleSizeKeyDown}
            data-testid="output-grid-size"
            className="w-14 rounded-md border border-gray-700 bg-gray-800 px-2 py-1.5 text-center text-xs text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            placeholder="3x3"
          />
          <button
            type="button"
            onClick={onResize}
            data-testid="resize-btn"
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white"
          >
            Resize
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onCopyFromInput}
            data-testid="copy-from-input"
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white"
          >
            Copy input
          </button>
          <button
            type="button"
            onClick={onReset}
            data-testid="reset-btn"
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onSubmit}
            data-testid="submit-btn"
            className="rounded-md bg-green-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
          >
            Submit!
          </button>
        </div>
      </div>

      <div data-testid="output-grid" className="flex justify-center">
        <EditableGrid
          grid={grid}
          toolMode={toolMode}
          showNumbers={showNumbers}
          selectedCells={selectedCells}
          onCellClick={onCellClick}
          onSelectionChange={onSelectionChange}
        />
      </div>

      <div className="mt-4 flex items-center gap-6">
        <ToolBar toolMode={toolMode} onChange={onToolModeChange} />
        <div className="h-6 w-px bg-gray-800" />
        <SymbolPicker selectedSymbol={selectedSymbol} onSelect={onSymbolSelect} />
      </div>

      <div data-testid="size-readout" className="hidden">
        {formatSize(grid.length, grid[0]?.length ?? 0)}
      </div>
    </div>
  )
}
