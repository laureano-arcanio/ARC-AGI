import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
  getLabel?: (trigger: unknown) => string
  nodes?: GraphNode[]
  activeNodeId?: string
}

function renderTimeline(override: Override = {}) {
  const getLabel = override.getLabel ?? (() => 'label')
  const nodes = override.nodes ?? [rootNode]
  const activeNodeId = override.activeNodeId ?? 'node_000'
  render(
    <CognitiveTimeline
      nodes={nodes}
      activeNodeId={activeNodeId}
      onGoBack={vi.fn()}
      getLabel={getLabel as never}
    />,
  )
}

describe('CognitiveTimeline', () => {
  it('renders the timeline container', () => {
    renderTimeline()
    expect(screen.getByTestId('cognitive-timeline')).toBeInTheDocument()
  })

  it('renders root node', () => {
    renderTimeline()
    expect(screen.getByTestId('timeline-node-node_000')).toBeInTheDocument()
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

    expect(screen.queryByTestId('collapse-node_001')).not.toBeInTheDocument()
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

    expect(screen.getByTestId('collapse-node_001')).toBeInTheDocument()
    expect(screen.queryByTestId('collapse-node_002')).not.toBeInTheDocument()
    expect(screen.queryByTestId('collapse-node_003')).not.toBeInTheDocument()
  })

  it('aligns a leaf active node with its sibling that has a collapse toggle', () => {
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

  it('shows the resume button on non-active, non-root, non-restart nodes', () => {
    const nodes: GraphNode[] = [
      rootNode,
      {
        id: 'node_001',
        trigger: { kind: 'mechanical', action: 'cell_click' },
        stateSnapshot: [[1]],
        parentId: 'node_000',
        timestamp: 1,
      },
    ]

    renderTimeline({ nodes, activeNodeId: 'node_000' })
    expect(screen.getByTestId('go-back-node_001')).toBeInTheDocument()
  })

  it('does not show the resume button on the active node', () => {
    const nodes: GraphNode[] = [
      rootNode,
      {
        id: 'node_001',
        trigger: { kind: 'mechanical', action: 'cell_click' },
        stateSnapshot: [[1]],
        parentId: 'node_000',
        timestamp: 1,
      },
    ]

    renderTimeline({ nodes, activeNodeId: 'node_001' })
    expect(screen.queryByTestId('go-back-node_001')).not.toBeInTheDocument()
  })
})
