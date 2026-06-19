import { describe, it, expect } from 'vitest'
import {
  cellKey,
  cloneGrid,
  computeCellSize,
  createGrid,
  floodfill,
  formatSize,
  gridsEqual,
  gridHeight,
  gridWidth,
  parseCellKey,
  parseSize,
  pasteClipboard,
  serializeGridToGridObject,
} from '../utils'

describe('createGrid', () => {
  it('creates a grid of zeros by default', () => {
    expect(createGrid(2, 3)).toEqual([
      [0, 0, 0],
      [0, 0, 0],
    ])
  })

  it('fills from values when provided', () => {
    expect(createGrid(2, 2, [[1, 2], [3, 4]])).toEqual([[1, 2], [3, 4]])
  })

  it('defaults to 3x3 when no args', () => {
    const grid = createGrid()
    expect(gridHeight(grid)).toBe(3)
    expect(gridWidth(grid)).toBe(3)
  })

  it('fills zeros when values smaller than dimensions', () => {
    expect(createGrid(2, 2, [[1]])).toEqual([[1, 0], [0, 0]])
  })
})

describe('cloneGrid', () => {
  it('produces a deep copy', () => {
    const original = [[1, 2], [3, 4]]
    const copy = cloneGrid(original)
    expect(copy).toEqual(original)
    copy[0][0] = 9
    expect(original[0][0]).toBe(1)
  })
})

describe('floodfill', () => {
  it('fills connected region of same value', () => {
    const grid = [
      [0, 0, 1],
      [0, 1, 1],
      [0, 0, 0],
    ]
    floodfill(grid, 0, 0, 5)
    expect(grid).toEqual([
      [5, 5, 1],
      [5, 1, 1],
      [5, 5, 5],
    ])
  })

  it('does nothing when target equals symbol', () => {
    const grid = [[1, 1], [1, 1]]
    floodfill(grid, 0, 0, 1)
    expect(grid).toEqual([[1, 1], [1, 1]])
  })

  it('fills entire grid when all same value', () => {
    const grid = [[0, 0], [0, 0]]
    floodfill(grid, 0, 0, 7)
    expect(grid).toEqual([[7, 7], [7, 7]])
  })
})

describe('parseSize', () => {
  it('parses valid size', () => {
    expect(parseSize('3x3')).toEqual({ ok: true, height: 3, width: 3 })
    expect(parseSize('5x7')).toEqual({ ok: true, height: 5, width: 7 })
  })

  it('rejects malformed input', () => {
    expect(parseSize('33').ok).toBe(false)
    expect(parseSize('abc').ok).toBe(false)
  })

  it('rejects sizes below 1', () => {
    expect(parseSize('0x3').ok).toBe(false)
    expect(parseSize('3x0').ok).toBe(false)
  })

  it('rejects sizes above 30', () => {
    expect(parseSize('31x3').ok).toBe(false)
    expect(parseSize('3x31').ok).toBe(false)
  })
})

describe('formatSize', () => {
  it('formats dimensions as HxW', () => {
    expect(formatSize(3, 3)).toBe('3x3')
    expect(formatSize(5, 7)).toBe('5x7')
  })
})

describe('gridsEqual', () => {
  it('returns true for identical grids', () => {
    expect(gridsEqual([[1, 2]], [[1, 2]])).toBe(true)
  })

  it('returns false for different heights', () => {
    expect(gridsEqual([[1]], [[1], [2]])).toBe(false)
  })

  it('returns false for different widths', () => {
    expect(gridsEqual([[1, 2]], [[1, 2, 3]])).toBe(false)
  })

  it('returns false for different values', () => {
    expect(gridsEqual([[1, 2]], [[1, 3]])).toBe(false)
  })
})

describe('serializeGridToGridObject', () => {
  it('converts a 2D array into a grid copy', () => {
    const result = serializeGridToGridObject([[1, 2], [3, 4]])
    expect(result).toEqual([[1, 2], [3, 4]])
  })
})

describe('cellKey / parseCellKey', () => {
  it('round-trips coordinates', () => {
    expect(cellKey(2, 5)).toBe('2,5')
    expect(parseCellKey('2,5')).toEqual({ x: 2, y: 5 })
  })
})

describe('computeCellSize', () => {
  it('fits within container and max', () => {
    expect(computeCellSize(3, 3, 200, 200, 100)).toBe(Math.floor((200 - 3) / 3))
  })

  it('caps at maxCellSize', () => {
    expect(computeCellSize(1, 1, 500, 500, 100)).toBe(100)
  })
})

describe('pasteClipboard', () => {
  it('pastes clipboard entries relative to target', () => {
    const grid = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]
    const clipboard = [
      { x: 0, y: 0, symbol: 5 },
      { x: 0, y: 1, symbol: 5 },
    ]
    pasteClipboard(grid, clipboard, 1, 1)
    expect(grid).toEqual([
      [0, 0, 0],
      [0, 5, 5],
      [0, 0, 0],
    ])
  })

  it('ignores entries that fall outside the grid', () => {
    const grid = [
      [0, 0],
      [0, 0],
    ]
    const clipboard = [
      { x: 0, y: 0, symbol: 1 },
      { x: 0, y: 1, symbol: 1 },
    ]
    pasteClipboard(grid, clipboard, 1, 1)
    expect(grid[1][1]).toBe(1)
  })
})
