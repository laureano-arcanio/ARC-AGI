import { TimelineGraph } from '../../../shared/components/TimelineGraph'
import {
  getTimelineNodeClassName,
  getTimelineNodeMeta,
} from '../../../shared/components/timelineGraphVisuals'
import type { GraphNode, GraphTrigger } from '../../../shared/types/arc-graph'

const NODE_SIZE = 36
const COL_GAP = 20
const ROW_H = 48

type EventGraphProps = {
  nodes: GraphNode[]
  activeNodeId: string | null
  onNodeClick: (nodeId: string) => void
  getLabel: (trigger: GraphTrigger) => string
}

export function EventGraph({ nodes, activeNodeId, onNodeClick, getLabel }: EventGraphProps) {
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-gray-800 bg-gray-900/50 px-6 py-16">
        <p className="text-gray-500">No events to display.</p>
      </div>
    )
  }

  return (
    <TimelineGraph
      nodes={nodes}
      activeNodeId={activeNodeId}
      nodeSize={NODE_SIZE}
      colGap={COL_GAP}
      rowHeight={ROW_H}
      outerClassName="w-full rounded-lg border border-gray-800 bg-gray-900/50"
      contentClassName="overflow-visible px-6 py-4"
      renderNode={(node, { isActive, onActivePath, nodeSize }) => {
        const { icon, color } = getTimelineNodeMeta(node.trigger)
        const className = getTimelineNodeClassName({
          color,
          isActive,
          onActivePath,
        })

        return (
          <button
            type="button"
            onClick={() => onNodeClick(node.id)}
            className={className}
            style={{
              width: `${nodeSize}px`,
              height: `${nodeSize}px`,
            }}
          >
            {icon}
          </button>
        )
      }}
      renderTooltip={(node) => (
        <>
          <span className="text-xs text-gray-200 block">{getLabel(node.trigger)}</span>
          <span className="text-[10px] text-gray-400 block">{node.id}</span>
          {node.testPairIndex !== undefined && (
            <span className="text-[10px] text-gray-500 block">Test {node.testPairIndex + 1}</span>
          )}
        </>
      )}
    />
  )
}
