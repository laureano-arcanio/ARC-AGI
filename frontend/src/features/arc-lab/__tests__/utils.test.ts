import { describe, it, expect } from 'vitest'
import {
  cellKey,
  cloneGrid,
  computeCellSize,
  createGrid,
  floodfill,
  formatSize,
  getConnectedComponent,
  gridsEqual,
  gridHeight,
  gridWidth,
  parseCellKey,
  parseSize,
  rotateSelection,
  selectObject,
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

describe('getConnectedComponent', () => {
  it('returns all same-color connected cells (4-directional)', () => {
    const grid = [
      [1, 1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ]
    expect(getConnectedComponent(grid, 0, 0)).toEqual(new Set(['0,0', '0,1', '1,0']))
  })

  it('returns a single cell when it has no same-color neighbors', () => {
    const grid = [
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]
    expect(getConnectedComponent(grid, 0, 1)).toEqual(new Set(['0,1']))
  })

  it('ignores diagonal neighbor of different selection (4-dir only)', () => {
    const grid = [
      [1, 0],
      [0, 1],
    ]
    expect(getConnectedComponent(grid, 0, 0)).toEqual(new Set(['0,0']))
  })

  it('includes diagonal cell only if connected via 4-dir path', () => {
    const grid = [
      [1, 1],
      [1, 1],
    ]
    expect(getConnectedComponent(grid, 0, 0)).toEqual(new Set(['0,0', '0,1', '1,0', '1,1']))
  })

  it('returns all black cells when clicking a black (0) cell', () => {
    const grid = [
      [0, 0],
      [0, 0],
    ]
    expect(getConnectedComponent(grid, 0, 0)).toEqual(new Set(['0,0', '0,1', '1,0', '1,1']))
  })

  it('returns empty set when start is out of bounds', () => {
    const grid = [[1]]
    expect(getConnectedComponent(grid, 5, 5)).toEqual(new Set())
  })

  it('selects the entire grid when all cells share the color', () => {
    const grid = [
      [2, 2, 2],
      [2, 2, 2],
      [2, 2, 2],
    ]
    const expected = new Set([
      '0,0', '0,1', '0,2',
      '1,0', '1,1', '1,2',
      '2,0', '2,1', '2,2',
    ])
    expect(getConnectedComponent(grid, 1, 1)).toEqual(expected)
  })

  it('does not mutate the grid', () => {
    const grid = [
      [1, 1],
      [0, 0],
    ]
    const before = grid.map((r) => [...r])
    getConnectedComponent(grid, 0, 0)
    expect(grid).toEqual(before)
  })
})

describe('selectObject', () => {
  it('selects only boundary for an open shape (cross)', () => {
    const grid = [
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
    ]
    const result = selectObject(grid, 2, 2)
    const expected = getConnectedComponent(grid, 2, 2)
    expect(result).toEqual(expected)
  })

  it('selects boundary + interior for a closed shape (square)', () => {
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 1, 0, 1, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ]
    const result = selectObject(grid, 1, 1)
    expect(result).toEqual(new Set([
      '1,1', '1,2', '1,3',
      '2,1', '2,3',
      '3,1', '3,2', '3,3',
      '2,2',
    ]))
  })

  it('selects boundary + interior for a closed shape touching grid edge', () => {
    const grid = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ]
    const result = selectObject(grid, 0, 0)
    const allCells = new Set([
      '0,0', '0,1', '0,2', '0,3', '0,4',
      '1,0', '1,1', '1,2', '1,3', '1,4',
      '2,0', '2,1', '2,2', '2,3', '2,4',
      '3,0', '3,1', '3,2', '3,3', '3,4',
    ])
    expect(result).toEqual(allCells)
  })

  it('selects boundary + interior for a donut shape (ring)', () => {
    const grid = [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 1, 0],
      [0, 1, 0, 0, 0, 1, 0],
      [0, 1, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ]
    const result = selectObject(grid, 1, 1)
    const boundary = getConnectedComponent(grid, 1, 1)
    expect(result.size).toBeGreaterThan(boundary.size)
    for (const key of boundary) {
      expect(result.has(key)).toBe(true)
    }
    expect(result.has('2,2')).toBe(true)
    expect(result.has('2,3')).toBe(true)
    expect(result.has('2,4')).toBe(true)
    expect(result.has('3,2')).toBe(true)
    expect(result.has('3,3')).toBe(true)
    expect(result.has('3,4')).toBe(true)
  })

  it('returns empty set for out-of-bounds click', () => {
    const grid = [[1]]
    expect(selectObject(grid, 5, 5)).toEqual(new Set())
  })

  it('returns only boundary for a single isolated cell', () => {
    const grid = [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ]
    const result = selectObject(grid, 1, 1)
    expect(result).toEqual(new Set(['1,1']))
  })
})

describe('rotateSelection', () => {
  it('returns to original after 4 rotations (L-shape)', () => {
    const grid = [
      [0, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ]
    const original = cloneGrid(grid)
    let sel = new Set(['1,1', '2,1', '2,2'])
    for (let i = 0; i < 4; i++) {
      const result = rotateSelection(grid, sel)
      grid.splice(0, grid.length, ...result.outputGrid)
      sel = result.newSelected
    }
    expect(grid).toEqual(original)
    expect(sel).toEqual(new Set(['1,1', '2,1', '2,2']))
  })

  it('returns to original after 4 rotations (3x1 vertical line)', () => {
    const grid = [
      [0, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ]
    const original = cloneGrid(grid)
    let sel = new Set(['1,1', '2,1', '3,1'])
    for (let i = 0; i < 4; i++) {
      const result = rotateSelection(grid, sel)
      grid.splice(0, grid.length, ...result.outputGrid)
      sel = result.newSelected
    }
    expect(grid).toEqual(original)
    expect(sel).toEqual(new Set(['1,1', '2,1', '3,1']))
  })

  it('single cell returns to itself after rotation', () => {
    const grid = [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ]
    const result = rotateSelection(grid, new Set(['1,1']))
    expect(result.outputGrid[1][1]).toBe(1)
    expect(result.newSelected).toEqual(new Set(['1,1']))
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


