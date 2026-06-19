import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskControls } from '../components/TaskControls'

describe('TaskControls', () => {
  it('renders browse, random, and symbol-numbers toggle', () => {
    render(
      <TaskControls
        taskName="a.json"
        taskIndex={3}
        taskTotal={100}
        showSymbolNumbers={false}
        onShowSymbolNumbersChange={vi.fn()}
        onLoadFile={vi.fn()}
        onRandomTask={vi.fn()}
      />,
    )
    expect(screen.getByTestId('browse-btn')).toBeInTheDocument()
    expect(screen.getByTestId('random-task-btn')).toBeInTheDocument()
    expect(screen.getByTestId('show-symbol-numbers')).toBeInTheDocument()
  })

  it('displays the task name and index/total', () => {
    render(
      <TaskControls
        taskName="a.json"
        taskIndex={3}
        taskTotal={100}
        showSymbolNumbers={false}
        onShowSymbolNumbersChange={vi.fn()}
        onLoadFile={vi.fn()}
        onRandomTask={vi.fn()}
      />,
    )
    const label = screen.getByTestId('task-name')
    expect(label.textContent).toContain('a.json')
    expect(label.textContent).toContain('3 out of 100')
  })

  it('omits index/total when null', () => {
    render(
      <TaskControls
        taskName="local.json"
        taskIndex={null}
        taskTotal={null}
        showSymbolNumbers={false}
        onShowSymbolNumbersChange={vi.fn()}
        onLoadFile={vi.fn()}
        onRandomTask={vi.fn()}
      />,
    )
    const label = screen.getByTestId('task-name')
    expect(label.textContent).toContain('local.json')
    expect(label.textContent).not.toContain('out of')
  })

  it('calls onRandomTask when the random button is clicked', () => {
    const onRandomTask = vi.fn()
    render(
      <TaskControls
        taskName={null}
        taskIndex={null}
        taskTotal={null}
        showSymbolNumbers={false}
        onShowSymbolNumbersChange={vi.fn()}
        onLoadFile={vi.fn()}
        onRandomTask={onRandomTask}
      />,
    )
    fireEvent.click(screen.getByTestId('random-task-btn'))
    expect(onRandomTask).toHaveBeenCalledTimes(1)
  })

  it('disables the random button while fetching', () => {
    render(
      <TaskControls
        taskName={null}
        taskIndex={null}
        taskTotal={null}
        showSymbolNumbers={false}
        onShowSymbolNumbersChange={vi.fn()}
        onLoadFile={vi.fn()}
        onRandomTask={vi.fn()}
        isFetchingRandom
      />,
    )
    expect(screen.getByTestId('random-task-btn')).toBeDisabled()
    expect(screen.getByTestId('random-task-btn').textContent).toBe('Loading...')
  })

  it('calls onShowSymbolNumbersChange when toggling the checkbox', () => {
    const onChange = vi.fn()
    render(
      <TaskControls
        taskName={null}
        taskIndex={null}
        taskTotal={null}
        showSymbolNumbers={false}
        onShowSymbolNumbersChange={onChange}
        onLoadFile={vi.fn()}
        onRandomTask={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('show-symbol-numbers'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('calls onLoadFile when a file is chosen', () => {
    const onLoadFile = vi.fn()
    render(
      <TaskControls
        taskName={null}
        taskIndex={null}
        taskTotal={null}
        showSymbolNumbers={false}
        onShowSymbolNumbersChange={vi.fn()}
        onLoadFile={onLoadFile}
        onRandomTask={vi.fn()}
      />,
    )
    const input = screen.getByTestId('load-task-file') as HTMLInputElement
    const file = new File(['{}'], 'task.json', { type: 'application/json' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onLoadFile).toHaveBeenCalledWith(file)
  })
})
