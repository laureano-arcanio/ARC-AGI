import type { GraphNode, GraphTrigger } from '../../shared/types/arc-graph'
import type { EventRead } from './types'

export function eventsToGraphNodes(events: EventRead[]): GraphNode[] {
  const seen = new Set<string>()
  return events.filter((ev) => {
    if (seen.has(ev.nodeId)) return false
    seen.add(ev.nodeId)
    return true
  }).map((ev) => {
    const trigger = ev.trigger as unknown as GraphTrigger
    return {
      id: ev.nodeId,
      trigger,
      stateSnapshot: ev.stateSnapshot,
      parentId: ev.parentNodeId ?? null,
      timestamp: ev.timestamp,
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
