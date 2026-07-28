import { useEffect, useRef, useState } from 'react'
import type { TaskTag, TaskTagRelation } from '../types'

type TagAnchor = {
  tagId: number
  x: number
  y: number
}

type RelationOverlayProps = {
  tags: TaskTag[]
  relations: TaskTagRelation[]
  containerRef: React.RefObject<HTMLDivElement | null>
}

const TAG_COLORS = [
  '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171',
  '#c084fc', '#38bdf8', '#4ade80', '#fb923c', '#e879f9',
]

export function RelationOverlay({ tags, relations, containerRef }: RelationOverlayProps) {
  const [anchors, setAnchors] = useState<TagAnchor[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const computeAnchors = () => {
      if (!containerRef.current) return
      const container = containerRef.current
      const containerRect = container.getBoundingClientRect()
      const newAnchors: TagAnchor[] = []

      tags.forEach((tag) => {
        if (tag.scopeType !== 'selection' || !tag.selectedCells?.length) return
        const el = container.querySelector(`[data-tag-id="${tag.id}"]`) as HTMLElement | null
        if (!el) return
        const rect = el.getBoundingClientRect()
        newAnchors.push({
          tagId: tag.id,
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
        })
      })

      setAnchors(newAnchors)
    }

    const scheduleCompute = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(computeAnchors)
    }

    scheduleCompute()

    const observer = new MutationObserver(scheduleCompute)
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true, attributes: true })
    }

    window.addEventListener('resize', scheduleCompute)
    window.addEventListener('scroll', scheduleCompute, true)

    return () => {
      cancelAnimationFrame(rafRef.current)
      observer.disconnect()
      window.removeEventListener('resize', scheduleCompute)
      window.removeEventListener('scroll', scheduleCompute, true)
    }
  }, [tags, relations, containerRef])

  if (relations.length === 0 || anchors.length === 0) return null

  const anchorMap = new Map(anchors.map((a) => [a.tagId, a]))

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#9ca3af" />
        </marker>
      </defs>
      {relations.map((rel) => {
        const from = anchorMap.get(rel.fromTagId)
        const to = anchorMap.get(rel.toTagId)
        if (!from || !to) return null

        const midX = (from.x + to.x) / 2
        const midY = (from.y + to.y) / 2
        const color = TAG_COLORS[tags.findIndex((t) => t.id === rel.fromTagId) % TAG_COLORS.length] ?? '#9ca3af'

        return (
          <g key={rel.id}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={color}
              strokeWidth={2}
              strokeDasharray="6 3"
              markerEnd="url(#arrowhead)"
              opacity={0.7}
            />
            <rect
              x={midX - 40}
              y={midY - 8}
              width={80}
              height={16}
              rx={4}
              fill="#111827"
              stroke={color}
              strokeWidth={1}
              opacity={0.9}
            />
            <text
              x={midX}
              y={midY + 3}
              textAnchor="middle"
              fill="#d1d5db"
              fontSize={9}
              fontFamily="monospace"
            >
              {rel.labels.join(', ').slice(0, 20)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function getTagColor(index: number): string {
  return TAG_COLORS[index % TAG_COLORS.length] ?? '#9ca3af'
}
