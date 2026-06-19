import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CognitiveTimeline } from '../components/CognitiveTimeline'
import type { GraphNode } from '../types'

const rootNode: GraphNode = {
  id: 'node_000',
  trigger: { kind: 'mechanical', action: 'load_task' },
  stateSnapshot: [[0]],
  parentId: null,
  timestamp: 0,
}

type Override = {
  onSubmit?: (intent: string, text: string) => void
  onDismissCallout?: () => void
  onReset?: () => void
  callout?: string | null
  getLabel?: (trigger: unknown) => string
}

function renderTimeline(override: Override = {}) {
  const onSubmit = override.onSubmit ?? vi.fn()
  const onDismissCallout = override.onDismissCallout ?? vi.fn()
  const onReset = override.onReset ?? vi.fn()
  const callout = override.callout ?? null
  const getLabel = override.getLabel ?? (() => 'label')
  render(
    <CognitiveTimeline
      nodes={[rootNode]}
      activeNodeId="node_000"
      onGoBack={vi.fn()}
      onSubmit={onSubmit as never}
      getLabel={getLabel as never}
      callout={callout}
      onDismissCallout={onDismissCallout}
      onReset={onReset}
    />,
  )
  return { onSubmit, onDismissCallout, onReset }
}

describe('CognitiveTimeline', () => {
  it('renders the four cognitive tag buttons including confusion', () => {
    renderTimeline()
    expect(screen.getByTestId('tag-observation')).toBeInTheDocument()
    expect(screen.getByTestId('tag-hypothesis')).toBeInTheDocument()
    expect(screen.getByTestId('tag-failure')).toBeInTheDocument()
    expect(screen.getByTestId('tag-confusion')).toBeInTheDocument()
  })

  it('submits a confusion thought', () => {
    const { onSubmit } = renderTimeline()
    fireEvent.click(screen.getByTestId('tag-confusion'))
    fireEvent.change(screen.getByTestId('cognitive-input'), {
      target: { value: 'no entiendo los píxeles rojos' },
    })
    fireEvent.click(screen.getByTestId('cognitive-submit'))
    expect(onSubmit).toHaveBeenCalledWith('confusion', 'no entiendo los píxeles rojos')
  })

  it('does not render the callout when null', () => {
    renderTimeline({ callout: null })
    expect(screen.queryByTestId('intercept-callout')).not.toBeInTheDocument()
  })

  it('renders the callout pointing at the observation button', () => {
    renderTimeline({ callout: 'explica qué descubriste' })
    const callout = screen.getByTestId('intercept-callout')
    expect(callout).toHaveTextContent('explica qué descubriste')
    expect(callout).toHaveAttribute('role', 'tooltip')
  })

  it('dismisses the callout when typing in the input', () => {
    const { onDismissCallout } = renderTimeline({ callout: 'msg' })
    fireEvent.change(screen.getByTestId('cognitive-input'), {
      target: { value: 'x' },
    })
    expect(onDismissCallout).toHaveBeenCalled()
  })

  it('dismisses the callout when selecting a tag', () => {
    const { onDismissCallout } = renderTimeline({ callout: 'msg' })
    fireEvent.click(screen.getByTestId('tag-hypothesis'))
    expect(onDismissCallout).toHaveBeenCalled()
  })

  it('dismisses the callout via the close button', () => {
    const { onDismissCallout } = renderTimeline({ callout: 'msg' })
    fireEvent.click(screen.getByTestId('intercept-callout-dismiss'))
    expect(onDismissCallout).toHaveBeenCalled()
  })

  it('does not reset when no callout was shown', () => {
    const { onReset } = renderTimeline()
    fireEvent.click(screen.getByTestId('tag-observation'))
    expect(onReset).not.toHaveBeenCalled()
  })

  it('resets when selecting a tag after the callout', () => {
    const { onReset } = renderTimeline({ callout: 'msg' })
    fireEvent.click(screen.getByTestId('tag-observation'))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('resets the counter when sending a message after the callout (tag pre-selected)', () => {
    const onSubmit = vi.fn()
    const onReset = vi.fn()
    const onDismissCallout = vi.fn()
    const buildProps = (callout: string | null) => (
      <CognitiveTimeline
        nodes={[rootNode]}
        activeNodeId="node_000"
        onGoBack={vi.fn()}
        onSubmit={onSubmit as never}
        getLabel={() => 'label' as never}
        callout={callout}
        onDismissCallout={onDismissCallout}
        onReset={onReset}
      />
    )
    const { rerender } = render(buildProps(null))
    fireEvent.click(screen.getByTestId('tag-observation'))
    expect(onReset).not.toHaveBeenCalled()
    rerender(buildProps('msg'))
    fireEvent.change(screen.getByTestId('cognitive-input'), {
      target: { value: 'vi un patrón' },
    })
    fireEvent.click(screen.getByTestId('cognitive-submit'))
    expect(onSubmit).toHaveBeenCalledWith('observation', 'vi un patrón')
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('does not reset when the callout is dismissed via the close button', () => {
    const { onReset } = renderTimeline({ callout: 'msg' })
    fireEvent.click(screen.getByTestId('intercept-callout-dismiss'))
    expect(onReset).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('tag-hypothesis'))
    expect(onReset).not.toHaveBeenCalled()
  })

  it('keeps the reset pending while typing, then fires it on tag selection', () => {
    const { onReset } = renderTimeline({ callout: 'msg' })
    fireEvent.change(screen.getByTestId('cognitive-input'), {
      target: { value: 'x' },
    })
    expect(onReset).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('tag-observation'))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
