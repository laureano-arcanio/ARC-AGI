import type { GraphNode, GraphTrigger } from '../../../shared/types/arc-graph'
import { COLOR_MAP } from '../../../shared/types/arc-graph'

type EventDetailsPanelProps = {
  node: GraphNode | null
  onClose: () => void
}

function triggerToLines(trigger: GraphTrigger): string[] {
  const lines: string[] = []
  if (trigger.kind === 'mechanical') {
    lines.push(`Kind: mechanical`)
    lines.push(`Action: ${trigger.action}`)
    if (trigger.details) {
      for (const [key, val] of Object.entries(trigger.details)) {
        lines.push(`${key}: ${JSON.stringify(val)}`)
      }
    }
  } else {
    lines.push(`Kind: cognitive`)
    lines.push(`Intent: ${trigger.intent}`)
    if (trigger.text) lines.push(`Text: ${trigger.text}`)
  }
  return lines
}

export function EventDetailsPanel({ node, onClose }: EventDetailsPanelProps) {
  if (!node) return null

  const grid = node.stateSnapshot
  const cellSize = Math.max(8, Math.min(24, 240 / Math.max(grid.length, grid[0]?.length ?? 1)))

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Event Details</h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-500 transition hover:bg-gray-800 hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
      </div>

      <div className="mb-3">
        <p className="text-xs text-gray-400">Node: <span className="font-mono text-gray-200">{node.id}</span></p>
        {node.parentId && (
          <p className="text-xs text-gray-400">Parent: <span className="font-mono text-gray-200">{node.parentId}</span></p>
        )}
        <p className="text-xs text-gray-400">Timestamp: <span className="font-mono text-gray-200">{node.timestamp}</span></p>
      </div>

      <div className="mb-3">
        <p className="mb-1 text-xs font-medium text-gray-400">Trigger:</p>
        <div className="rounded border border-gray-700 bg-gray-950 p-2 font-mono text-xs text-gray-300">
          {triggerToLines(node.trigger).map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>

      {grid.length > 0 && grid[0]?.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-gray-400">State Snapshot ({grid.length}x{grid[0].length}):</p>
          <div className="inline-block rounded border border-gray-700 overflow-hidden">
            {grid.map((row, ri) => (
              <div key={ri} className="flex">
                {row.map((cell, ci) => (
                  <div
                    key={ci}
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      backgroundColor: COLOR_MAP[cell] ?? '#555',
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
