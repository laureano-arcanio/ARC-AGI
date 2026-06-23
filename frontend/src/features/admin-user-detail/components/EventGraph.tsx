import { useMemo, Fragment } from 'react'
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

type LayoutPos = { nodeId: string; col: number; row: number }

function computeLayout(nodes: GraphNode[]): {
  positions: Map<string, LayoutPos>
  numRows: number
  numCols: number
} {
  const childrenMap = new Map<string | null, GraphNode[]>()
  for (const n of nodes) {
    const key = n.parentId
    if (!childrenMap.has(key)) childrenMap.set(key, [])
    childrenMap.get(key)!.push(n)
  }

  const positions = new Map<string, LayoutPos>()
  let nextRow = 1
  let numCols = 0

  function lay(nodeId: string, col: number, row: number): void {
    const entry = nodes.find((n) => n.id === nodeId)
    if (!entry) return
    positions.set(nodeId, { nodeId, col, row })
    numCols = Math.max(numCols, col + 1)
    const children = childrenMap.get(nodeId) ?? []
    if (children.length === 0) return
    for (let i = 0; i < children.length; i++) {
      if (i === 0) {
        lay(children[i].id, col + 1, row)
      } else {
        lay(children[i].id, col + 1, nextRow++)
      }
    }
  }

  const roots = childrenMap.get(null) ?? []
  for (const r of roots) {
    lay(r.id, 0, nextRow - 1)
    nextRow++
  }

  return { positions, numRows: nextRow, numCols }
}

function nodeCX(col: number) {
  return col * (NODE_SIZE + COL_GAP) + NODE_SIZE / 2
}

function nodeCY(row: number) {
  return row * ROW_H + ROW_H / 2
}

function nodeColor(kind: string, result: string): string {
  if (result === 'correct') return '#28a745'
  if (result === 'wrong') return '#dc3545'
  if (kind === 'cognitive') return '#50c878'
  return '#4a9eff'
}

function nodeBorder(kind: string, result: string): string {
  if (result === 'correct') return '#1e7e34'
  if (result === 'wrong') return '#b02a37'
  if (kind === 'cognitive') return '#3a9e5e'
  return '#3a7bd5'
}

export function EventGraph({ nodes, activeNodeId, onNodeClick, getLabel }: EventGraphProps) {
  const { positions, numRows, numCols } = useMemo(
    () => computeLayout(nodes),
    [nodes],
  )

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>()
    for (const n of nodes) map.set(n.id, n)
    return map
  }, [nodes])

  const rows = useMemo(() => {
    const r: LayoutPos[][] = Array.from({ length: numRows }, () => [])
    for (const pos of positions.values()) {
      r[pos.row].push(pos)
    }
    for (const row of r) {
      row.sort((a, b) => a.col - b.col)
    }
    return r
  }, [positions, numRows])

  const connectors = useMemo(() => {
    const result: React.ReactNode[] = []
    for (const [nodeId, pos] of positions) {
      const node = nodeMap.get(nodeId)
      if (!node?.parentId) continue
      const parentPos = positions.get(node.parentId)
      if (!parentPos) continue

      const isActive = node.id === activeNodeId
      const parentCX = nodeCX(parentPos.col)
      const parentCY = nodeCY(parentPos.row)
      const childCX = nodeCX(pos.col)
      const childCY = nodeCY(pos.row)

      let d: string
      if (parentPos.row === pos.row) {
        const parentRight = parentCX + NODE_SIZE / 2
        const childLeft = childCX - NODE_SIZE / 2
        d = `M ${parentRight} ${childCY} L ${childLeft} ${childCY}`
      } else {
        const parentBottom = parentCY + NODE_SIZE / 2
        const childLeft = childCX - NODE_SIZE / 2
        const midY = (parentBottom + childCY) / 2
        d = `M ${parentCX} ${parentBottom} C ${parentCX} ${midY}, ${childLeft} ${midY}, ${childLeft} ${childCY}`
      }

      result.push(
        <path
          key={`${node.parentId}->${nodeId}`}
          d={d}
          fill="none"
          stroke={isActive ? '#60a5fa' : '#6b7280'}
          strokeWidth={isActive ? 2 : 1}
          opacity={isActive ? 1 : 0.4}
        />,
      )
    }
    return result
  }, [positions, nodeMap, activeNodeId])

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-gray-800 bg-gray-900/50 px-6 py-16">
        <p className="text-gray-500">No events to display.</p>
      </div>
    )
  }

  const totalWidth = numCols * (NODE_SIZE + COL_GAP) - COL_GAP
  const totalHeight = numRows * ROW_H

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-800 bg-gray-900/50">
      <div className="overflow-visible px-6 py-4">
        <div
          className="relative"
          style={{ width: `${totalWidth}px`, height: `${totalHeight}px`, minWidth: '100%' }}
        >
          <svg
            className="pointer-events-none absolute inset-0 overflow-visible"
            width={totalWidth}
            height={totalHeight}
          >
            {connectors}
          </svg>

          {rows.map((rowNodes, rowIdx) => (
            <Fragment key={rowIdx}>
              {rowNodes.map((pos) => {
                const node = nodeMap.get(pos.nodeId)
                if (!node) return null
                const isActive = node.id === activeNodeId
                const kind = node.trigger.kind
                const result = (() => {
                  if (kind === 'mechanical' && node.trigger.details?.correct === true) return 'correct'
                  if (kind === 'mechanical' && node.trigger.details?.correct === false) return 'wrong'
                  return 'none'
                })()
                const label = getLabel(node.trigger)
                const testIdx = node.testPairIndex

                return (
                  <div
                    key={node.id}
                    className="absolute group"
                    style={{
                      left: `${nodeCX(pos.col) - NODE_SIZE / 2}px`,
                      top: `${nodeCY(pos.row) - NODE_SIZE / 2}px`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onNodeClick(node.id)}
                      className="flex items-center justify-center rounded-full border-2 transition-all hover:scale-110"
                      style={{
                        width: `${NODE_SIZE}px`,
                        height: `${NODE_SIZE}px`,
                        backgroundColor: isActive ? '#3b82f6' : nodeColor(kind, result),
                        borderColor: isActive ? '#93c5fd' : nodeBorder(kind, result),
                        transform: isActive ? 'scale(1.15)' : undefined,
                        boxShadow: isActive ? '0 0 12px rgba(59,130,246,0.5)' : undefined,
                      }}
                    >
                      <span className="text-[10px] font-bold text-white leading-none pointer-events-none">
                        {result === 'correct' && '✓'}
                        {result === 'wrong' && '✗'}
                        {result === 'none' && kind === 'cognitive' && '💡'}
                        {result === 'none' && kind === 'mechanical' && '⚙'}
                      </span>
                    </button>
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center gap-1 z-[100]">
                      <div className="rounded-lg bg-gray-800 border border-gray-700 px-2.5 py-1.5 shadow-lg whitespace-nowrap">
                        <span className="text-xs text-gray-200 block">{label}</span>
                        <span className="text-[10px] text-gray-400 block">{node.id}</span>
                        {testIdx !== undefined && (
                          <span className="text-[10px] text-gray-500 block">Test {testIdx + 1}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
