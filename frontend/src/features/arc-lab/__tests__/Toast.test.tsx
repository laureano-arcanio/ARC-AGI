import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Toast } from '../components/Toast'

describe('Toast', () => {
  it('renders nothing when message is null', () => {
    const { container } = render(<Toast message={null} onDismiss={vi.fn()} />)
    expect(container.firstChild).toBeNull()
    expect(screen.queryByTestId('toast')).not.toBeInTheDocument()
  })

  it('renders error messages with error styling', () => {
    render(<Toast message={{ kind: 'error', text: 'Wrong solution.' }} onDismiss={vi.fn()} />)
    const toast = screen.getByTestId('toast')
    expect(toast).toHaveTextContent('Wrong solution.')
    expect(toast.getAttribute('data-kind')).toBe('error')
    expect(toast).toHaveAttribute('role', 'alert')
    expect(toast.className).toContain('red')
  })

  it('renders info messages with info styling', () => {
    render(<Toast message={{ kind: 'info', text: 'Correct solution!' }} onDismiss={vi.fn()} />)
    const toast = screen.getByTestId('toast')
    expect(toast).toHaveTextContent('Correct solution!')
    expect(toast.getAttribute('data-kind')).toBe('info')
    expect(toast).toHaveAttribute('role', 'status')
    expect(toast.className).toContain('green')
  })

  it('auto-dismisses after the duration', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<Toast message={{ kind: 'info', text: 'hi' }} durationMs={1000} onDismiss={onDismiss} />)
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('does not auto-dismiss when no message', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<Toast message={null} durationMs={1000} onDismiss={onDismiss} />)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(onDismiss).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
