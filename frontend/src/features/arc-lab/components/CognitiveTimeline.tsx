import { useMemo, Fragment, type ReactNode, type SVGProps } from 'react'
import { useTranslation } from '../../../lib/i18n'
import type { GraphNode, GraphTrigger, MechanicalAction } from '../types'
import { COLOR_MAP } from '../types'

// ---- inline SVG icons (16x16, stroke currentColor) ----

function IconSvg({ children, size = 18, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

const FlagIcon = () => (
  <IconSvg>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </IconSvg>
)

const BulbIcon = () => (
  <IconSvg>
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </IconSvg>
)

const PencilIcon = () => (
  <IconSvg>
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    <path d="m15 5 4 4" />
  </IconSvg>
)

const FillIcon = () => (
  <IconSvg>
    <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0z" />
    <path d="m5 2 5 5" />
    <path d="M2 13h15" />
    <path d="M22 20a2 2 0 1 1-4 0 2 2 0 0 1 4 0" />
  </IconSvg>
)

const PasteIcon = () => (
  <IconSvg>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </IconSvg>
)

const ResizeIcon = () => (
  <IconSvg>
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </IconSvg>
)

const CopyInIcon = () => (
  <IconSvg>
    <path d="M21 15v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8" />
    <polyline points="17 2 21 6 17 10" />
    <line x1="12" y1="10" x2="21" y2="10" />
  </IconSvg>
)

const ResetIcon = () => (
  <IconSvg>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </IconSvg>
)

const CheckIcon = () => (
  <IconSvg>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </IconSvg>
)

const NotesIcon = () => (
  <IconSvg>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </IconSvg>
)


const XMarkIcon = () => (
  <IconSvg>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </IconSvg>
)


const AbandonIcon = () => (
  <IconSvg>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </IconSvg>
)

const MultiIcon = () => (
  <IconSvg>
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    <path d="m15 5 4 4" />
  </IconSvg>
)

// ---- color swatches helper ----

function getColorsUsed(trigger: GraphTrigger): string[] {
  if (trigger.kind === 'mechanical') {
    if (trigger.action === 'cell_click') {
      const cells = (trigger.details?.cells as Array<{ symbol: number }>) ?? []
      return [...new Set(cells.map((c) => COLOR_MAP[c.symbol] ?? '#555'))]
    }
    if (trigger.action === 'fill_selected') {
      const s = Number(trigger.details?.symbol ?? -1)
      return s >= 0 ? [COLOR_MAP[s] ?? '#555'] : []
    }
  }
  return []
}

// ---- icon assignment ----

type IconColor = 'neutral' | 'success' | 'error' | 'warning' | 'active'

function getNodeMeta(trigger: GraphTrigger): {
  icon: ReactNode
  color: IconColor
} {
  if (trigger.kind === 'cognitive') {
    switch (trigger.intent) {
      case 'hypothesis':
        return { icon: <BulbIcon />, color: 'warning' }
      case 'correct_analysis':
        return { icon: <CheckIcon />, color: 'success' }
      case 'failure_analysis':
        return { icon: <NotesIcon />, color: 'error' }
      case 'branch_pivot':
        return { icon: <NotesIcon />, color: 'warning' }
    }
  }
  const action = trigger.action as MechanicalAction
  switch (action) {
    case 'load_task':
      return { icon: <FlagIcon />, color: 'neutral' }
    case 'cell_click': {
      const cells = (trigger.details?.cells as Array<unknown>) ?? []
      return { icon: cells.length > 1 ? <MultiIcon /> : <PencilIcon />, color: 'neutral' }
    }
    case 'fill_selected':
      return { icon: <FillIcon />, color: 'neutral' }
    case 'paste':
      return { icon: <PasteIcon />, color: 'neutral' }
    case 'resize':
      return { icon: <ResizeIcon />, color: 'neutral' }
    case 'copy_from_input':
      return { icon: <CopyInIcon />, color: 'neutral' }
    case 'reset_output':
      return { icon: <ResetIcon />, color: 'neutral' }
    case 'submit':
      return trigger.details?.correct
        ? { icon: <CheckIcon />, color: 'success' }
        : { icon: <XMarkIcon />, color: 'error' }
    case 'abandon':
      return { icon: <AbandonIcon />, color: 'neutral' }
    default:
      return { icon: <span className="text-[10px] font-bold">{action[0]?.toUpperCase() ?? '?'}</span>, color: 'neutral' }
  }
}

// ---- constants ----

const NODE_SIZE = 28
const COL_GAP = 12
const ROW_H = 36

const COLOR_RING: Record<IconColor, string> = {
  neutral: 'border-gray-600',
  success: 'border-emerald-500/60',
  error: 'border-red-500/60',
  warning: 'border-amber-500/60',
  active: 'border-blue-400',
}

const COLOR_BG: Record<IconColor, string> = {
  neutral: 'bg-gray-800/80',
  success: 'bg-emerald-950/60',
  error: 'bg-red-950/60',
  warning: 'bg-amber-950/60',
  active: 'bg-blue-600',
}

const COLOR_TEXT: Record<IconColor, string> = {
  neutral: 'text-gray-400',
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  active: 'text-white',
}

type LayoutPos = { nodeId: string; col: number; row: number }

type CognitiveTimelineProps = {
  nodes: GraphNode[]
  activeNodeId: string | null
  onNodeClick: (nodeId: string) => void
  getLabel: (trigger: GraphTrigger) => string
}

function computeLayout(
  nodes: GraphNode[],
  activeNodeId: string | null,
): { positions: Map<string, LayoutPos>; numRows: number; numCols: number; activePath: Set<string> } {
  const nodeMap = new Map<string, GraphNode>()
  for (const n of nodes) nodeMap.set(n.id, n)

  const childrenMap = new Map<string | '__root__', GraphNode[]>()
  for (const n of nodes) {
    const key = n.parentId ?? '__root__'
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
    if (children.length === 0) return

    for (let i = 0; i < children.length; i++) {
      if (i === 0) {
        lay(children[i].id, col + 1, row)
      } else {
        lay(children[i].id, col + 1, nextRow++)
      }
    }
  }

  const roots = childrenMap.get('__root__') ?? []
  if (roots.length > 0) {
    const activeRoot = roots.find((r) => activePath.has(r.id)) ?? roots[0]
    lay(activeRoot.id, 0, 0)
    for (const r of roots) {
      if (!positions.has(r.id)) {
        lay(r.id, 0, nextRow++)
      }
    }
  }

  return { positions, numRows: nextRow, numCols, activePath }
}

function nodeCX(col: number) {
  return col * (NODE_SIZE + COL_GAP) + NODE_SIZE / 2
}

function nodeCY(row: number) {
  return row * ROW_H + ROW_H / 2
}

export function CognitiveTimeline({
  nodes,
  activeNodeId,
  onNodeClick,
  getLabel,
}: CognitiveTimelineProps) {
  const { t } = useTranslation()

  const { positions, numRows, numCols, activePath } = useMemo(
    () => computeLayout(nodes, activeNodeId),
    [nodes, activeNodeId],
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

  const connectors = useMemo((): ReactNode[] => {
    const result: ReactNode[] = []
    for (const [nodeId, pos] of positions) {
      const node = nodeMap.get(nodeId)
      if (!node?.parentId) continue
      const parentPos = positions.get(node.parentId)
      if (!parentPos) continue

      const onActive = activePath.has(nodeId) && activePath.has(node.parentId)
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
          stroke={onActive ? 'rgb(59,130,246)' : 'rgb(75,85,99)'}
          strokeWidth={onActive ? 2 : 1}
          opacity={onActive ? 1 : 0.4}
        />,
      )
    }
    return result
  }, [positions, nodeMap, activePath])

  const totalWidth = numCols * (NODE_SIZE + COL_GAP) - COL_GAP
  const totalHeight = numRows * ROW_H

  return (
    <div
      data-testid="cognitive-timeline"
      className="w-full rounded-xl border border-gray-800 bg-gray-900 overflow-x-auto"
    >
      <div className="border-b border-gray-800 bg-gray-800/50 px-4 py-2">
        <span className="text-sm font-semibold text-gray-200">
          {t('timeline.title')}
        </span>
      </div>

      <div className="overflow-visible px-4 py-3">
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
                const isActive = node.id === activeNodeId
                const onActivePath = activePath.has(node.id)
                const { icon, color } = getNodeMeta(node.trigger)
                const tooltipLabel = getLabel(node.trigger)
                const swatches = getColorsUsed(node.trigger)

                const ringClass = isActive ? 'border-blue-400 shadow-md shadow-blue-600/30 scale-110' : COLOR_RING[color]
                const bgClass = isActive ? 'bg-blue-600' : COLOR_BG[color]
                const textClass = isActive ? 'text-white' : onActivePath ? 'text-gray-200 opacity-90' : COLOR_TEXT[color]
                const opacityClass = !isActive && !onActivePath ? 'opacity-55' : ''
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
                      data-testid={`timeline-node-${node.id}`}
                      onClick={() => onNodeClick(node.id)}
                      className={`flex items-center justify-center rounded-full
                        border transition-colors cursor-pointer ${ringClass} ${bgClass} ${textClass} ${opacityClass}`}
                      style={{
                        width: `${NODE_SIZE}px`,
                        height: `${NODE_SIZE}px`,
                      }}
                    >
                      {icon}
                    </button>
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
                      hidden group-hover:flex flex-col items-center gap-1 z-[100]">
                      <div className="rounded-lg bg-gray-800 border border-gray-700 px-2.5 py-1.5 shadow-lg whitespace-nowrap">
                        <span className="text-[11px] text-gray-300 block">{tooltipLabel}</span>
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
