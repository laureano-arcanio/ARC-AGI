import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useRandomTasks, useTaskById } from '../queries'
import * as api from '../api'
import type { ArcTaskRead } from '../types'

const sampleTasks: ArcTaskRead[] = [
  {
    id: 't1',
    train: [{ input: [[0]], output: [[1]] }],
    test: [{ input: [[0]], output: [[1]] }],
  },
]

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { wrapper, queryClient }
}

describe('queries', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('useRandomTasks', () => {
    it('fetches tasks on mount', async () => {
      vi.spyOn(api, 'fetchRandomTasks').mockResolvedValue(sampleTasks)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useRandomTasks(10), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(api.fetchRandomTasks).toHaveBeenCalledWith(10)
      expect(result.current.data).toEqual(sampleTasks)
    })

    it('defaults count to 10 when omitted', async () => {
      vi.spyOn(api, 'fetchRandomTasks').mockResolvedValue(sampleTasks)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useRandomTasks(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(api.fetchRandomTasks).toHaveBeenCalledWith(10)
      expect(result.current.data).toHaveLength(1)
    })

    it('exposes error state on failure', async () => {
      vi.spyOn(api, 'fetchRandomTasks').mockRejectedValue(new Error('network down'))

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useRandomTasks(10), { wrapper })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toBe('network down')
    })

    it('does not fetch when enabled is false', () => {
      vi.spyOn(api, 'fetchRandomTasks')

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useRandomTasks(10, false), { wrapper })

      expect(result.current.isFetching).toBe(false)
      expect(api.fetchRandomTasks).not.toHaveBeenCalled()
    })
  })

  describe('useTaskById', () => {
    it('fetches a single task by ID', async () => {
      const task: ArcTaskRead = { id: 'abc', train: [], test: [] }
      vi.spyOn(api, 'fetchTaskById').mockResolvedValue(task)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTaskById('abc'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(api.fetchTaskById).toHaveBeenCalledWith('abc')
      expect(result.current.data).toEqual(task)
    })

    it('does not fetch when taskId is empty', () => {
      vi.spyOn(api, 'fetchTaskById')

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTaskById(''), { wrapper })

      expect(result.current.isFetching).toBe(false)
      expect(api.fetchTaskById).not.toHaveBeenCalled()
    })

    it('does not fetch when taskId is "random"', () => {
      vi.spyOn(api, 'fetchTaskById')

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTaskById('random'), { wrapper })

      expect(result.current.isFetching).toBe(false)
      expect(api.fetchTaskById).not.toHaveBeenCalled()
    })
  })
})
