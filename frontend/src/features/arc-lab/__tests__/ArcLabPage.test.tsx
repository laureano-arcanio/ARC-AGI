import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ArcLabPage } from '../pages/ArcLabPage'
import type { ArcTask } from '../types'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    readTaskFromFile: vi.fn(),
    fetchRandomTask: vi.fn(),
    listTasks: vi.fn(),
    fetchTaskByUrl: vi.fn(),
  },
}))

vi.mock('../api', () => ({
  readTaskFromFile: mocks.readTaskFromFile,
  fetchRandomTask: mocks.fetchRandomTask,
  listTasks: mocks.listTasks,
  fetchTaskByUrl: mocks.fetchTaskByUrl,
}))

const taskWithTwoTests: ArcTask = {
  train: [
    { input: [[1, 2], [3, 4]], output: [[5, 5], [5, 5]] },
  ],
  test: [
    { input: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], output: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
    { input: [[2, 2], [2, 2]], output: [[3, 3], [3, 3]] },
  ],
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return render(<ArcLabPage />, { wrapper })
}

async function loadTaskViaModal(task: ArcTask, name = 'task.json') {
  mocks.readTaskFromFile.mockResolvedValueOnce({ task, name })
  const input = screen.getByTestId('modal-load-task') as HTMLInputElement
  const file = new File([JSON.stringify(task)], name, { type: 'application/json' })
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

async function waitForModalClose() {
  await waitFor(() => expect(screen.queryByTestId('modal-bg')).not.toBeInTheDocument())
}

function outputCell(x: number, y: number): HTMLElement {
  return within(screen.getByTestId('editable-grid')).getByTestId(`${x},${y}`)
}

async function loadTask(task = taskWithTwoTests) {
  renderPage()
  await loadTaskViaModal(task)
  await waitForModalClose()
}

describe('ArcLabPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the welcome modal on first load', () => {
    renderPage()
    expect(screen.getByTestId('modal-bg')).toBeInTheDocument()
    expect(screen.getByText(/ARC Testing Interface/)).toBeInTheDocument()
  })

  it('loads a task from a file and closes the modal', async () => {
    await loadTask()
    expect(screen.getByTestId('task-name').textContent).toContain('task.json')
    expect(screen.getByTestId('pair-0')).toBeInTheDocument()
  })

  it('shows the test input grid after loading', async () => {
    await loadTask()
    expect(screen.getByTestId('evaluation-input')).toBeInTheDocument()
    expect(screen.getByTestId('test-input-panel').textContent).toContain('1/2')
  })

  it('cycles to the next test input', async () => {
    await loadTask()
    fireEvent.click(screen.getByTestId('next-test-input'))
    expect(screen.getByTestId('test-input-panel').textContent).toContain('2/2')
  })

  it('warns when there is no next test input', async () => {
    await loadTask()
    fireEvent.click(screen.getByTestId('next-test-input'))
    fireEvent.click(screen.getByTestId('next-test-input'))
    expect(screen.getByTestId('toast').textContent).toContain('No next test input')
  })

  it('edits a cell in the output grid', async () => {
    await loadTask()
    fireEvent.click(screen.getByTestId('symbol-3'))
    const cell = outputCell(0, 0)
    fireEvent.click(cell)
    expect(cell.getAttribute('data-symbol')).toBe('3')
  })

  it('reports wrong solution on submit', async () => {
    await loadTask()
    fireEvent.click(screen.getByTestId('submit-btn'))
    expect(screen.getByTestId('toast').getAttribute('data-kind')).toBe('error')
    expect(screen.getByTestId('toast').textContent).toContain('Wrong solution')
  })

  it('reports correct solution when output matches', async () => {
    await loadTask()
    fireEvent.click(screen.getByTestId('symbol-1'))
    for (const [x, y] of [
      [0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2],
    ]) {
      fireEvent.click(outputCell(x, y))
    }
    fireEvent.click(screen.getByTestId('submit-btn'))
    expect(screen.getByTestId('toast').getAttribute('data-kind')).toBe('info')
    expect(screen.getByTestId('toast').textContent).toContain('Correct solution')
  })

  it('copies the input grid into the output editor', async () => {
    await loadTask()
    fireEvent.click(screen.getByTestId('copy-from-input'))
    const sizeInput = screen.getByTestId('output-grid-size') as HTMLInputElement
    expect(sizeInput.value).toBe('3x3')
  })

  it('resets the output grid to 3x3', async () => {
    await loadTask()
    fireEvent.click(screen.getByTestId('reset-btn'))
    const sizeInput = screen.getByTestId('output-grid-size') as HTMLInputElement
    expect(sizeInput.value).toBe('3x3')
  })

  it('resizes the output grid', async () => {
    await loadTask()
    const sizeInput = screen.getByTestId('output-grid-size') as HTMLInputElement
    fireEvent.change(sizeInput, { target: { value: '5x5' } })
    fireEvent.click(screen.getByTestId('resize-btn'))
    expect(outputCell(4, 4)).toBeInTheDocument()
  })

  it('shows an error for an invalid resize size', async () => {
    await loadTask()
    const sizeInput = screen.getByTestId('output-grid-size') as HTMLInputElement
    fireEvent.change(sizeInput, { target: { value: '99x99' } })
    fireEvent.click(screen.getByTestId('resize-btn'))
    expect(screen.getByTestId('toast').getAttribute('data-kind')).toBe('error')
  })

  it('toggles symbol number visibility', async () => {
    await loadTask()
    const cellBefore = outputCell(0, 0)
    expect(cellBefore.textContent).toBe('')
    fireEvent.click(screen.getByTestId('show-symbol-numbers'))
    expect(outputCell(0, 0).textContent).toBe('0')
  })

  it('copies and pastes a selection via keyboard (C/V)', async () => {
    await loadTask()
    fireEvent.click(screen.getByTestId('symbol-4'))
    fireEvent.click(outputCell(0, 0))
    expect(outputCell(0, 0).getAttribute('data-symbol')).toBe('4')
    fireEvent.click(screen.getByTestId('tool-select'))
    fireEvent.mouseDown(outputCell(0, 0))
    act(() => {
      fireEvent.keyDown(document.body, { key: 'c' })
    })
    expect(screen.getByTestId('toast').textContent).toContain('Cells copied')
    fireEvent.mouseDown(outputCell(1, 1))
    act(() => {
      fireEvent.keyDown(document.body, { key: 'v' })
    })
    expect(outputCell(1, 1).getAttribute('data-symbol')).toBe('4')
  })

  it('fills selected cells when picking a symbol in select mode', async () => {
    await loadTask()
    fireEvent.click(screen.getByTestId('tool-select'))
    fireEvent.mouseDown(outputCell(0, 0))
    fireEvent.mouseEnter(outputCell(0, 1))
    fireEvent.click(screen.getByTestId('symbol-7'))
    expect(outputCell(0, 0).getAttribute('data-symbol')).toBe('7')
    expect(outputCell(0, 1).getAttribute('data-symbol')).toBe('7')
  })

  it('fetches a random task from the modal', async () => {
    mocks.fetchRandomTask.mockResolvedValueOnce({
      task: taskWithTwoTests,
      name: 'random.json',
      index: 0,
      total: 1,
      subset: 'training',
    })
    renderPage()
    fireEvent.click(screen.getByTestId('modal-random-task'))
    await waitForModalClose()
    expect(screen.getByTestId('task-name').textContent).toContain('random.json')
  })
})
