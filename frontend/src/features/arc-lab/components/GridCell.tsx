import { COLOR_MAP } from '../types'
import { cellKey } from '../utils'

type GridCellProps = {
  x: number
  y: number
  symbol: number
  size: number
  showNumber?: boolean
  selected?: boolean
  isGhost?: boolean
  isMovingAway?: boolean
  onClick?: (x: number, y: number) => void
  onMouseDown?: (x: number, y: number) => void
  onMouseEnter?: (x: number, y: number) => void
}

export function GridCell({
  x,
  y,
  symbol,
  size,
  showNumber = false,
  selected = false,
  isGhost = false,
  isMovingAway = false,
  onClick,
  onMouseDown,
  onMouseEnter,
}: GridCellProps) {
  const background = COLOR_MAP[symbol] ?? COLOR_MAP[0]

  const handleClick = onClick ? () => onClick(x, y) : undefined
  const handleMouseDown = onMouseDown ? () => onMouseDown(x, y) : undefined
  const handleMouseEnter = onMouseEnter ? () => onMouseEnter(x, y) : undefined

  let outlineStyle = 'none'
  let outlineOffset = '-2px'
  let opacity = 1

  if (isGhost) {
    outlineStyle = `2px solid ${background}`
    outlineOffset = '-2px'
    opacity = 0.4
  } else if (selected) {
    outlineStyle = '2px solid #f97316'
    outlineOffset = '-2px'
  }

  if (isMovingAway) {
    opacity = 0.3
  }

  return (
    <div
      data-testid={cellKey(x, y)}
      data-x={x}
      data-y={y}
      data-symbol={symbol}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      className="box-border text-center text-xs text-gray-300"
      style={{
        width: size,
        height: size,
        backgroundColor: background,
        borderLeft: '1px solid #374151',
        borderTop: '1px solid #374151',
        lineHeight: `${size}px`,
        userSelect: 'none',
        cursor: onClick || onMouseDown ? 'pointer' : 'default',
        outline: outlineStyle,
        outlineOffset: outlineOffset,
        opacity: opacity,
      }}
    >
      {showNumber ? symbol : ''}
    </div>
  )
}
