import { COLOR_MAP } from '../../../shared/types/arc-graph'

type MaskPreviewProps = {
  mask: (number | '#')[][]
  size?: number
}

export function MaskPreview({ mask, size = 8 }: MaskPreviewProps) {
  if (!mask.length || !mask[0]?.length) return null

  return (
    <div className="inline-block rounded border border-gray-700 overflow-hidden">
      {mask.map((row, ri) => (
        <div key={ri} className="flex">
          {row.map((cell, ci) => {
            const isMasked = cell === '#'
            const bg = isMasked
              ? '#1f2937'
              : (COLOR_MAP[cell as number] ?? '#555')
            return (
              <div
                key={ci}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: bg,
                }}
                className={isMasked ? 'flex items-center justify-center' : ''}
              >
                {isMasked && (
                  <span style={{ fontSize: `${Math.max(4, size - 2)}px`, color: '#6b7280', lineHeight: 1 }}>
                    #
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
