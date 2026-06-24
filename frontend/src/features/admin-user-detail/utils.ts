import type { GraphNode, GraphTrigger } from '../../shared/types/arc-graph'
import type { EventRead } from './types'

export function eventsToGraphNodes(events: EventRead[]): GraphNode[] {
  const seen = new Set<string>()
  return events.filter((ev) => {
    const key = `${ev.testPairIndex ?? '__'}:${ev.nodeId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).map((ev) => {
    const trigger = ev.trigger as unknown as GraphTrigger
    return {
      id: ev.nodeId,
      trigger,
      stateSnapshot: ev.stateSnapshot,
      parentId: ev.parentNodeId ?? null,
      timestamp: ev.timestamp,
      testPairIndex: ev.testPairIndex ?? undefined,
    }
  })
}

export function getNodeLabel(trigger: GraphTrigger): string {
  if (trigger.kind === 'mechanical') {
    const label = trigger.action
    return label
  }
  return trigger.intent
}

function isCorrect(trigger: GraphTrigger): boolean | undefined {
  if (trigger.kind !== 'mechanical') return undefined
  if (!trigger.details) return undefined
  const correct = trigger.details.correct
  return typeof correct === 'boolean' ? correct : undefined
}

export function getNodeKind(trigger: GraphTrigger): 'mechanical' | 'cognitive' {
  return trigger.kind
}

export function getNodeResult(trigger: GraphTrigger): 'correct' | 'wrong' | 'none' {
  const c = isCorrect(trigger)
  if (c === true) return 'correct'
  if (c === false) return 'wrong'
  return 'none'
}

export function formatDelta(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}
