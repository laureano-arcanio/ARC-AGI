import { type ReactNode, type SVGProps } from 'react'
import { useTranslation } from '../../../lib/i18n'
import { TimelineGraph } from '../../../shared/components/TimelineGraph'
import type { CognitiveIntent, GraphNode, GraphTrigger, MechanicalAction } from '../types'
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

const RefreshIcon = () => (
  <IconSvg size={16}>
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M3 22v-6h6" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </IconSvg>
)

const PRE_SOLVER_INTENTS: CognitiveIntent[] = [
  'initial_hypothesis',
  'hypothesis_revision',
  'final_algorithm_before_solving',
]

function isPreSolverTrigger(trigger: GraphTrigger): boolean {
  return trigger.kind === 'cognitive' && PRE_SOLVER_INTENTS.includes(trigger.intent)
}

// ---- color swatches helper ----

function getColorsUsed(trigger: GraphTrigger): string[] {
  if (trigger.kind === 'mechanical') {
    if (trigger.action === 'cell_paint') {
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
      case 'initial_hypothesis':
        return { icon: <BulbIcon />, color: 'active' }
      case 'hypothesis_revision':
        return { icon: <RefreshIcon />, color: 'active' }
      case 'final_algorithm_before_solving':
        return { icon: <CheckIcon />, color: 'success' }
    }
  }
  const action = trigger.action as MechanicalAction
  switch (action) {
    case 'load_task':
      return { icon: <FlagIcon />, color: 'neutral' }
    case 'cell_paint': {
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
      return { icon: <span className="text-[10px] font-bold">?</span>, color: 'neutral' }
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
          const { icon, color } = getNodeMeta(node.trigger)
          const isPreSolver = isPreSolverTrigger(node.trigger)
          const ringClass = isActive
            ? 'border-blue-400 shadow-md shadow-blue-600/30 scale-110'
            : COLOR_RING[color]
          const bgClass = isActive ? 'bg-blue-600' : COLOR_BG[color]
          const textClass = isActive
            ? 'text-white'
            : onActivePath
              ? 'text-gray-200 opacity-90'
              : COLOR_TEXT[color]
          const opacityClass = !isActive && !onActivePath ? 'opacity-55' : ''
          const borderClass = isPreSolver ? 'border-dashed' : ''
          const className = `flex items-center justify-center rounded-full border transition-colors ${borderClass} ${ringClass} ${bgClass} ${textClass} ${opacityClass}`
          const style = { width: `${nodeSize}px`, height: `${nodeSize}px` }

          if (isPreSolver) {
            return (
              <div
                data-testid={`timeline-node-${node.id}`}
                className={`${className} cursor-default`}
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
              className={`${className} cursor-pointer`}
              style={style}
            >
              {icon}
            </button>
          )
        }}
        renderTooltip={(node) => {
          const swatches = getColorsUsed(node.trigger)

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
