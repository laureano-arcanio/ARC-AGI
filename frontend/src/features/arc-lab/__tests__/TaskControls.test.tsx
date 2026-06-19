import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskControls } from '../components/TaskControls'

describe('TaskControls', () => {
  it('renders the next-task button', () => {
    render(<TaskControls onNextTask={vi.fn()} />)
    expect(screen.getByTestId('next-task-btn')).toBeInTheDocument()
  })

  it('does not render file-browse or random-task buttons', () => {
    render(<TaskControls onNextTask={vi.fn()} />)
    expect(screen.queryByTestId('browse-btn')).not.toBeInTheDocument()
    expect(screen.queryByTestId('random-task-btn')).not.toBeInTheDocument()
    expect(screen.queryByTestId('load-task-file')).not.toBeInTheDocument()
  })

  it('calls onNextTask when the next-task button is clicked', () => {
    const onNextTask = vi.fn()
    render(<TaskControls onNextTask={onNextTask} />)
    fireEvent.click(screen.getByTestId('next-task-btn'))
    expect(onNextTask).toHaveBeenCalledTimes(1)
  })

  it('enables the next-task button by default', () => {
    render(<TaskControls onNextTask={vi.fn()} />)
    expect(screen.getByTestId('next-task-btn')).not.toBeDisabled()
  })
})
