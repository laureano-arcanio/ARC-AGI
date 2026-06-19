import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchRandomTask,
  fetchTaskByUrl,
  listTasks,
  readTaskFromFile,
} from '../api'
import type { ArcTask } from '../types'

const sampleTask: ArcTask = {
  train: [{ input: [[0, 1], [2, 3]], output: [[1, 1], [1, 1]] }],
  test: [{ input: [[0, 0]], output: [[1, 1]] }],
}

type FakeFileReader = {
  readAsText: ReturnType<typeof vi.fn>
  onload: ((e: { target: { result: unknown } }) => void) | null
  onerror: (() => void) | null
}

function makeFileReaderMock(): { klass: new () => FakeFileReader; instances: FakeFileReader[] } {
  const instances: FakeFileReader[] = []
  const klass = function (this: FakeFileReader) {
    this.readAsText = vi.fn()
    this.onload = null
    this.onerror = null
    instances.push(this)
    return this
  } as unknown as new () => FakeFileReader
  return { klass, instances }
}

describe('api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('listTasks', () => {
    it('fetches the GitHub contents endpoint', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => [{ name: 'a.json', download_url: 'https://example.com/a.json' }],
      })

      const tasks = await listTasks('training')

      expect(tasks).toEqual([{ name: 'a.json', download_url: 'https://example.com/a.json' }])
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/fchollet/ARC/contents/data/training',
        expect.objectContaining({ headers: expect.any(Object) }),
      )
    })

    it('throws on non-ok response', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      })

      await expect(listTasks('training')).rejects.toThrow('HTTP 403')
    })
  })

  describe('fetchTaskByUrl', () => {
    it('returns parsed task JSON', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => sampleTask,
      })

      const task = await fetchTaskByUrl('https://example.com/a.json')
      expect(task).toEqual(sampleTask)
    })

    it('throws on non-ok response', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(fetchTaskByUrl('https://example.com/missing.json')).rejects.toThrow('HTTP 404')
    })
  })

  describe('fetchRandomTask', () => {
    it('lists tasks and fetches a random one', async () => {
      const contents = [{ name: 'a.json', download_url: 'https://example.com/a.json' }]
      ;(globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ok: true, json: async () => contents })
        .mockResolvedValueOnce({ ok: true, json: async () => sampleTask })

      const result = await fetchRandomTask('training')

      expect(result.task).toEqual(sampleTask)
      expect(result.name).toBe('a.json')
      expect(result.total).toBe(1)
      expect(result.subset).toBe('training')
    })

    it('throws when subset is empty', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      await expect(fetchRandomTask('training')).rejects.toThrow('No tasks available')
    })

    it('throws on bad file format', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ok: true, json: async () => [{ name: 'a.json', download_url: 'u' }] })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ train: 'nope' }) })

      await expect(fetchRandomTask('training')).rejects.toThrow('Bad file format')
    })
  })

  describe('readTaskFromFile', () => {
    it('resolves with parsed task and file name', async () => {
      const { klass, instances } = makeFileReaderMock()
      vi.stubGlobal('FileReader', klass)

      const promise = readTaskFromFile(new File([''], 'task.json'))
      instances[0].onload!({ target: { result: JSON.stringify(sampleTask) } })

      const result = await promise
      expect(result.name).toBe('task.json')
      expect(result.task).toEqual(sampleTask)
    })

    it('rejects on bad JSON', async () => {
      const { klass, instances } = makeFileReaderMock()
      vi.stubGlobal('FileReader', klass)

      const promise = readTaskFromFile(new File([''], 'task.json'))
      instances[0].onload!({ target: { result: 'not json' } })

      await expect(promise).rejects.toThrow('Bad file format')
    })

    it('rejects on missing train/test arrays', async () => {
      const { klass, instances } = makeFileReaderMock()
      vi.stubGlobal('FileReader', klass)

      const promise = readTaskFromFile(new File([''], 'task.json'))
      instances[0].onload!({ target: { result: JSON.stringify({ train: [] }) } })

      await expect(promise).rejects.toThrow('Bad file format')
    })
  })
})
