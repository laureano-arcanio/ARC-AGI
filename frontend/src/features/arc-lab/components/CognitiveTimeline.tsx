import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '../../../lib/i18n'
import type { CognitiveIntent, GraphNode, GraphTrigger } from '../types'

type CognitiveTimelineProps = {
  nodes: GraphNode[]
  activeNodeId: string | null
  onGoBack: (nodeId: string) => void
  onSubmit: (intent: CognitiveIntent, text: string) => void
  getLabel: (trigger: GraphTrigger) => string
  callout: string | null
  onDismissCallout: () => void
  onReset?: () => void
}

const TAG_OPTIONS: Array<{ intent: CognitiveIntent; labelKey: string }> = [
  { intent: 'observation', labelKey: 'timeline.observation' },
  { intent: 'hypothesis', labelKey: 'timeline.hypothesis' },
  { intent: 'failure', labelKey: 'timeline.failure' },
  { intent: 'confusion', labelKey: 'timeline.confusion' },
]

export function CognitiveTimeline({
  nodes,
  activeNodeId,
  onGoBack,
  onSubmit,
  getLabel,
  callout,
  onDismissCallout,
  onReset,
}: CognitiveTimelineProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [tag, setTag] = useState<CognitiveIntent | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const calloutSeenRef = useRef(false)

  useEffect(() => {
    if (callout) {
      calloutSeenRef.current = true
    }
  }, [callout])

  const resolveCallout = () => {
    if (calloutSeenRef.current) {
      onReset?.()
      calloutSeenRef.current = false
    }
  }

  const dismissCallout = () => {
    calloutSeenRef.current = false
    onDismissCallout()
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [nodes.length])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || !tag) return
    onSubmit(tag, trimmed)
    resolveCallout()
    onDismissCallout()
    setText('')
    setTag(null)
    inputRef.current?.focus()
  }

  const handleTagClick = (intent: CognitiveIntent) => {
    setTag(intent)
    resolveCallout()
    onDismissCallout()
    inputRef.current?.focus()
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
          {TAG_OPTIONS.map((option, index) => (
            <div key={option.intent} className="relative">
              {index === 0 && callout && (
                <div
                  data-testid="intercept-callout"
                  role="tooltip"
                  className="absolute bottom-full left-0 mb-2 w-60 rounded-lg border border-blue-700 bg-blue-950/95 px-3 py-2 text-[11px] leading-relaxed text-blue-100 shadow-xl z-50"
                >
                  <div className="flex items-start gap-2">
                    <span className="flex-1">{callout}</span>
                    <button
                      type="button"
                      onClick={dismissCallout}
                      data-testid="intercept-callout-dismiss"
                      aria-label="dismiss"
                      className="shrink-0 text-blue-300 hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleTagClick(option.intent)}
                data-testid={`tag-${option.intent}`}
                className={`rounded-md px-2 py-1 text-[10px] font-medium transition ${
                  tag === option.intent
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                {t(option.labelKey)}
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-1.5">
          <textarea
            ref={inputRef}
            rows={3}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              onDismissCallout()
            }}
            data-testid="cognitive-input"
            placeholder={t('timeline.placeholder')}
            className="flex-1 resize-none rounded-md border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() || !tag}
            data-testid="cognitive-submit"
            className="self-end rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
