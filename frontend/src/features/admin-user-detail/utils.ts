import type { GraphNode, GraphTrigger } from '../../shared/types/arc-graph'
import type { EventRead } from './types'

export function eventsToGraphNodes(events: EventRead[]): GraphNode[] {
  const latest = new Map<string, GraphNode>()
  for (const ev of events) {
    const key = `${ev.testPairIndex ?? '__'}:${ev.nodeId}`
    const trigger = ev.trigger as unknown as GraphTrigger
    latest.set(key, {
      id: ev.nodeId,
      trigger,
      stateSnapshot: ev.stateSnapshot,
      parentId: ev.parentNodeId ?? null,
      timestamp: ev.timestamp,
      testPairIndex: ev.testPairIndex ?? undefined,
    })
  }
  return [...latest.values()]
}

function getLastHypothesisText(nodes: GraphNode[]): string {
  const hypothesisIntents = new Set(['hypothesis', 'hypothesis_revision', 'initial_hypothesis', 'final_algorithm_before_solving', 'hypothesis_finalized'])
  const hypothesisNodes = nodes
    .filter((n) => n.trigger.kind === 'cognitive' && hypothesisIntents.has(n.trigger.intent))
    .sort((a, b) => a.timestamp - b.timestamp)
  const last = hypothesisNodes[hypothesisNodes.length - 1]
  if (!last || last.trigger.kind !== 'cognitive') return ''
  return last.trigger.text
}

export function synthesizeGraphNodes(nodes: GraphNode[]): GraphNode[] {
  const existingIds = new Set(nodes.map((n) => n.id))
  const missingParentIds = new Set<string>()

  for (const node of nodes) {
    if (node.parentId && !existingIds.has(node.parentId)) {
      missingParentIds.add(node.parentId)
    }
  }

  if (missingParentIds.size === 0) return nodes

  const result = [...nodes]

  for (const missingId of missingParentIds) {
    if (missingId === 'hypothesis_final') {
      const hypothesisText = getLastHypothesisText(nodes)
      const rootNode = nodes.find((n) => n.id === 'node_000')
      const timestamp = rootNode ? rootNode.timestamp + 1 : Date.now()

      result.push({
        id: 'hypothesis_final',
        parentId: 'node_000',
        trigger: {
          kind: 'cognitive',
          intent: 'hypothesis',
          text: hypothesisText,
          details: { isPreSolverFinal: true },
        },
        stateSnapshot: [[0]],
        timestamp,
      })
    }
  }

  return result
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
