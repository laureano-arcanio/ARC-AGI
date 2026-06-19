import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePauseInterception } from '../hooks/usePauseInterception'

describe('usePauseInterception', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows an action while the user is active', () => {
    const onIntercept = vi.fn()
    const { result } = renderHook(() =>
      usePauseInterception({ onIntercept }),
    )
    expect(result.current.interceptAction()).toBe(false)
    expect(onIntercept).not.toHaveBeenCalled()
  })

  it('intercepts an action after the inactivity threshold', () => {
    const onIntercept = vi.fn()
    const { result } = renderHook(() =>
      usePauseInterception({ onIntercept }),
    )
    act(() => {
      vi.advanceTimersByTime(61_000)
    })
    expect(result.current.interceptAction()).toBe(true)
    expect(onIntercept).toHaveBeenCalledTimes(1)
  })

  it('blocks actions during the 1-second cooldown without re-invoking onIntercept', () => {
    const onIntercept = vi.fn()
    const { result } = renderHook(() =>
      usePauseInterception({ onIntercept }),
    )
    act(() => {
      vi.advanceTimersByTime(61_000)
    })
    expect(result.current.interceptAction()).toBe(true)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.interceptAction()).toBe(true)
    expect(onIntercept).toHaveBeenCalledTimes(1)
  })

  it('allows an action again after the cooldown elapses', () => {
    const onIntercept = vi.fn()
    const { result } = renderHook(() =>
      usePauseInterception({ onIntercept }),
    )
    act(() => {
      vi.advanceTimersByTime(61_000)
    })
    result.current.interceptAction()
    act(() => {
      vi.advanceTimersByTime(1_200)
    })
    expect(result.current.interceptAction()).toBe(false)
  })

  it('resets the inactivity clock on a successful action', () => {
    const onIntercept = vi.fn()
    const { result } = renderHook(() =>
      usePauseInterception({ onIntercept }),
    )
    act(() => {
      vi.advanceTimersByTime(40_000)
    })
    expect(result.current.interceptAction()).toBe(false)
    act(() => {
      vi.advanceTimersByTime(40_000)
    })
    expect(result.current.interceptAction()).toBe(false)
    expect(onIntercept).not.toHaveBeenCalled()
  })

  it('reset restarts the inactivity clock', () => {
    const onIntercept = vi.fn()
    const { result } = renderHook(() =>
      usePauseInterception({ onIntercept }),
    )
    act(() => {
      vi.advanceTimersByTime(40_000)
    })
    result.current.reset()
    act(() => {
      vi.advanceTimersByTime(40_000)
    })
    expect(result.current.interceptAction()).toBe(false)
    expect(onIntercept).not.toHaveBeenCalled()
  })
})
