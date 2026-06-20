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
  nodes?: GraphNode[]
  activeNodeId?: string
}

function renderTimeline(override: Override = {}) {
  const onSubmit = override.onSubmit ?? vi.fn()
  const onDismissCallout = override.onDismissCallout ?? vi.fn()
  const onReset = override.onReset ?? vi.fn()
  const callout = override.callout ?? null
  const getLabel = override.getLabel ?? (() => 'label')
  const nodes = override.nodes ?? [rootNode]
  const activeNodeId = override.activeNodeId ?? 'node_000'
  render(
    <CognitiveTimeline
      nodes={nodes}
      activeNodeId={activeNodeId}
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

  it('keeps a single linear branch at one indentation level', () => {
    const nodes: GraphNode[] = [
      rootNode,
      {
        id: 'node_001',
        trigger: { kind: 'mechanical', action: 'cell_click' },
        stateSnapshot: [[1]],
        parentId: 'node_000',
        timestamp: 1,
      },
      {
        id: 'node_002',
        trigger: { kind: 'mechanical', action: 'copy_from_input' },
        stateSnapshot: [[1]],
        parentId: 'node_001',
        timestamp: 2,
      },
    ]

    renderTimeline({ nodes, activeNodeId: 'node_002' })

    const root = screen.getByTestId('timeline-node-node_000')
    const first = screen.getByTestId('timeline-node-node_001')
    const second = screen.getByTestId('timeline-node-node_002')
    // root's children are wrapped in an ml-6 container
    expect(first.parentElement).toBe(second.parentElement)
    expect(first.parentElement).not.toBe(root.parentElement)
    expect(first.parentElement?.className).toContain('ml-6')
  })

  it('does not render a collapse toggle on a linear continuation in the same branch', () => {
    const nodes: GraphNode[] = [
      rootNode,
      {
        id: 'node_001',
        trigger: { kind: 'mechanical', action: 'cell_click' },
        stateSnapshot: [[1]],
        parentId: 'node_000',
        timestamp: 1,
      },
      {
        id: 'node_002',
        trigger: { kind: 'mechanical', action: 'resize' },
        stateSnapshot: [[1]],
        parentId: 'node_001',
        timestamp: 2,
      },
    ]

    renderTimeline({ nodes, activeNodeId: 'node_002' })

    // node_001 is a previous event on the same branch line (single child,
    // not top-level) -> no collapse toggle, just a spacer.
    expect(screen.queryByTestId('collapse-node_001')).not.toBeInTheDocument()
    // root still has a toggle (top-level branch).
    expect(screen.getByTestId('collapse-node_000')).toBeInTheDocument()
  })

  it('renders a collapse toggle on a real branch point with multiple children', () => {
    const nodes: GraphNode[] = [
      rootNode,
      {
        id: 'node_001',
        trigger: { kind: 'mechanical', action: 'cell_click' },
        stateSnapshot: [[1]],
        parentId: 'node_000',
        timestamp: 1,
      },
      {
        id: 'node_002',
        trigger: { kind: 'mechanical', action: 'fill_selected' },
        stateSnapshot: [[1]],
        parentId: 'node_001',
        timestamp: 2,
      },
      {
        id: 'node_003',
        trigger: { kind: 'mechanical', action: 'paste' },
        stateSnapshot: [[1]],
        parentId: 'node_001',
        timestamp: 3,
      },
    ]

    renderTimeline({ nodes, activeNodeId: 'node_003' })

    // node_001 forks into two children -> it is a real branch point.
    expect(screen.getByTestId('collapse-node_001')).toBeInTheDocument()
    expect(screen.queryByTestId('collapse-node_002')).not.toBeInTheDocument()
    expect(screen.queryByTestId('collapse-node_003')).not.toBeInTheDocument()
  })

  it('aligns a leaf active node with its sibling that has a collapse toggle', () => {
    // node_000 forks into two children: 001 (a real branch point with two
    // children of its own) and 002 (an active leaf). They are siblings in the
    // same ml-6 container; 001 renders a collapse toggle, 002 renders a spacer.
    // Both must occupy the same width so their icon/label align vertically.
    const nodes: GraphNode[] = [
      rootNode,
      {
        id: 'node_001',
        trigger: { kind: 'mechanical', action: 'cell_click' },
        stateSnapshot: [[1]],
        parentId: 'node_000',
        timestamp: 1,
      },
      {
        id: 'node_002',
        trigger: { kind: 'mechanical', action: 'resize' },
        stateSnapshot: [[1]],
        parentId: 'node_000',
        timestamp: 2,
      },
      {
        id: 'node_003',
        trigger: { kind: 'mechanical', action: 'paste' },
        stateSnapshot: [[1]],
        parentId: 'node_001',
        timestamp: 3,
      },
      {
        id: 'node_004',
        trigger: { kind: 'mechanical', action: 'fill_selected' },
        stateSnapshot: [[1]],
        parentId: 'node_001',
        timestamp: 4,
      },
    ]

    renderTimeline({ nodes, activeNodeId: 'node_002' })

    const collapse = screen.getByTestId('collapse-node_001')
    const leaf = screen.getByTestId('timeline-node-node_002')
    const spacer = leaf.querySelector('span.shrink-0.w-3\\.5')

    const collapseWidth = collapse.className.match(/w-[\d.]+/)?.[0]
    const spacerWidth = spacer?.className.match(/w-[\d.]+/)?.[0]

    expect(collapseWidth).toBe('w-3.5')
    expect(spacer).not.toBeNull()
    expect(spacerWidth).toBe(collapseWidth)
  })
})
