import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OutputEditor } from '../components/OutputEditor'

const baseProps = {
  grid: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
  toolMode: 'edit' as const,
  selectedSymbol: 0,
  showNumbers: false,
  selectedCells: new Set<string>(),
  sizeInput: '3x3',
  hypothesisText: '',
  onHypothesisChange: vi.fn(),
  onHypothesisSubmit: vi.fn(),
  onSizeInputChange: vi.fn(),
  onResize: vi.fn(),
  onCopyFromInput: vi.fn(),
  onReset: vi.fn(),
  onSubmit: vi.fn(),
  onAbandon: vi.fn(),
  onCellClick: vi.fn(),
  onSelectionChange: vi.fn(),
  onToolModeChange: vi.fn(),
  onSymbolSelect: vi.fn(),
}

describe('OutputEditor', () => {
  it('renders resize, copy, reset, and submit buttons', () => {
    render(<OutputEditor {...baseProps} />)
    expect(screen.getByTestId('resize-btn')).toBeInTheDocument()
    expect(screen.getByTestId('copy-from-input')).toBeInTheDocument()
    expect(screen.getByTestId('reset-btn')).toBeInTheDocument()
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument()
    expect(screen.getByTestId('abandon-btn')).toBeInTheDocument()
  })

  it('renders the editable grid', () => {
    render(<OutputEditor {...baseProps} />)
    expect(screen.getByTestId('editable-grid')).toBeInTheDocument()
  })

  it('renders the symbol picker', () => {
    render(<OutputEditor {...baseProps} />)
    expect(screen.getByTestId('symbol-picker')).toBeInTheDocument()
  })

  it('calls onResize when the resize button is clicked', () => {
    const onResize = vi.fn()
    render(<OutputEditor {...baseProps} onResize={onResize} />)
    fireEvent.click(screen.getByTestId('resize-btn'))
    expect(onResize).toHaveBeenCalledTimes(1)
  })

  it('calls onResize on Enter in the size input', () => {
    const onResize = vi.fn()
    render(<OutputEditor {...baseProps} onResize={onResize} />)
    fireEvent.keyDown(screen.getByTestId('output-grid-size'), { key: 'Enter' })
    expect(onResize).toHaveBeenCalledTimes(1)
  })

  it('calls onSizeInputChange when typing', () => {
    const onSizeInputChange = vi.fn()
    render(<OutputEditor {...baseProps} onSizeInputChange={onSizeInputChange} />)
    fireEvent.change(screen.getByTestId('output-grid-size'), { target: { value: '5x5' } })
    expect(onSizeInputChange).toHaveBeenCalledWith('5x5')
  })

  it('calls onCopyFromInput, onReset, and onSubmit', () => {
    const onCopyFromInput = vi.fn()
    const onReset = vi.fn()
    const onSubmit = vi.fn()
    const onAbandon = vi.fn()
    render(
      <OutputEditor
        {...baseProps}
        onCopyFromInput={onCopyFromInput}
        onReset={onReset}
        onSubmit={onSubmit}
        onAbandon={onAbandon}
      />,
    )
    fireEvent.click(screen.getByTestId('copy-from-input'))
    fireEvent.click(screen.getByTestId('reset-btn'))
    fireEvent.click(screen.getByTestId('abandon-btn'))
    fireEvent.click(screen.getByTestId('submit-btn'))
    expect(onCopyFromInput).toHaveBeenCalledTimes(1)
    expect(onReset).toHaveBeenCalledTimes(1)
    expect(onAbandon).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('forwards cell clicks to onCellClick', () => {
    const onCellClick = vi.fn()
    render(<OutputEditor {...baseProps} onCellClick={onCellClick} />)
    const cell = screen.getByTestId('0,0')
    fireEvent.mouseDown(cell)
    fireEvent.mouseUp(cell)
    expect(onCellClick).toHaveBeenCalledWith(0, 0)
  })

  it('forwards symbol selection', () => {
    const onSymbolSelect = vi.fn()
    render(<OutputEditor {...baseProps} onSymbolSelect={onSymbolSelect} />)
    fireEvent.click(screen.getByTestId('symbol-4'))
    expect(onSymbolSelect).toHaveBeenCalledWith(4)
  })
})
