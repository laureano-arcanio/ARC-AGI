import { Fragment, useMemo, type ReactElement, type ReactNode } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import type { GraphNode } from '../types/arc-graph'

export type TimelineGraphNodeContext = {
  isActive: boolean
  onActivePath: boolean
  activePath: Set<string>
  nodeSize: number
}

type LayoutPos = { nodeId: string; col: number; row: number }

type TimelineGraphProps = {
  nodes: GraphNode[]
  activeNodeId: string | null
  nodeSize: number
  colGap: number
  rowHeight: number
  prioritizeActiveRoot?: boolean
  outerClassName: string
  scrollerClassName?: string
  contentClassName: string
  tooltipClassName?: string
  connectorActiveStroke?: string
  connectorInactiveStroke?: string
  renderNode: (node: GraphNode, context: TimelineGraphNodeContext) => ReactElement
  renderTooltip?: (node: GraphNode, context: TimelineGraphNodeContext) => ReactNode
  isConnectorActive?: (node: GraphNode, context: TimelineGraphNodeContext) => boolean
}

function computeLayout(
  nodes: GraphNode[],
  activeNodeId: string | null,
  prioritizeActiveRoot: boolean,
): {
  positions: Map<string, LayoutPos>
  nodeMap: Map<string, GraphNode>
  numRows: number
  numCols: number
  activePath: Set<string>
} {
  const nodeMap = new Map<string, GraphNode>()
  for (const n of nodes) nodeMap.set(n.id, n)

  const childrenMap = new Map<string | null, GraphNode[]>()
  for (const n of nodes) {
    const key = n.parentId
    if (!childrenMap.has(key)) childrenMap.set(key, [])
    childrenMap.get(key)!.push(n)
  }

  const activePath = new Set<string>()
  let current = activeNodeId
  while (current) {
    activePath.add(current)
    current = nodeMap.get(current)?.parentId ?? null
  }

  const positions = new Map<string, LayoutPos>()
  let nextRow = 1
  let numCols = 0

  function lay(nodeId: string, col: number, row: number): void {
    const node = nodeMap.get(nodeId)
    if (!node) return

    positions.set(nodeId, { nodeId, col, row })
    numCols = Math.max(numCols, col + 1)

    const children = childrenMap.get(nodeId) ?? []
    for (let i = 0; i < children.length; i++) {
      if (i === 0) {
        lay(children[i].id, col + 1, row)
      } else {
        lay(children[i].id, col + 1, nextRow++)
      }
    }
  }

  const roots = childrenMap.get(null) ?? []
  if (roots.length > 0) {
    const firstRoot = prioritizeActiveRoot
      ? roots.find((r) => activePath.has(r.id)) ?? roots[0]
      : roots[0]

    lay(firstRoot.id, 0, 0)
    for (const root of roots) {
      if (!positions.has(root.id)) {
        lay(root.id, 0, nextRow++)
      }
    }
  }

  return { positions, nodeMap, numRows: nextRow, numCols, activePath }
}

function nodeCX(col: number, nodeSize: number, colGap: number) {
  return col * (nodeSize + colGap) + nodeSize / 2
}

function nodeCY(row: number, rowHeight: number) {
  return row * rowHeight + rowHeight / 2
}

export function TimelineGraph({
  nodes,
  activeNodeId,
  nodeSize,
  colGap,
  rowHeight,
  prioritizeActiveRoot = false,
  outerClassName,
  scrollerClassName = 'overflow-x-auto w-full',
  contentClassName,
  tooltipClassName = 'relative z-[100] max-w-64 rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1.5 shadow-lg break-words',
  connectorActiveStroke = 'rgb(59,130,246)',
  connectorInactiveStroke = 'rgb(75,85,99)',
  renderNode,
  renderTooltip,
  isConnectorActive,
}: TimelineGraphProps) {
  const { positions, nodeMap, numRows, numCols, activePath } = useMemo(
    () => computeLayout(nodes, activeNodeId, prioritizeActiveRoot),
    [nodes, activeNodeId, prioritizeActiveRoot],
  )

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

  const connectors = useMemo((): ReactNode[] => {
    const result: ReactNode[] = []
    for (const [nodeId, pos] of positions) {
      const node = nodeMap.get(nodeId)
      if (!node?.parentId) continue
      const parentPos = positions.get(node.parentId)
      if (!parentPos) continue

      const context = {
        isActive: node.id === activeNodeId,
        onActivePath: activeNodeId === null || activePath.has(node.id),
        activePath,
        nodeSize,
      }
      const active = isConnectorActive
        ? isConnectorActive(node, context)
        : activePath.has(node.id) && activePath.has(node.parentId)

      const parentCX = nodeCX(parentPos.col, nodeSize, colGap)
      const parentCY = nodeCY(parentPos.row, rowHeight)
      const childCX = nodeCX(pos.col, nodeSize, colGap)
      const childCY = nodeCY(pos.row, rowHeight)

      let d: string
      if (parentPos.row === pos.row) {
        const parentRight = parentCX + nodeSize / 2
        const childLeft = childCX - nodeSize / 2
        d = `M ${parentRight} ${childCY} L ${childLeft} ${childCY}`
      } else {
        const parentBottom = parentCY + nodeSize / 2
        const childLeft = childCX - nodeSize / 2
        const midY = (parentBottom + childCY) / 2
        d = `M ${parentCX} ${parentBottom} C ${parentCX} ${midY}, ${childLeft} ${midY}, ${childLeft} ${childCY}`
      }

      result.push(
        <path
          key={`${node.parentId}->${nodeId}`}
          d={d}
          fill="none"
          stroke={active ? connectorActiveStroke : connectorInactiveStroke}
          strokeWidth={active ? 2 : 1}
          opacity={active ? 1 : 0.4}
        />,
      )
    }
    return result
  }, [
    positions,
    nodeMap,
    activeNodeId,
    activePath,
    nodeSize,
    colGap,
    rowHeight,
    connectorActiveStroke,
    connectorInactiveStroke,
    isConnectorActive,
  ])

  const totalWidth = numCols > 0 ? numCols * (nodeSize + colGap) - colGap : 0
  const totalHeight = nodes.length > 0 ? numRows * rowHeight : 0

  return (
    <Tooltip.Provider delayDuration={100}>
      <div className={outerClassName}>
        <div className={scrollerClassName}>
          <div className={contentClassName}>
            <div
              className="relative"
              style={{ width: `${totalWidth}px`, height: `${totalHeight}px`, minWidth: '100%' }}
            >
              <svg
                className="absolute inset-0 pointer-events-none overflow-visible"
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

                    const context = {
                      isActive: node.id === activeNodeId,
                      onActivePath: activeNodeId === null || activePath.has(node.id),
                      activePath,
                      nodeSize,
                    }
                    const tooltip = renderTooltip?.(node, context)
                    const nodeElement = renderNode(node, context)

                    return (
                      <div
                        key={node.id}
                        className="absolute"
                        style={{
                          left: `${nodeCX(pos.col, nodeSize, colGap) - nodeSize / 2}px`,
                          top: `${nodeCY(pos.row, rowHeight) - nodeSize / 2}px`,
                        }}
                      >
                        {tooltip ? (
                          <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                              {nodeElement}
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content
                                side="top"
                                align="center"
                                sideOffset={6}
                                collisionPadding={8}
                                className={tooltipClassName}
                              >
                                {tooltip}
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                        ) : (
                          nodeElement
                        )}
                      </div>
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  )
}
