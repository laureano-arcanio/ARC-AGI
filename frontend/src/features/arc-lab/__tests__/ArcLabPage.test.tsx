import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react'
import { ArcLabPage } from '../pages/ArcLabPage'
import type { ArcTaskRead } from '../types'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    useParams: vi.fn(),
    useNavigate: vi.fn(),
    useRandomTasks: vi.fn(),
    useTaskById: vi.fn(),
  },
}))

vi.mock('react-router-dom', () => ({
  useParams: mocks.useParams,
  useNavigate: mocks.useNavigate,
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
  mocks.useParams.mockReturnValue({ taskId: 'task-1' })
  mocks.useNavigate.mockReturnValue(vi.fn())
  mocks.useRandomTasks.mockReturnValue({ data: undefined, isFetched: false })
  mocks.useTaskById.mockReturnValue({ data: task })
  return render(<ArcLabPage />)
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
    expect(screen.getByTestId('test-input-panel').textContent).toContain('1/2')
  })

  it('cycles to the next test input', async () => {
    renderPage()
    await waitForTask()
    fireEvent.click(screen.getByTestId('next-test-input'))
    expect(screen.getByTestId('test-input-panel').textContent).toContain('2/2')
  })

  it('warns when there is no next test input', async () => {
    renderPage()
    await waitForTask()
    fireEvent.click(screen.getByTestId('next-test-input'))
    fireEvent.click(screen.getByTestId('next-test-input'))
    expect(screen.getByTestId('toast').textContent).toContain('toast.no_next_test')
  })

  it('edits a cell in the output grid', async () => {
    renderPage()
    await waitForTask()
    fireEvent.click(screen.getByTestId('symbol-3'))
    const cell = outputCell(0, 0)
    fireEvent.mouseDown(cell)
    fireEvent.mouseUp(cell)
    expect(cell.getAttribute('data-symbol')).toBe('3')
  })

  it('reports wrong solution on submit', async () => {
    renderPage()
    await waitForTask()
    fireEvent.click(screen.getByTestId('submit-btn'))
    expect(screen.getByTestId('toast').getAttribute('data-kind')).toBe('error')
    expect(screen.getByTestId('toast').textContent).toContain('toast.wrong')
  })

  it('reports correct solution when output matches', async () => {
    renderPage()
    await waitForTask()
    fireEvent.click(screen.getByTestId('symbol-1'))
    for (const [x, y] of [
      [0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2],
    ]) {
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
    fireEvent.click(screen.getByTestId('copy-from-input'))
    const sizeInput = screen.getByTestId('output-grid-size') as HTMLInputElement
    expect(sizeInput.value).toBe('3x3')
  })

  it('resets the output grid to 3x3', async () => {
    renderPage()
    await waitForTask()
    fireEvent.click(screen.getByTestId('reset-btn'))
    const sizeInput = screen.getByTestId('output-grid-size') as HTMLInputElement
    expect(sizeInput.value).toBe('3x3')
  })

  it('resizes the output grid', async () => {
    renderPage()
    await waitForTask()
    const sizeInput = screen.getByTestId('output-grid-size') as HTMLInputElement
    fireEvent.change(sizeInput, { target: { value: '5x5' } })
    fireEvent.click(screen.getByTestId('resize-btn'))
    expect(outputCell(4, 4)).toBeInTheDocument()
  })

  it('shows an error for an invalid resize size', async () => {
    renderPage()
    await waitForTask()
    const sizeInput = screen.getByTestId('output-grid-size') as HTMLInputElement
    fireEvent.change(sizeInput, { target: { value: '99x99' } })
    fireEvent.click(screen.getByTestId('resize-btn'))
    expect(screen.getByTestId('toast').getAttribute('data-kind')).toBe('error')
  })

  it('copies and pastes a selection via keyboard (C/V)', async () => {
    renderPage()
    await waitForTask()
    fireEvent.click(screen.getByTestId('symbol-4'))
    const cell00 = outputCell(0, 0)
    fireEvent.mouseDown(cell00)
    fireEvent.mouseUp(cell00)
    expect(outputCell(0, 0).getAttribute('data-symbol')).toBe('4')
    // Enter select mode by dragging
    fireEvent.mouseDown(outputCell(0, 0))
    fireEvent.mouseEnter(outputCell(0, 2))
    fireEvent.mouseDown(outputCell(0, 0))
    act(() => {
      fireEvent.keyDown(document.body, { key: 'c' })
    })
    expect(screen.getByTestId('toast').textContent).toContain('toast.cells_copied')
    fireEvent.mouseDown(outputCell(1, 1))
    act(() => {
      fireEvent.keyDown(document.body, { key: 'v' })
    })
    expect(outputCell(1, 1).getAttribute('data-symbol')).toBe('4')
  })

  it('fills selected cells when picking a symbol in select mode', async () => {
    renderPage()
    await waitForTask()
    // Enter select mode by dragging
    fireEvent.mouseDown(outputCell(0, 0))
    fireEvent.mouseEnter(outputCell(0, 2))
    fireEvent.mouseDown(outputCell(0, 0))
    fireEvent.mouseEnter(outputCell(0, 1))
    fireEvent.click(screen.getByTestId('symbol-7'))
    expect(outputCell(0, 0).getAttribute('data-symbol')).toBe('7')
    expect(outputCell(0, 1).getAttribute('data-symbol')).toBe('7')
  })
})
