import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { ArcLabPage } from '../pages/ArcLabPage'
import type { ArcTaskRead } from '../types'
import type { PreSolverEventRead } from '../api'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    useParams: vi.fn(),
    useNavigate: vi.fn(),
    useSearchParams: vi.fn(),
    useRandomTasks: vi.fn(),
    useTaskById: vi.fn(),
    fetchEventsByAttempt: vi.fn(),
    createAttempt: vi.fn(),
    postEventWithRetry: vi.fn(),
    submitAttempt: vi.fn(),
  },
}))

vi.mock('react-router-dom', () => ({
  useParams: mocks.useParams,
  useNavigate: mocks.useNavigate,
  useSearchParams: mocks.useSearchParams,
}))

vi.mock('../queries', () => ({
  useRandomTasks: mocks.useRandomTasks,
  useTaskById: mocks.useTaskById,
}))

vi.mock('../api', () => ({
  fetchEventsByAttempt: mocks.fetchEventsByAttempt,
  createAttempt: mocks.createAttempt,
  postEventWithRetry: mocks.postEventWithRetry,
  submitAttempt: mocks.submitAttempt,
}))

const taskWithTwoTests: ArcTaskRead = {
  id: 'task-1',
  train: [{ input: [[1, 2], [3, 4]], output: [[5, 5], [5, 5]] }],
  test: [
    { input: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], output: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
    { input: [[2, 2], [2, 2]], output: [[3, 3], [3, 3]] },
  ],
}

// One pre-solver hypothesis event. ArcLabPage fans this out into every test
// index as: root node_000 → pre_node_001 → hypothesis_final (parent node_000).
const preSolverEvents: PreSolverEventRead[] = [
  {
    id: 1,
    nodeId: 'pre_node_001',
    parentNodeId: null,
    testPairIndex: null,
    trigger: { kind: 'cognitive', intent: 'initial_hypothesis', text: 'rotate the grid' },
    stateSnapshot: [[0]],
    timestamp: 1,
  },
]

function renderPage() {
  const navigate = vi.fn()
  mocks.useParams.mockReturnValue({ taskId: 'task-1' })
  mocks.useNavigate.mockReturnValue(navigate)
  // attemptId in the URL is what triggers the pre-solver event load.
  mocks.useSearchParams.mockReturnValue([new URLSearchParams('attemptId=5'), vi.fn()])
  mocks.useRandomTasks.mockReturnValue({ data: undefined, isFetched: false })
  mocks.useTaskById.mockReturnValue({ data: taskWithTwoTests })
  mocks.fetchEventsByAttempt.mockResolvedValue(preSolverEvents)
  mocks.createAttempt.mockResolvedValue({ id: 5 })
  mocks.postEventWithRetry.mockResolvedValue(undefined)
  mocks.submitAttempt.mockResolvedValue({ correct: false })
  return { ...utilsRender(), navigate }
}

function utilsRender() {
  return render(<ArcLabPage />)
}

function outputCell(x: number, y: number): HTMLElement {
  return within(screen.getByTestId('editable-grid')).getByTestId(`${x},${y}`)
}

describe('ArcLabPage — second test sample with pre-solver events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not hang and assigns a fresh node id when acting on test 2', async () => {
    renderPage()

    // Pre-solver events loaded → hypothesis_final node is present on test 1.
    await waitFor(() =>
      expect(screen.getByTestId('timeline-node-hypothesis_final')).toBeInTheDocument(),
    )

    // Go to the second test sample.
    fireEvent.click(screen.getByTestId('next-test-input'))
    expect(screen.getByTestId('test-index').textContent).toBe('2/2')

    // Paint a cell — this used to regenerate node_000, collide with the root,
    // form a node_000 ⇄ hypothesis_final cycle and freeze the tab.
    fireEvent.click(screen.getByTestId('symbol-3'))
    fireEvent.mouseDown(outputCell(0, 0))
    fireEvent.mouseUp(outputCell(0, 0))

    // The tab is still responsive and the new action got a unique, non-root id.
    expect(outputCell(0, 0).getAttribute('data-symbol')).toBe('3')
    expect(screen.getByTestId('timeline-node-node_001')).toBeInTheDocument()
  })
})
