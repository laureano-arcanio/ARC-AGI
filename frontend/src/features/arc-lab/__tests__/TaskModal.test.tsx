import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskModal } from '../components/TaskModal'

describe('TaskModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <TaskModal open={false} onLoadFile={vi.fn()} onRandomTask={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
    expect(screen.queryByTestId('modal-bg')).not.toBeInTheDocument()
  })

  it('renders the welcome message when open', () => {
    render(<TaskModal open onLoadFile={vi.fn()} onRandomTask={vi.fn()} />)
    expect(screen.getByTestId('modal-bg')).toBeInTheDocument()
    expect(screen.getByText(/ARC Testing Interface/)).toBeInTheDocument()
  })

  it('renders a file input and random task button', () => {
    render(<TaskModal open onLoadFile={vi.fn()} onRandomTask={vi.fn()} />)
    expect(screen.getByTestId('modal-load-task')).toBeInTheDocument()
    expect(screen.getByTestId('modal-random-task')).toBeInTheDocument()
  })

  it('calls onRandomTask when the random button is clicked', () => {
    const onRandomTask = vi.fn()
    render(<TaskModal open onLoadFile={vi.fn()} onRandomTask={onRandomTask} />)
    fireEvent.click(screen.getByTestId('modal-random-task'))
    expect(onRandomTask).toHaveBeenCalledTimes(1)
  })

  it('disables the random button while fetching', () => {
    render(<TaskModal open onLoadFile={vi.fn()} onRandomTask={vi.fn()} isFetchingRandom />)
    expect(screen.getByTestId('modal-random-task')).toBeDisabled()
  })

  it('calls onLoadFile when a file is selected', () => {
    const onLoadFile = vi.fn()
    render(<TaskModal open onLoadFile={onLoadFile} onRandomTask={vi.fn()} />)
    const input = screen.getByTestId('modal-load-task') as HTMLInputElement
    const file = new File(['{}'], 'task.json', { type: 'application/json' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onLoadFile).toHaveBeenCalledWith(file)
  })
})
