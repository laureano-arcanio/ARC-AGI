import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GridCell } from '../components/GridCell'
import { COLOR_MAP } from '../types'

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}

describe('GridCell', () => {
  it('renders with the symbol background color', () => {
    const { container } = render(<GridCell x={0} y={0} symbol={2} size={50} />)
    const cell = container.firstChild as HTMLElement
    expect(cell.style.backgroundColor).toBe(hexToRgb(COLOR_MAP[2]))
  })

  it('exposes data attributes for coordinates and symbol', () => {
    render(<GridCell x={1} y={2} symbol={3} size={50} />)
    const cell = screen.getByTestId('1,2')
    expect(cell.getAttribute('data-x')).toBe('1')
    expect(cell.getAttribute('data-y')).toBe('2')
    expect(cell.getAttribute('data-symbol')).toBe('3')
  })

  it('shows the number when showNumber is true', () => {
    render(<GridCell x={0} y={0} symbol={4} size={50} showNumber />)
    expect(screen.getByTestId('0,0').textContent).toBe('4')
  })

  it('hides the number by default', () => {
    render(<GridCell x={0} y={0} symbol={4} size={50} />)
    expect(screen.getByTestId('0,0').textContent).toBe('')
  })

  it('applies selected outline when selected', () => {
    render(<GridCell x={0} y={0} symbol={0} size={50} selected />)
    expect(screen.getByTestId('0,0').style.outline).toContain('#f97316')
  })

  it('calls onClick with coordinates', () => {
    const onClick = vi.fn()
    render(<GridCell x={2} y={3} symbol={0} size={50} onClick={onClick} />)
    fireEvent.click(screen.getByTestId('2,3'))
    expect(onClick).toHaveBeenCalledWith(2, 3)
  })

  it('calls onMouseDown with coordinates', () => {
    const onMouseDown = vi.fn()
    render(<GridCell x={1} y={1} symbol={0} size={50} onMouseDown={onMouseDown} />)
    fireEvent.mouseDown(screen.getByTestId('1,1'))
    expect(onMouseDown).toHaveBeenCalledWith(1, 1)
  })
})
