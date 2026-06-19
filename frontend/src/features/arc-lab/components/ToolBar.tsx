import { useTranslation } from '../../../lib/i18n'
import type { ToolMode } from '../types'

type ToolBarProps = {
  toolMode: ToolMode
  onChange: (mode: ToolMode) => void
}

const TOOL_KEYS: Array<{ value: ToolMode; labelKey: string }> = [
  { value: 'edit', labelKey: 'tool.edit' },
  { value: 'select', labelKey: 'tool.select' },
  { value: 'floodfill', labelKey: 'tool.flood_fill' },
]

export function ToolBar({ toolMode, onChange }: ToolBarProps) {
  const { t } = useTranslation()

  return (
    <div data-testid="toolbar" className="flex gap-1">
      {TOOL_KEYS.map((tool) => {
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
            {t(tool.labelKey)}
          </button>
        )
      })}
    </div>
  )
}
