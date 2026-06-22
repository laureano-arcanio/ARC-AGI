import { useState, useRef, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { useTranslation } from '../../../lib/i18n'
import type { CognitiveIntent, GraphNode, GraphTrigger } from '../types'

const INTENT_ICON: Record<CognitiveIntent, string> = {
  hypothesis: '💡',
  failure_analysis: '❌',
  branch_pivot: '🟢',
}

type CognitiveTimelineProps = {
  nodes: GraphNode[]
  activeNodeId: string | null
  onGoBack: (nodeId: string) => void
  getLabel: (trigger: GraphTrigger) => string
}

export function CognitiveTimeline({
  nodes,
  activeNodeId,
  onGoBack,
  getLabel,
}: CognitiveTimelineProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [nodes.length])

  // ---- TREE COMPUTATION ----

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>()
    for (const node of nodes) map.set(node.id, node)
    return map
  }, [nodes])

  const childrenMap = useMemo(() => {
    const map = new Map<string | '__root__', GraphNode[]>()
    for (const node of nodes) {
      const key = node.parentId ?? '__root__'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(node)
    }
    return map
  }, [nodes])

  const activePath = useMemo(() => {
    const path = new Set<string>()
    let current: string | null = activeNodeId
    while (current) {
      path.add(current)
      current = nodeMap.get(current)?.parentId ?? null
    }
    return path
  }, [activeNodeId, nodeMap])

  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set())

  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  function renderTreeChildren(
    parentKey: string | '__root__',
    isBranchChild: boolean,
  ): ReactNode[] {
    const children = childrenMap.get(parentKey)
    if (!children || children.length === 0) return []

    const result: ReactNode[] = []

    for (const node of children) {
      const isActive = node.id === activeNodeId
      const onActivePath = activePath.has(node.id)
      const nodeChildren = childrenMap.get(node.id) ?? []
      const hasChildren = nodeChildren.length > 0
      const hasMultipleChildren = nodeChildren.length > 1
      const isCollapsed = collapsedNodes.has(node.id)
      const isTopLevel = parentKey === '__root__'
      // Only nodes whose children render in a collapsible branch container
      // (multiple children, or a top-level branch) get a collapse toggle.
      // A single inline continuation on the same branch line does not.
      const hasCollapsibleBranch = hasChildren && (hasMultipleChildren || isTopLevel)

      const row = (
        <div
          key={node.id}
          data-testid={`timeline-node-${node.id}`}
          className={`group flex items-start text-xs relative py-1 ${
            !isActive && !onActivePath ? 'opacity-50' : ''
          }`}
        >
          {/* Connector column — always 0.75rem, draws line only for branch children */}
          <span className="shrink-0 w-3 relative mt-px self-stretch">
            {isBranchChild && (
              <span className="absolute top-1/2 left-0 right-0 border-t border-gray-600/40" />
            )}
          </span>

          {/* Collapse/expand toggle — only on real branch/parent nodes.
              Fixed w-3.5 matches the leaf/inline spacer so sibling rows align. */}
          {hasCollapsibleBranch && (
            <button
              type="button"
              onClick={() => toggleCollapse(node.id)}
              data-testid={`collapse-${node.id}`}
              className="shrink-0 w-3.5 text-center text-gray-500 hover:text-gray-300 text-[10px] leading-none mt-px"
              title={isCollapsed ? t('timeline.expand') : t('timeline.collapse')}
            >
              {isCollapsed ? '▸' : '▾'}
            </button>
          )}
          {!hasCollapsibleBranch && <span className="shrink-0 w-3.5" />}

          {/* Icon */}
          <span className="shrink-0 text-gray-600 mt-px">
            {node.trigger.kind === 'cognitive'
              ? INTENT_ICON[node.trigger.intent] ?? '💬'
              : '⚡'}
          </span>

          {/* Label */}
          <span
            className={`flex-1 break-words leading-relaxed ml-2 ${
              isActive
                ? 'text-blue-200'
                : onActivePath
                  ? 'text-gray-200'
                  : 'text-gray-500'
            }`}
          >
            {getLabel(node.trigger)}
            {isActive && (
              <span className="ml-1 text-blue-400">{t('timeline.active')}</span>
            )}
          </span>

          {/* Resume button — not shown on the active node or terminal restart events */}
          {!isActive &&
            node.parentId !== null &&
            !(node.trigger.kind === 'mechanical' && node.trigger.action === 'reset_output') && (
            <button
              type="button"
              onClick={() => onGoBack(node.id)}
              data-testid={`go-back-${node.id}`}
              className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium bg-orange-600 hover:bg-orange-500 text-white ml-1"
            >
              {t('timeline.resume')}
            </button>
          )}
        </div>
      )

      if (!hasChildren || isCollapsed) {
        result.push(row)
      } else if (hasMultipleChildren || isTopLevel) {
        result.push(
          <div key={node.id}>
            {row}
            <div className="ml-6 border-l border-gray-600/40">
              {renderTreeChildren(node.id, true)}
            </div>
          </div>,
        )
      } else {
        result.push(row)
        result.push(...renderTreeChildren(node.id, false))
      }
    }

    return result
  }

  return (
    <div
      data-testid="cognitive-timeline"
      className="flex w-full shrink-0 flex-col self-start rounded-xl border border-gray-800 bg-gray-900 lg:sticky lg:top-4 lg:max-h-[80vh] lg:w-[320px] min-h-[500px]"
    >
      <div className="border-b border-gray-800 bg-gray-800/50 px-4 py-3">
        <span className="text-sm font-semibold text-gray-200">
          {t('timeline.title')}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2"
      >
        {renderTreeChildren('__root__', false)}
      </div>
    </div>
  )
}
