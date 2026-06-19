import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GridDisplay } from '../components/GridDisplay'

describe('GridDisplay', () => {
  it('renders one cell per grid entry', () => {
    const grid = [
      [1, 2],
      [3, 4],
    ]
    render(<GridDisplay grid={grid} />)
    expect(screen.getByTestId('0,0')).toBeInTheDocument()
    expect(screen.getByTestId('0,1')).toBeInTheDocument()
    expect(screen.getByTestId('1,0')).toBeInTheDocument()
    expect(screen.getByTestId('1,1')).toBeInTheDocument()
  })

  it('renders an empty grid without crashing', () => {
    render(<GridDisplay grid={[]} />)
    expect(screen.getByTestId('grid-display')).toBeInTheDocument()
  })

  it('does not attach click handlers (read-only)', () => {
    const grid = [[1]]
    render(<GridDisplay grid={grid} />)
    const cell = screen.getByTestId('0,0')
    expect(cell.style.cursor).toBe('default')
  })

  it('propagates showNumbers to cells', () => {
    const grid = [[5]]
    render(<GridDisplay grid={grid} showNumbers />)
    expect(screen.getByTestId('0,0').textContent).toBe('5')
  })
})
