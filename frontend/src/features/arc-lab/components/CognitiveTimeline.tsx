import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '../../../lib/i18n'
import type { CognitiveIntent, GraphNode, GraphTrigger } from '../types'

type CognitiveTimelineProps = {
  nodes: GraphNode[]
  activeNodeId: string | null
  onGoBack: (nodeId: string) => void
  onSubmit: (intent: CognitiveIntent, text: string) => void
  getLabel: (trigger: GraphTrigger) => string
}

export function CognitiveTimeline({
  nodes,
  activeNodeId,
  onGoBack,
  onSubmit,
  getLabel,
}: CognitiveTimelineProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [tag, setTag] = useState<CognitiveIntent | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [nodes.length])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || !tag) return
    onSubmit(tag, trimmed)
    setText('')
    setTag(null)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const handleTagClick = (intent: CognitiveIntent) => {
    setTag(intent)
    inputRef.current?.focus()
  }

  return (
    <div
      data-testid="cognitive-timeline"
      className="flex w-72 shrink-0 flex-col rounded-xl border border-gray-800 bg-gray-900"
    >
      <div className="border-b border-gray-800 bg-gray-800/50 px-4 py-3">
        <span className="text-sm font-semibold text-gray-200">
          {t('timeline.title')}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1"
      >
        {nodes.map((node) => {
          const isActive = node.id === activeNodeId
          const isFirst = node.id === nodes[0].id
          return (
            <div
              key={node.id}
              data-testid={`timeline-node-${node.id}`}
              className={`group flex items-start gap-2 rounded-md px-2 py-1.5 text-xs ${
                isActive
                  ? 'bg-blue-900/40 text-blue-200'
                  : 'text-gray-400 hover:bg-gray-800/50'
              }`}
            >
              <span className="mt-px shrink-0 text-gray-600">
                {node.trigger.kind === 'cognitive' ? '💬' : '⚡'}
              </span>
              <span className="flex-1 break-words leading-relaxed">
                {getLabel(node.trigger)}
                {isActive && (
                  <span className="ml-1 text-blue-400">{t('timeline.active')}</span>
                )}
              </span>
              {!isActive && !isFirst && (
                <button
                  type="button"
                  onClick={() => onGoBack(node.id)}
                  data-testid={`go-back-${node.id}`}
                  className="shrink-0 text-gray-600 opacity-0 transition group-hover:opacity-100 hover:text-blue-400"
                  title={t('timeline.go_back')}
                >
                  ⏪
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t border-gray-800 px-3 py-2 space-y-2">
        <div className="flex gap-1.5">
          {(['observation', 'hypothesis', 'failure'] as CognitiveIntent[]).map(
            (intent) => (
              <button
                key={intent}
                type="button"
                onClick={() => handleTagClick(intent)}
                data-testid={`tag-${intent}`}
                className={`rounded-md px-2 py-1 text-[10px] font-medium transition ${
                  tag === intent
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                {intent === 'observation'
                  ? t('timeline.observation')
                  : intent === 'hypothesis'
                    ? t('timeline.hypothesis')
                    : t('timeline.failure')}
              </button>
            ),
          )}
        </div>

        <div className="flex gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            data-testid="cognitive-input"
            placeholder={t('timeline.placeholder')}
            className="flex-1 rounded-md border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() || !tag}
            data-testid="cognitive-submit"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
