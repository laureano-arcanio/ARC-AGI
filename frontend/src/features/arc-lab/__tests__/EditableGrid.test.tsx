import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EditableGrid } from '../components/EditableGrid'

const grid3 = [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
]

describe('EditableGrid', () => {
  it('renders all cells', () => {
    render(
      <EditableGrid
        grid={grid3}
        toolMode="edit"
        showNumbers={false}
        selectedCells={new Set()}
        onCellClick={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    )
    expect(screen.getByTestId('0,0')).toBeInTheDocument()
    expect(screen.getByTestId('2,2')).toBeInTheDocument()
  })

  it('calls onCellClick in edit mode', () => {
    const onCellClick = vi.fn()
    render(
      <EditableGrid
        grid={grid3}
        toolMode="edit"
        showNumbers={false}
        selectedCells={new Set()}
        onCellClick={onCellClick}
        onSelectionChange={vi.fn()}
      />,
    )
    const cell = screen.getByTestId('1,1')
    fireEvent.mouseDown(cell)
    fireEvent.mouseUp(cell)
    expect(onCellClick).toHaveBeenCalledWith(1, 1)
  })

  it('calls onCellClick in floodfill mode', () => {
    const onCellClick = vi.fn()
    render(
      <EditableGrid
        grid={grid3}
        toolMode="floodfill"
        showNumbers={false}
        selectedCells={new Set()}
        onCellClick={onCellClick}
        onSelectionChange={vi.fn()}
      />,
    )
    const cell = screen.getByTestId('0,0')
    fireEvent.mouseDown(cell)
    fireEvent.mouseUp(cell)
    expect(onCellClick).toHaveBeenCalledWith(0, 0)
  })

  it('fills cell and switches to edit on single click in select mode', () => {
    const onCellClick = vi.fn()
    const onToolModeChange = vi.fn()
    render(
      <EditableGrid
        grid={grid3}
        toolMode="select"
        showNumbers={false}
        selectedCells={new Set()}
        onCellClick={onCellClick}
        onSelectionChange={vi.fn()}
        onToolModeChange={onToolModeChange}
      />,
    )
    const cell = screen.getByTestId('0,0')
    fireEvent.mouseDown(cell)
    fireEvent.mouseUp(cell)
    expect(onToolModeChange).toHaveBeenCalledWith('edit')
    expect(onCellClick).toHaveBeenCalledWith(0, 0)
  })

  it('starts a selection on mousedown in select mode', () => {
    const onSelectionChange = vi.fn()
    render(
      <EditableGrid
        grid={grid3}
        toolMode="select"
        showNumbers={false}
        selectedCells={new Set()}
        onCellClick={vi.fn()}
        onSelectionChange={onSelectionChange}
      />,
    )
    fireEvent.mouseDown(screen.getByTestId('1,2'))
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['1,2']))
  })

  it('grows selection on mouseenter while dragging', () => {
    const onSelectionChange = vi.fn()
    const selected = new Set(['0,0'])
    render(
      <EditableGrid
        grid={grid3}
        toolMode="select"
        showNumbers={false}
        selectedCells={selected}
        onCellClick={vi.fn()}
        onSelectionChange={onSelectionChange}
      />,
    )
    const cell00 = screen.getByTestId('0,0')
    fireEvent.mouseDown(cell00)
    fireEvent.mouseEnter(screen.getByTestId('0,1'))
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['0,0', '0,1']))
  })

  it('marks selected cells with outline', () => {
    render(
      <EditableGrid
        grid={grid3}
        toolMode="select"
        showNumbers={false}
        selectedCells={new Set(['1,1'])}
        onCellClick={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    )
    expect(screen.getByTestId('1,1').style.outline).toContain('#f97316')
    expect(screen.getByTestId('0,0').style.outline).not.toContain('orange')
  })
})
