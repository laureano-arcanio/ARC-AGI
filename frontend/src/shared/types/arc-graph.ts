export type GridData = number[][]

export type CognitiveIntent =
  | 'hypothesis'
  | 'failure_analysis'
  | 'branch_pivot'
  | 'correct_analysis'

export type MechanicalAction =
  | 'cell_paint'
  | 'fill_selected'
  | 'paste'
  | 'resize'
  | 'copy_from_input'
  | 'reset_output'
  | 'submit'
  | 'abandon'
  | 'load_task'

export type GraphTrigger =
  | { kind: 'mechanical'; action: MechanicalAction; details?: Record<string, unknown> }
  | { kind: 'cognitive'; intent: CognitiveIntent; text: string }

export type GraphNode = {
  id: string
  trigger: GraphTrigger
  stateSnapshot: GridData
  parentId: string | null
  timestamp: number
}

export const COLOR_MAP: Record<number, string> = {
  0: '#000000',
  1: '#0074D9',
  2: '#FF4136',
  3: '#2ECC40',
  4: '#FFDC00',
  5: '#AAAAAA',
  6: '#F012BE',
  7: '#FF851B',
  8: '#7FDBFF',
  9: '#870C25',
}
