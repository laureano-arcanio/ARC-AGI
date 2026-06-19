import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TestInputPanel } from '../components/TestInputPanel'

describe('TestInputPanel', () => {
  it('shows current index and total', () => {
    render(
      <TestInputPanel input={[[1]]} currentIndex={1} total={3} onNext={vi.fn()} />,
    )
    expect(screen.getByTestId('test-input-panel').textContent).toContain('2/3')
  })

  it('renders the input grid cells', () => {
    render(
      <TestInputPanel input={[[1, 2], [3, 4]]} currentIndex={0} total={1} onNext={vi.fn()} />,
    )
    expect(screen.getByTestId('0,0')).toBeInTheDocument()
    expect(screen.getByTestId('1,1')).toBeInTheDocument()
  })

  it('calls onNext when the next button is clicked', () => {
    const onNext = vi.fn()
    render(<TestInputPanel input={[[1]]} currentIndex={0} total={2} onNext={onNext} />)
    fireEvent.click(screen.getByTestId('next-test-input'))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('shows symbol numbers when showNumbers is true', () => {
    render(
      <TestInputPanel input={[[7]]} currentIndex={0} total={1} showNumbers onNext={vi.fn()} />,
    )
    expect(screen.getByTestId('0,0').textContent).toBe('7')
  })

  it('shows a warning when there are multiple test inputs and not on the last one', () => {
    render(
      <TestInputPanel input={[[1]]} currentIndex={0} total={3} onNext={vi.fn()} />,
    )
    expect(screen.getByText('panel.multi_test_warning')).toBeInTheDocument()
  })

  it('hides the warning on the last test input', () => {
    render(
      <TestInputPanel input={[[1]]} currentIndex={2} total={3} onNext={vi.fn()} />,
    )
    expect(screen.queryByText('panel.multi_test_warning')).not.toBeInTheDocument()
  })

  it('hides the warning when there is only one test input', () => {
    render(
      <TestInputPanel input={[[1]]} currentIndex={0} total={1} onNext={vi.fn()} />,
    )
    expect(screen.queryByText('panel.multi_test_warning')).not.toBeInTheDocument()
  })
})
