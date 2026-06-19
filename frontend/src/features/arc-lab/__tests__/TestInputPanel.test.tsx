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
})
