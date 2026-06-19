import type { ToolMode } from '../types'

type ToolBarProps = {
  toolMode: ToolMode
  onChange: (mode: ToolMode) => void
}

const TOOLS: Array<{ value: ToolMode; label: string }> = [
  { value: 'edit', label: 'Edit' },
  { value: 'select', label: 'Select' },
  { value: 'floodfill', label: 'Flood fill' },
]

export function ToolBar({ toolMode, onChange }: ToolBarProps) {
  return (
    <div data-testid="toolbar" className="flex gap-1">
      {TOOLS.map((tool) => {
        const active = toolMode === tool.value
        return (
          <button
            key={tool.value}
            type="button"
            onClick={() => onChange(tool.value)}
            data-testid={`tool-${tool.value}`}
            aria-pressed={active}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            {tool.label}
          </button>
        )
      })}
    </div>
  )
}
