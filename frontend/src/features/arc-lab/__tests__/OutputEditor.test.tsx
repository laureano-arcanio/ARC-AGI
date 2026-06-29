import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OutputEditor } from '../components/OutputEditor'

const baseProps = {
  grid: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
  toolMode: 'edit' as const,
  selectedSymbol: 0,
  showNumbers: false,
  selectedCells: new Set<string>(),
  clipboard: null,
  sizeInput: '3x3',
  hypothesisText: '',
  onHypothesisChange: vi.fn(),
  onHypothesisSubmit: vi.fn(),
  failureAnalysisText: '',
  onFailureAnalysisChange: vi.fn(),
  onFailureAnalysisSubmit: vi.fn(),
  branchPivotText: '',
  onBranchPivotChange: vi.fn(),
  onBranchPivotSubmit: vi.fn(),
  correctAnalysisText: '',
  onCorrectAnalysisChange: vi.fn(),
  onCorrectAnalysisSubmit: vi.fn(),
  onSizeInputChange: vi.fn(),
  onResize: vi.fn(),
  onCopyFromInput: vi.fn(),
  onReset: vi.fn(),
  onCellClick: vi.fn(),
  onSelectionChange: vi.fn(),
  onToolModeChange: vi.fn(),
  onSymbolSelect: vi.fn(),
  onCopySelection: vi.fn(),
  onPasteSelection: vi.fn(),
  onPrev: vi.fn(),
  onNext: vi.fn(),
  canGoPrev: true,
  canGoNext: true,
}

describe('OutputEditor', () => {
  it('renders resize and copy buttons', () => {
    render(<OutputEditor {...baseProps} />)
    expect(screen.getByTestId('resize-btn')).toBeInTheDocument()
    expect(screen.getByTestId('copy-from-input')).toBeInTheDocument()
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

  it('calls onCopyFromInput', () => {
    const onCopyFromInput = vi.fn()
    render(
      <OutputEditor
        {...baseProps}
        onCopyFromInput={onCopyFromInput}
      />,
    )
    fireEvent.click(screen.getByTestId('copy-from-input'))
    expect(onCopyFromInput).toHaveBeenCalledTimes(1)
  })

  it('selects cell on click in edit mode', () => {
    const onSelectionChange = vi.fn()
    const onToolModeChange = vi.fn()
    render(<OutputEditor {...baseProps} onSelectionChange={onSelectionChange} onToolModeChange={onToolModeChange} />)
    const cell = screen.getByTestId('0,0')
    fireEvent.mouseDown(cell)
    fireEvent.mouseUp(cell)
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['0,0']))
    expect(onToolModeChange).toHaveBeenCalledWith('select')
  })

  it('forwards symbol selection', () => {
    const onSymbolSelect = vi.fn()
    render(<OutputEditor {...baseProps} onSymbolSelect={onSymbolSelect} />)
    fireEvent.click(screen.getByTestId('symbol-4'))
    expect(onSymbolSelect).toHaveBeenCalledWith(4)
  })
})
