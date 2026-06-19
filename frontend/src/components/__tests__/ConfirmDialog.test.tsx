import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmDialog } from '../common/ConfirmDialog'

const props = {
  title: 'Delete item',
  message: 'Are you sure?',
  confirmLabel: 'Delete',
  cancelLabel: 'Cancel',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
}

describe('ConfirmDialog', () => {
  it('renders nothing when open is false', () => {
    render(<ConfirmDialog {...props} open={false} />)
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
  })

  it('renders title and message when open', () => {
    render(<ConfirmDialog {...props} open />)
    expect(screen.getByTestId('confirm-dialog-title')).toHaveTextContent('Delete item')
    expect(screen.getByTestId('confirm-dialog-message')).toHaveTextContent('Are you sure?')
  })

  it('renders confirm and cancel buttons with provided labels', () => {
    render(<ConfirmDialog {...props} open />)
    expect(screen.getByTestId('confirm-dialog-confirm')).toHaveTextContent('Delete')
    expect(screen.getByTestId('confirm-dialog-cancel')).toHaveTextContent('Cancel')
  })

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...props} open onConfirm={onConfirm} />)
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...props} open onCancel={onCancel} />)
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when the backdrop is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...props} open onCancel={onCancel} />)
    fireEvent.click(screen.getByTestId('confirm-dialog-backdrop'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel on Escape key', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...props} open onCancel={onCancel} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('exposes the danger variant on the root', () => {
    render(<ConfirmDialog {...props} open variant="danger" />)
    expect(screen.getByTestId('confirm-dialog')).toHaveAttribute('data-variant', 'danger')
  })

  it('defaults to the default variant', () => {
    render(<ConfirmDialog {...props} open />)
    expect(screen.getByTestId('confirm-dialog')).toHaveAttribute('data-variant', 'default')
  })
})
