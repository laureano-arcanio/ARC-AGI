import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { ArcLabPage } from '../pages/ArcLabPage'
import type { ArcTaskRead } from '../types'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    useParams: vi.fn(),
    useNavigate: vi.fn(),
    useSearchParams: vi.fn(),
    useRandomTasks: vi.fn(),
    useTaskById: vi.fn(),
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

const taskWithTwoTests: ArcTaskRead = {
  id: 'task-1',
  train: [
    { input: [[1, 2], [3, 4]], output: [[5, 5], [5, 5]] },
  ],
  test: [
    { input: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], output: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
    { input: [[2, 2], [2, 2]], output: [[3, 3], [3, 3]] },
  ],
}

function renderPage(task = taskWithTwoTests) {
  const navigate = vi.fn()
  mocks.useParams.mockReturnValue({ taskId: 'task-1' })
  mocks.useNavigate.mockReturnValue(navigate)
  mocks.useSearchParams.mockReturnValue([new URLSearchParams(), vi.fn()])
  mocks.useRandomTasks.mockReturnValue({ data: undefined, isFetched: false })
  mocks.useTaskById.mockReturnValue({ data: task })
  const utils = render(<ArcLabPage />)
  return { ...utils, navigate }
}

async function waitForTask() {
  await waitFor(() =>
    expect(screen.getByTestId('pair-0')).toBeInTheDocument(),
  )
}

function outputCell(x: number, y: number): HTMLElement {
  return within(screen.getByTestId('editable-grid')).getByTestId(`${x},${y}`)
}

describe('ArcLabPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not render the welcome modal', () => {
    renderPage()
    expect(screen.queryByTestId('modal-bg')).not.toBeInTheDocument()
  })

  it('loads the task by ID from the URL', async () => {
    renderPage()
    await waitForTask()
    expect(screen.getByTestId('pair-0')).toBeInTheDocument()
  })

  it('shows the test input grid after loading', async () => {
    renderPage()
    await waitForTask()
    expect(screen.getByTestId('evaluation-input')).toBeInTheDocument()
    expect(screen.getByTestId('test-nav')).toBeInTheDocument()
    expect(screen.getByTestId('test-index').textContent).toBe('1/2')
  })

  it('cycles to the next test input', async () => {
    renderPage()
    await waitForTask()
    fireEvent.click(screen.getByTestId('next-test-input'))
    expect(screen.getByTestId('test-index').textContent).toBe('2/2')
  })

  it('warns when there is no next test input', async () => {
    renderPage()
    await waitForTask()
    fireEvent.click(screen.getByTestId('next-test-input'))
    fireEvent.click(screen.getByTestId('next-test-input'))
    expect(screen.getByTestId('toast').textContent).toContain('toast.no_next_test')
  })

  it('shows error when trying to go to previous test at first test', async () => {
    renderPage()
    await waitForTask()
    fireEvent.click(screen.getByTestId('prev-test-input'))
    expect(screen.getByTestId('toast').textContent).toContain('toast.no_prev_test')
  })

  it('preserves output grid edits when navigating between tests', async () => {
    renderPage()
    await waitForTask()
    // Submit hypothesis to enable editing
    fireEvent.change(screen.getByTestId('hypothesis-textarea'), {
      target: { value: 'one two three four five' },
    })
    fireEvent.click(screen.getByTestId('hypothesis-submit'))

    // Paint on test 0
    fireEvent.click(screen.getByTestId('symbol-3'))
    fireEvent.mouseDown(outputCell(0, 0))
    fireEvent.mouseUp(outputCell(0, 0))
    expect(outputCell(0, 0).getAttribute('data-symbol')).toBe('3')

    // Navigate to test 1
    fireEvent.click(screen.getByTestId('next-test-input'))
    expect(screen.getByTestId('test-index').textContent).toBe('2/2')

    // Navigate back to test 0
    fireEvent.click(screen.getByTestId('prev-test-input'))
    expect(screen.getByTestId('test-index').textContent).toBe('1/2')

    // The painted cell should still be there
    expect(outputCell(0, 0).getAttribute('data-symbol')).toBe('3')
  })

  it('shows the hypothesis input when at root', async () => {
    renderPage()
    await waitForTask()
    expect(screen.getByTestId('hypothesis-submit')).toBeInTheDocument()
  })

  it('hides the hypothesis input after submitting and enables editing', async () => {
    renderPage()
    await waitForTask()
    expect(screen.getByTestId('hypothesis-submit')).toBeInTheDocument()

    fireEvent.change(screen.getByTestId('hypothesis-textarea'), {
      target: { value: 'one two three four five' },
    })
    fireEvent.click(screen.getByTestId('hypothesis-submit'))

    expect(screen.queryByTestId('hypothesis-submit')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('symbol-3'))
    const cell = outputCell(0, 0)
    fireEvent.mouseDown(cell)
    fireEvent.mouseUp(cell)
    expect(cell.getAttribute('data-symbol')).toBe('3')
  })

  it('logs a hypothesis cognitive node in the timeline', async () => {
    renderPage()
    await waitForTask()
    fireEvent.change(screen.getByTestId('hypothesis-textarea'), {
      target: { value: 'one two three four five' },
    })
    fireEvent.click(screen.getByTestId('hypothesis-submit'))

    const nodes = screen.getAllByTestId(/timeline-node-/)
    const last = nodes[nodes.length - 1]
    expect(last).toBeInTheDocument()
    const lastWrapper = last.parentElement!
    expect(lastWrapper.textContent).toContain('Hypothesis')
    expect(lastWrapper.textContent).toContain('one two three four five')
  })

  it('reports wrong solution on submit', async () => {
    renderPage()
    await waitForTask()
    // Submit hypothesis first to enable editing
    fireEvent.change(screen.getByTestId('hypothesis-textarea'), {
      target: { value: 'one two three four five' },
    })
    fireEvent.click(screen.getByTestId('hypothesis-submit'))
    fireEvent.click(screen.getByTestId('submit-btn'))
    expect(screen.getByTestId('toast').getAttribute('data-kind')).toBe('error')
    expect(screen.getByTestId('toast').textContent).toContain('toast.wrong')
  })

  it('reports correct solution when all test outputs match', async () => {
    renderPage()
    await waitForTask()
    // Submit hypothesis first to enable editing
    fireEvent.change(screen.getByTestId('hypothesis-textarea'), {
      target: { value: 'one two three four five' },
    })
    fireEvent.click(screen.getByTestId('hypothesis-submit'))

    // Fill test 0's output to match reference (all 1s)
    fireEvent.click(screen.getByTestId('copy-from-input'))
    fireEvent.click(screen.getByTestId('symbol-1'))
    for (const [x, y] of [
      [0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2],
    ]) {
      const cell = outputCell(x, y)
      fireEvent.mouseDown(cell)
      fireEvent.mouseUp(cell)
    }

    // Navigate to test 1 and fill it correctly (all 3s)
    fireEvent.click(screen.getByTestId('next-test-input'))
    fireEvent.click(screen.getByTestId('copy-from-input'))
    fireEvent.click(screen.getByTestId('symbol-3'))
    for (const [x, y] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
      const cell = outputCell(x, y)
      fireEvent.mouseDown(cell)
      fireEvent.mouseUp(cell)
    }

    fireEvent.click(screen.getByTestId('submit-btn'))
    expect(screen.getByTestId('toast').getAttribute('data-kind')).toBe('info')
    expect(screen.getByTestId('toast').textContent).toContain('toast.correct')
  })

  it('copies the input grid into the output editor', async () => {
    renderPage()
    await waitForTask()
    // Submit hypothesis first to enable editing
    fireEvent.change(screen.getByTestId('hypothesis-textarea'), {
      target: { value: 'one two three four five' },
    })
    fireEvent.click(screen.getByTestId('hypothesis-submit'))

    fireEvent.click(screen.getByTestId('copy-from-input'))
    const sizeInput = screen.getByTestId('output-grid-size') as HTMLInputElement
    expect(sizeInput.value).toBe('3x3')
  })

  it('resets the output grid without confirmation and shows hypothesis input', async () => {
    renderPage()
    await waitForTask()
    // Submit hypothesis first to enable editing
    fireEvent.change(screen.getByTestId('hypothesis-textarea'), {
      target: { value: 'one two three four five' },
    })
    fireEvent.click(screen.getByTestId('hypothesis-submit'))

    fireEvent.click(screen.getByTestId('copy-from-input'))
    const sizeInput = screen.getByTestId('output-grid-size') as HTMLInputElement
    expect(sizeInput.value).toBe('3x3')
    fireEvent.change(sizeInput, { target: { value: '5x5' } })
    fireEvent.click(screen.getByTestId('resize-btn'))
    expect(sizeInput.value).toBe('5x5')

    // Reset directly — no confirm dialog
    fireEvent.click(screen.getByTestId('reset-btn'))
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
    expect(sizeInput.value).toBe('8x8')
    // Hypothesis input is shown again (at root)
    expect(screen.getByTestId('hypothesis-submit')).toBeInTheDocument()
  })

  it('restart adds a restart event in the active branch and continues from root', async () => {
    renderPage()
    await waitForTask()
    // Submit hypothesis first
    fireEvent.change(screen.getByTestId('hypothesis-textarea'), {
      target: { value: 'one two three four five' },
    })
    fireEvent.click(screen.getByTestId('hypothesis-submit'))

    fireEvent.click(screen.getByTestId('copy-from-input'))
    fireEvent.click(screen.getByTestId('symbol-3'))
    fireEvent.mouseDown(outputCell(0, 0))
    fireEvent.mouseUp(outputCell(0, 0))
    expect(screen.getAllByTestId(/timeline-node-/)).toHaveLength(4) // root + hypothesis + copy + cell

    fireEvent.click(screen.getByTestId('reset-btn'))

    const nodes = screen.getAllByTestId(/timeline-node-/)
    expect(nodes).toHaveLength(5)
    const restartNode = screen.getByTestId('timeline-node-node_004')
    expect(restartNode.parentElement!.textContent).toContain('Reset')
    expect(screen.queryByTestId('go-back-node_004')).not.toBeInTheDocument()
    expect(screen.getByTestId('timeline-node-node_000').className).toContain(
      'bg-blue-600',
    )

    // Submit hypothesis again to re-enable editing
    fireEvent.change(screen.getByTestId('hypothesis-textarea'), {
      target: { value: 'one two three four five' },
    })
    fireEvent.click(screen.getByTestId('hypothesis-submit'))

    fireEvent.mouseDown(outputCell(0, 0))
    fireEvent.mouseUp(outputCell(0, 0))
    expect(screen.getAllByTestId(/timeline-node-/)).toHaveLength(7)
    expect(screen.getByTestId('timeline-node-node_006').className).toContain(
      'bg-blue-600',
    )
    expect(screen.getByTestId('timeline-node-node_000').className).not.toContain(
      'bg-blue-600',
    )
  })

  it('resizes the output grid', async () => {
    renderPage()
    await waitForTask()
    // Submit hypothesis first to enable editing
    fireEvent.change(screen.getByTestId('hypothesis-textarea'), {
      target: { value: 'one two three four five' },
    })
    fireEvent.click(screen.getByTestId('hypothesis-submit'))

    const sizeInput = screen.getByTestId('output-grid-size') as HTMLInputElement
    fireEvent.change(sizeInput, { target: { value: '5x5' } })
    fireEvent.click(screen.getByTestId('resize-btn'))
    expect(outputCell(4, 4)).toBeInTheDocument()
  })

  it('shows an error for an invalid resize size', async () => {
    renderPage()
    await waitForTask()
    // Submit hypothesis first to enable editing
    fireEvent.change(screen.getByTestId('hypothesis-textarea'), {
      target: { value: 'one two three four five' },
    })
    fireEvent.click(screen.getByTestId('hypothesis-submit'))

    const sizeInput = screen.getByTestId('output-grid-size') as HTMLInputElement
    fireEvent.change(sizeInput, { target: { value: '99x99' } })
    fireEvent.click(screen.getByTestId('resize-btn'))
    expect(screen.getByTestId('toast').getAttribute('data-kind')).toBe('error')
  })

  it('fills selected cells when picking a symbol in select mode', async () => {
    renderPage()
    await waitForTask()
    // Submit hypothesis first to enable editing
    fireEvent.change(screen.getByTestId('hypothesis-textarea'), {
      target: { value: 'one two three four five' },
    })
    fireEvent.click(screen.getByTestId('hypothesis-submit'))

    // Enter select mode by dragging
    fireEvent.mouseDown(outputCell(0, 0))
    fireEvent.mouseEnter(outputCell(0, 2))
    fireEvent.mouseDown(outputCell(0, 0))
    fireEvent.mouseEnter(outputCell(0, 1))
    fireEvent.click(screen.getByTestId('symbol-7'))
    expect(outputCell(0, 0).getAttribute('data-symbol')).toBe('7')
    expect(outputCell(0, 1).getAttribute('data-symbol')).toBe('7')
  })

  it('opens a confirm dialog when Abandonar is clicked', async () => {
    renderPage()
    await waitForTask()
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('abandon-btn'))
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
  })

  it('closes the confirm dialog on cancel without abandoning', async () => {
    const { navigate } = renderPage()
    await waitForTask()
    fireEvent.click(screen.getByTestId('abandon-btn'))
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'))
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('abandons: logs a timeline event and navigates home on confirm', async () => {
    const { navigate } = renderPage()
    await waitForTask()
    // Submit hypothesis first so timeline has extra node
    fireEvent.change(screen.getByTestId('hypothesis-textarea'), {
      target: { value: 'one two three four five' },
    })
    fireEvent.click(screen.getByTestId('hypothesis-submit'))

    const initialNodes = screen.getAllByTestId(/timeline-node-/).length
    fireEvent.click(screen.getByTestId('abandon-btn'))
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'))
    expect(navigate).toHaveBeenCalledWith('/my-tasks')
    const nodes = screen.getAllByTestId(/timeline-node-/)
    expect(nodes.length).toBe(initialNodes + 1)
    expect(nodes[nodes.length - 1].parentElement!.textContent).toContain('Abandon')
  })

  it('shows pivot overlay on first action after resume and lets action go through after reflection', async () => {
    renderPage()
    await waitForTask()
    // Submit hypothesis first
    fireEvent.change(screen.getByTestId('hypothesis-textarea'), {
      target: { value: 'one two three four five' },
    })
    fireEvent.click(screen.getByTestId('hypothesis-submit'))

    fireEvent.click(screen.getByTestId('copy-from-input'))
    fireEvent.click(screen.getByTestId('symbol-3'))
    fireEvent.mouseDown(outputCell(0, 0))
    fireEvent.mouseUp(outputCell(0, 0))
    expect(screen.getAllByTestId(/timeline-node-/)).toHaveLength(4) // root + hypothesis + copy + cell

    // Navigate to node_002 (hypothesis) by clicking the timeline node
    fireEvent.click(screen.getByTestId('timeline-node-node_002'))
    expect(screen.queryByTestId('branch-pivot-textarea')).not.toBeInTheDocument()

    // First action (paint click) triggers the overlay
    fireEvent.mouseDown(outputCell(0, 1))
    fireEvent.mouseUp(outputCell(0, 1))
    expect(screen.getByTestId('branch-pivot-textarea')).toBeInTheDocument()

    // Submit reflection — grid unlocks
    fireEvent.change(screen.getByTestId('branch-pivot-textarea'), {
      target: { value: 'one two three four five' },
    })
    fireEvent.click(screen.getByTestId('branch-pivot-submit'))
    expect(screen.queryByTestId('branch-pivot-textarea')).not.toBeInTheDocument()

    // Now click goes through and creates a new branch node
    fireEvent.click(screen.getByTestId('symbol-4'))
    fireEvent.mouseDown(outputCell(0, 1))
    fireEvent.mouseUp(outputCell(0, 1))

    expect(screen.getAllByTestId(/timeline-node-/)).toHaveLength(6)
    expect(screen.getByTestId('timeline-node-node_005').parentElement!.textContent).toContain(
      'Paint',
    )
    expect(screen.getByTestId('timeline-node-node_005').className).toContain(
      'bg-blue-600',
    )
  })

  it('resets the hypothesis input when a new task loads', async () => {
    const { rerender } = renderPage()
    await waitForTask()
    expect(screen.getByTestId('hypothesis-submit')).toBeInTheDocument()

    fireEvent.change(screen.getByTestId('hypothesis-textarea'), {
      target: { value: 'one two three four five' },
    })

    // Load a new task
    mocks.useTaskById.mockReturnValue({
      data: { ...taskWithTwoTests, id: 'task-2' },
    })
    rerender(<ArcLabPage />)
    await waitForTask()

    // Hypothesis input should be visible again and empty
    expect(screen.getByTestId('hypothesis-submit')).toBeInTheDocument()
  })
})
