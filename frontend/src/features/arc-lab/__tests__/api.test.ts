import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchRandomTasks, fetchTaskById } from '../api'
import type { ArcTaskRead } from '../types'

const sampleTasks: ArcTaskRead[] = [
  {
    id: 't1',
    train: [{ input: [[0, 1]], output: [[1, 1]] }],
    test: [{ input: [[0, 0]], output: [[1, 1]] }],
  },
  {
    id: 't2',
    train: [{ input: [[2]], output: [[3]] }],
    test: [{ input: [[2]], output: [[3]] }],
  },
]

describe('api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('fetches random tasks from the backend arc-tasks endpoint', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => sampleTasks,
    })

    const result = await fetchRandomTasks(10)

    expect(result).toEqual(sampleTasks)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/arc-tasks/random?count=10'),
      expect.objectContaining({ headers: expect.any(Object) }),
    )
  })

  it('defaults count to 10', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => sampleTasks,
    })

    await fetchRandomTasks()

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('count=10'),
      expect.any(Object),
    )
  })

  it('throws on non-ok response', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
    })

    await expect(fetchRandomTasks()).rejects.toThrow('HTTP 500')
  })

  describe('fetchTaskById', () => {
    it('fetches a single task by its ID', async () => {
      const task = sampleTasks[0]
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => task,
      })

      const result = await fetchTaskById('t1')

      expect(result).toEqual(task)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/arc-tasks/t1'),
        expect.any(Object),
      )
    })

    it('throws on non-ok response', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(fetchTaskById('nonexistent')).rejects.toThrow('HTTP 404')
    })
  })
})
