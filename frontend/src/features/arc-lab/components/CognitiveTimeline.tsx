import { useTranslation } from '../../../lib/i18n'
import { TimelineGraph } from '../../../shared/components/TimelineGraph'
import {
  getTimelineColorsUsed,
  getTimelineNodeClassName,
  getTimelineNodeMeta,
  isPreSolverTrigger,
} from '../../../shared/components/timelineGraphVisuals'
import type { GraphNode, GraphTrigger } from '../types'

// ---- constants ----

const NODE_SIZE = 28
const COL_GAP = 12
const ROW_H = 36

type CognitiveTimelineProps = {
  nodes: GraphNode[]
  activeNodeId: string | null
  onNodeClick: (nodeId: string) => void
  getLabel: (trigger: GraphTrigger) => string
  testCount?: number
  currentTestIndex?: number
  onTestSelect?: (index: number) => void
}

export function CognitiveTimeline({
  nodes,
  activeNodeId,
  onNodeClick,
  getLabel,
  testCount = 0,
  currentTestIndex = 0,
  onTestSelect,
}: CognitiveTimelineProps) {
  const { t } = useTranslation()

  return (
    <div data-testid="cognitive-timeline">
      {testCount > 1 && (
        <div className="mb-2 mt-4 flex items-center gap-2">
          <span className="text-xs text-gray-400">{t('timeline.test')}</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: testCount }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onTestSelect?.(i)}
                className={`rounded-md px-2.5 py-0.5 text-xs font-medium transition ${
                  i === currentTestIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
      <span className="mb-2 block text-sm font-semibold text-gray-200">
        {t('timeline.title')}
      </span>

      <TimelineGraph
        nodes={nodes}
        activeNodeId={activeNodeId}
        nodeSize={NODE_SIZE}
        colGap={COL_GAP}
        rowHeight={ROW_H}
        prioritizeActiveRoot
        outerClassName="w-full rounded-xl border border-gray-800 bg-gray-900 overflow-visible"
        contentClassName="overflow-visible px-4 py-3"
        renderNode={(node, { isActive, onActivePath, nodeSize }) => {
          const { icon, color } = getTimelineNodeMeta(node.trigger)
          const isPreSolver = isPreSolverTrigger(node.trigger)
          const className = getTimelineNodeClassName({
            color,
            isActive,
            onActivePath,
            isDashed: isPreSolver,
            isClickable: !isPreSolver,
          })
          const style = { width: `${nodeSize}px`, height: `${nodeSize}px` }

          if (isPreSolver) {
            return (
              <div
                data-testid={`timeline-node-${node.id}`}
                className={className}
                style={style}
              >
                {icon}
              </div>
            )
          }

          return (
            <button
              type="button"
              data-testid={`timeline-node-${node.id}`}
              onClick={() => onNodeClick(node.id)}
              className={className}
              style={style}
            >
              {icon}
            </button>
          )
        }}
        renderTooltip={(node) => {
          const swatches = getTimelineColorsUsed(node.trigger)

          return (
            <>
              <span className="text-[11px] text-gray-300 block">{getLabel(node.trigger)}</span>
              {swatches.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {swatches.map((c, i) => (
                    <span
                      key={i}
                      className="w-3 h-3 rounded-sm border border-gray-500 shrink-0"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
            </>
          )
        }}
      />
    </div>
  )
}
