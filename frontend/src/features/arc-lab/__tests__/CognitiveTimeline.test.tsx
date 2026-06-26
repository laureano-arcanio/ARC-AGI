import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CognitiveTimeline } from '../components/CognitiveTimeline'
import type { GraphNode } from '../types'

const rootNode: GraphNode = {
  id: 'node_000',
  trigger: { kind: 'mechanical', action: 'load_task' },
  stateSnapshot: [[0]],
  parentId: null,
  timestamp: 0,
}

function makeNode(
  id: string,
  parentId: string | null,
  action: string = 'cell_paint',
): GraphNode {
  return {
    id,
    trigger: { kind: 'mechanical' as const, action: action as never },
    stateSnapshot: [[0]],
    parentId,
    timestamp: 0,
  }
}

function makeSubmitNode(
  id: string,
  parentId: string | null,
  correct: boolean,
): GraphNode {
  return {
    id,
    trigger: { kind: 'mechanical' as const, action: 'submit' as never, details: { correct } },
    stateSnapshot: [[0]],
    parentId,
    timestamp: 0,
  }
}

type Override = {
  getLabel?: (trigger: unknown) => string
  nodes?: GraphNode[]
  activeNodeId?: string
}

function renderTimeline(override: Override = {}) {
  const getLabel = override.getLabel ?? (() => 'tooltip label')
  const nodes = override.nodes ?? [rootNode]
  const activeNodeId = override.activeNodeId ?? 'node_000'
  const onNodeClick = vi.fn()
  render(
    <CognitiveTimeline
      nodes={nodes}
      activeNodeId={activeNodeId}
      onNodeClick={onNodeClick as never}
      getLabel={getLabel as never}
    />,
  )
  return { onNodeClick }
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

  it('positions linear chain on a single row', () => {
    const nodes: GraphNode[] = [
      rootNode,
      makeNode('node_001', 'node_000'),
      makeNode('node_002', 'node_001'),
    ]

    renderTimeline({ nodes, activeNodeId: 'node_002' })

    const root = screen.getByTestId('timeline-node-node_000').parentElement!
    const first = screen.getByTestId('timeline-node-node_001').parentElement!
    const second = screen.getByTestId('timeline-node-node_002').parentElement!

    const rootTop = Number.parseFloat(root.style.top)
    const firstTop = Number.parseFloat(first.style.top)
    const secondTop = Number.parseFloat(second.style.top)

    expect(firstTop).toBe(rootTop)
    expect(secondTop).toBe(rootTop)

    const rootLeft = Number.parseFloat(root.style.left)
    const firstLeft = Number.parseFloat(first.style.left)
    const secondLeft = Number.parseFloat(second.style.left)

    expect(firstLeft).toBeGreaterThan(rootLeft)
    expect(secondLeft).toBeGreaterThan(firstLeft)
  })

  it('renders without hanging when parentId forms a cycle', () => {
    // Regression: a node-id collision on test 2 used to append a second
    // `node_000` whose parent was `hypothesis_final` (whose parent is the
    // root `node_000`). The duplicate id overwrote the root in the node map,
    // forming a node_000 ⇄ hypothesis_final cycle that looped the layout walk
    // forever and froze the tab. The layout must terminate and still render.
    const cyclic: GraphNode[] = [
      rootNode, // node_000, parentId null
      {
        id: 'hypothesis_final',
        trigger: { kind: 'cognitive', intent: 'hypothesis', text: 'h' },
        stateSnapshot: [[0]],
        parentId: 'node_000',
        timestamp: 0,
      },
      {
        // colliding id — same as the root, but parented under hypothesis_final
        id: 'node_000',
        trigger: { kind: 'mechanical', action: 'cell_paint', details: { cells: [] } },
        stateSnapshot: [[0]],
        parentId: 'hypothesis_final',
        timestamp: 0,
      },
    ]

    renderTimeline({ nodes: cyclic, activeNodeId: 'node_000' })

    expect(screen.getByTestId('timeline-node-node_000')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-node-hypothesis_final')).toBeInTheDocument()
  })

  it('places branch nodes on separate rows', () => {
    const nodes: GraphNode[] = [
      rootNode,
      makeNode('node_001', 'node_000'),
      makeNode('node_002', 'node_001'),
      makeNode('node_003', 'node_001'),
    ]

    renderTimeline({ nodes, activeNodeId: 'node_002' })

    const activeNode = screen.getByTestId('timeline-node-node_002').parentElement!
    const branchNode = screen.getByTestId('timeline-node-node_003').parentElement!

    const activeTop = Number.parseFloat(activeNode.style.top)
    const branchTop = Number.parseFloat(branchNode.style.top)

    expect(branchTop).toBeGreaterThan(activeTop)
  })

  it('calls onNodeClick when a node is clicked', () => {
    const { onNodeClick } = renderTimeline()

    fireEvent.click(screen.getByTestId('timeline-node-node_000'))
    expect(onNodeClick).toHaveBeenCalledWith('node_000')
  })

  it('highlights the active node with blue background', () => {
    const nodes: GraphNode[] = [
      rootNode,
      makeNode('node_001', 'node_000'),
      makeNode('node_002', 'node_000'),
    ]

    renderTimeline({ nodes, activeNodeId: 'node_001' })

    const active = screen.getByTestId('timeline-node-node_001')
    expect(active.className).toContain('bg-blue-600')

    const onPath = screen.getByTestId('timeline-node-node_000')
    expect(onPath.className).toContain('bg-gray-800')

    const branch = screen.getByTestId('timeline-node-node_002')
    expect(branch.className).not.toContain('bg-blue-600')
    expect(branch.className).toContain('opacity-55')
  })

  it('renders branch sub-children on the same branch row', () => {
    const nodes: GraphNode[] = [
      rootNode,
      makeNode('node_001', 'node_000'),
      makeNode('node_002', 'node_000'),
      makeNode('node_003', 'node_002'),
    ]

    renderTimeline({ nodes, activeNodeId: 'node_001' })

    const branch = screen.getByTestId('timeline-node-node_002').parentElement!
    const subBranch = screen.getByTestId('timeline-node-node_003').parentElement!

    const branchTop = Number.parseFloat(branch.style.top)
    const subTop = Number.parseFloat(subBranch.style.top)

    expect(subTop).toBe(branchTop)
  })

  it('does not render resume/go-back buttons', () => {
    const nodes: GraphNode[] = [
      rootNode,
      makeNode('node_001', 'node_000'),
    ]

    renderTimeline({ nodes, activeNodeId: 'node_000' })

    expect(screen.queryByTestId('go-back-node_001')).not.toBeInTheDocument()
  })

  it('shows tooltip with label on hover', async () => {
    renderTimeline()
    const node = screen.getByTestId('timeline-node-node_000')
    await userEvent.hover(node)
    expect(await screen.findAllByText('tooltip label')).not.toHaveLength(0)
  })

  it('uses success color for correct submit node', () => {
    const nodes: GraphNode[] = [
      rootNode,
      makeSubmitNode('node_001', 'node_000', true),
    ]

    renderTimeline({ nodes, activeNodeId: 'node_000' })
    const submitNode = screen.getByTestId('timeline-node-node_001')
    expect(submitNode.className).toContain('text-emerald-400')
  })

  it('uses error color for wrong submit node', () => {
    const nodes: GraphNode[] = [
      rootNode,
      makeSubmitNode('node_001', 'node_000', false),
    ]

    renderTimeline({ nodes, activeNodeId: 'node_000' })
    const submitNode = screen.getByTestId('timeline-node-node_001')
    expect(submitNode.className).toContain('text-red-400')
  })
})
