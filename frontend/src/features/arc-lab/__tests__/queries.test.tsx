import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useRandomTask, useTaskList } from '../queries'
import * as api from '../api'
import type { ArcTask } from '../types'

const sampleTask: ArcTask = {
  train: [{ input: [[0]], output: [[1]] }],
  test: [{ input: [[0]], output: [[1]] }],
}

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

  describe('useTaskList', () => {
    it('returns task list data', async () => {
      vi.spyOn(api, 'listTasks').mockResolvedValue([
        { name: 'a.json', download_url: 'https://example.com/a.json' },
      ])

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTaskList('training'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toHaveLength(1)
      expect(result.current.data![0].name).toBe('a.json')
    })

    it('exposes error state on failure', async () => {
      vi.spyOn(api, 'listTasks').mockRejectedValue(new Error('boom'))

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTaskList('training'), { wrapper })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toBe('boom')
    })
  })

  describe('useRandomTask', () => {
    it('fetches a random task on mutate', async () => {
      vi.spyOn(api, 'fetchRandomTask').mockResolvedValue({
        task: sampleTask,
        name: 'a.json',
        index: 0,
        total: 1,
        subset: 'training',
      })

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useRandomTask(), { wrapper })

      result.current.mutate('training')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(api.fetchRandomTask).toHaveBeenCalledWith('training')
      expect(result.current.data?.name).toBe('a.json')
    })

    it('exposes error state on failure', async () => {
      vi.spyOn(api, 'fetchRandomTask').mockRejectedValue(new Error('network down'))

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useRandomTask(), { wrapper })

      result.current.mutate('training')

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toBe('network down')
    })
  })
})
