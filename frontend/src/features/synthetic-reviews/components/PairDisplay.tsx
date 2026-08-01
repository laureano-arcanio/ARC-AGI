import { ChevronRight } from 'lucide-react'
import { GridDisplay } from '../../arc-lab/components/GridDisplay'

export function PairDisplay({
  label,
  pair,
}: {
  label: string
  pair: { input: number[][]; output: number[][] }
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold text-gray-600">{label}</p>
      <div className="flex items-start gap-2">
        <div>
          <p className="mb-0.5 text-[9px] text-gray-600">
            {pair.input.length}×{pair.input[0]?.length ?? 0}
          </p>
          <GridDisplay grid={pair.input} containerSize={180} maxCellSize={30} />
        </div>
        {pair.output.length > 0 && (
          <>
            <ChevronRight size={14} className="mt-6 text-gray-700 shrink-0" />
            <div>
              <p className="mb-0.5 text-[9px] text-gray-600">
                {pair.output.length}×{pair.output[0]?.length ?? 0}
              </p>
              <GridDisplay grid={pair.output} containerSize={180} maxCellSize={30} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
