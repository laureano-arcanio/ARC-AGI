import { type ReactNode } from 'react'
import {
  COLOR_MAP,
  type CognitiveIntent,
  type GraphTrigger,
  type MechanicalAction,
} from '../types/arc-graph'
import {
  CircleCheck,
  CircleHelp,
  ClipboardPaste,
  Copy,
  FileText,
  Flag,
  Lightbulb,
  LogOut,
  MoveDiagonal,
  PaintBucket,
  Pencil,
  RefreshCcw,
  RotateCcw,
  Scan,
  X,
} from 'lucide-react'

export type TimelineIconColor = 'neutral' | 'success' | 'error' | 'warning' | 'active'

export const PRE_SOLVER_INTENTS: CognitiveIntent[] = [
  'initial_hypothesis',
  'hypothesis_revision',
  'final_algorithm_before_solving',
  'hypothesis_finalized',
]

const COLOR_RING: Record<TimelineIconColor, string> = {
  neutral: 'border-gray-600',
  success: 'border-emerald-500/60',
  error: 'border-red-500/60',
  warning: 'border-amber-500/60',
  active: 'border-blue-400',
}

const COLOR_BG: Record<TimelineIconColor, string> = {
  neutral: 'bg-gray-800/80',
  success: 'bg-emerald-950/60',
  error: 'bg-red-950/60',
  warning: 'bg-amber-950/60',
  active: 'bg-blue-600',
}

const COLOR_TEXT: Record<TimelineIconColor, string> = {
  neutral: 'text-gray-400',
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  active: 'text-white',
}

export function isPreSolverTrigger(trigger: GraphTrigger): boolean {
  return trigger.kind === 'cognitive' && PRE_SOLVER_INTENTS.includes(trigger.intent)
}

export function getTimelineColorsUsed(trigger: GraphTrigger): string[] {
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

export function getTimelineNodeMeta(trigger: GraphTrigger): {
  icon: ReactNode
  color: TimelineIconColor
} {
  if (trigger.kind === 'cognitive') {
    switch (trigger.intent) {
      case 'hypothesis':
        if (trigger.details?.revisionType === 'uncertain') {
          return { icon: <CircleHelp size={18} />, color: 'neutral' }
        }
        return { icon: <Lightbulb size={18} />, color: 'warning' }
      case 'correct_analysis':
        return { icon: <CircleCheck size={18} />, color: 'success' }
      case 'failure_analysis':
        return { icon: <FileText size={18} />, color: 'error' }
      case 'branch_pivot':
        return { icon: <FileText size={18} />, color: 'warning' }
      case 'initial_hypothesis':
        return { icon: <Lightbulb size={18} />, color: 'active' }
      case 'hypothesis_revision':
        return { icon: <RefreshCcw size={16} />, color: 'active' }
      case 'final_algorithm_before_solving':
        return { icon: <CircleCheck size={18} />, color: 'success' }
      case 'hypothesis_finalized':
        return { icon: <CircleCheck size={18} />, color: 'success' }
    }
  }

  const action = trigger.action as MechanicalAction
  switch (action) {
    case 'load_task':
      return { icon: <Flag size={18} />, color: 'neutral' }
    case 'cell_paint': {
      return { icon: <Pencil size={18} />, color: 'neutral' }
    }
    case 'fill_selected':
      return { icon: <PaintBucket size={18} />, color: 'neutral' }
    case 'paste':
      return { icon: <ClipboardPaste size={18} />, color: 'neutral' }
    case 'resize':
      return { icon: <MoveDiagonal size={18} />, color: 'neutral' }
    case 'copy_from_input':
      return { icon: <Copy size={18} />, color: 'neutral' }
    case 'reset_output':
      return { icon: <RotateCcw size={18} />, color: 'neutral' }
    case 'submit':
      return trigger.details?.correct
        ? { icon: <CircleCheck size={18} />, color: 'success' }
        : { icon: <X size={18} />, color: 'error' }
    case 'abandon':
      return { icon: <LogOut size={18} />, color: 'neutral' }
    case 'select_object':
      return { icon: <Scan size={18} />, color: 'neutral' }
    case 'select_area':
      return { icon: <Scan size={18} />, color: 'neutral' }
    case 'copy_selection':
      return { icon: <Copy size={18} />, color: 'neutral' }
    case 'paste_selection':
      return { icon: <ClipboardPaste size={18} />, color: 'neutral' }
    default:
      return { icon: <span className="text-[10px] font-bold">?</span>, color: 'neutral' }
  }
}

export function getTimelineNodeClassName({
  color,
  isActive,
  onActivePath,
  isDashed = false,
  isClickable = true,
}: {
  color: TimelineIconColor
  isActive: boolean
  onActivePath: boolean
  isDashed?: boolean
  isClickable?: boolean
}) {
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
  const borderClass = isDashed ? 'border-dashed' : ''
  const cursorClass = isClickable ? 'cursor-pointer' : 'cursor-default'

  return `flex items-center justify-center rounded-full border transition-colors ${cursorClass} ${borderClass} ${ringClass} ${bgClass} ${textClass} ${opacityClass}`
}
