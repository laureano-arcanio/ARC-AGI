export type Locale = 'es' | 'en'

export type TranslationParams = Record<string, string | number> | undefined

const es = {
  'nav.brand': 'ARC-AGI',
  'nav.home': 'Inicio',
  'nav.health': 'Salud',
  'nav.solve': 'Resolver',

  'language.es': 'Español',
  'language.en': 'English',

  'home.title': 'ARC-AGI',
  'home.subtitle': 'Resuelve puzzles de razonamiento visual ARC-AGI infiriendo patrones a partir de ejemplos de entrada y salida.',
  'home.start': 'Iniciar tarea',

  'panel.demonstration': 'Demostración de la tarea',
  'panel.input': 'Entrada',
  'panel.output': 'Salida',
  'panel.empty': 'Carga una tarea para ver ejemplos de demostración.',

  'panel.test_input': 'Entrada de prueba',
  'panel.multi_test_warning': 'Completa esta entrada de prueba para desbloquear la siguiente.',
  'button.next_test': 'Siguiente entrada',
  'button.next_task': 'Siguiente tarea',
  'button.resize': 'Redimensionar',
  'button.copy_input': 'Copiar entrada',
  'button.reset': 'Reiniciar',
  'button.submit': '¡Enviar!',

  'label.size': 'Tamaño:',
  'label.show_numbers': 'Mostrar números',

  'tool.edit': 'Editar',
  'tool.select': 'Seleccionar',
  'tool.flood_fill': 'Rellenar',

  'symbol.aria': 'Símbolo {n}',

  'toast.no_next_test': 'No hay más entradas de prueba.',
  'toast.no_test_pair': 'No hay par de prueba para comparar.',
  'toast.correct': '¡Solución correcta!',
  'toast.wrong': 'Solución incorrecta.',
  'toast.no_cells': 'No hay celdas seleccionadas para copiar.',
  'toast.cells_copied': '¡Celdas copiadas! Selecciona una celda destino y presiona V para pegar.',
  'toast.no_data_paste': 'No hay datos para pegar.',
  'toast.select_target': 'Selecciona una celda destino en la cuadrícula de salida.',

  'error.size_format': 'El tamaño debe tener el formato "3x3", "5x7", etc.',
  'error.size_min': 'El tamaño mínimo es 1. No puede haber una cuadrícula sin celdas.',
  'error.size_max': 'El tamaño máximo es {max} por lado. Elige un tamaño más pequeño.',
}

const en: Record<string, string> = {
  'nav.brand': 'ARC-AGI',
  'nav.home': 'Home',
  'nav.health': 'Health',
  'nav.solve': 'Solve',

  'language.es': 'Español',
  'language.en': 'English',

  'home.title': 'ARC-AGI',
  'home.subtitle': 'Solve ARC-AGI visual reasoning puzzles by inferring patterns from input-output examples.',
  'home.start': 'Start task',

  'panel.demonstration': 'Task demonstration',
  'panel.input': 'Input',
  'panel.output': 'Output',
  'panel.empty': 'Load a task to see demonstration examples.',

  'panel.test_input': 'Test input',
  'panel.multi_test_warning': 'Complete this test input to unlock the next.',
  'button.next_test': 'Next test input',
  'button.next_task': 'Next task',
  'button.resize': 'Resize',
  'button.copy_input': 'Copy input',
  'button.reset': 'Reset',
  'button.submit': 'Submit!',

  'label.size': 'Size:',
  'label.show_numbers': 'Show numbers',

  'tool.edit': 'Edit',
  'tool.select': 'Select',
  'tool.flood_fill': 'Flood fill',

  'symbol.aria': 'Symbol {n}',

  'toast.no_next_test': 'No next test input.',
  'toast.no_test_pair': 'No test pair to check against.',
  'toast.correct': 'Correct solution!',
  'toast.wrong': 'Wrong solution.',
  'toast.no_cells': 'No cells selected to copy.',
  'toast.cells_copied': 'Cells copied! Select a target cell and press V to paste at location.',
  'toast.no_data_paste': 'No data to paste.',
  'toast.select_target': 'Select a target cell on the output grid.',

  'error.size_format': 'Grid size should have the format "3x3", "5x7", etc.',
  'error.size_min': 'Grid size should be at least 1. Cannot have a grid with no cells.',
  'error.size_max': 'Grid size should be at most {max} per side. Pick a smaller size.',
}

export const translations = { es, en }

export function t(locale: Locale, key: string, params?: TranslationParams): string {
  const dict = translations[locale]
  const msg = (dict as Record<string, string>)[key] ?? (translations.en as Record<string, string>)[key] ?? key
  if (!params) return msg
  return msg.replace(/\{(\w+)\}/g, (_: string, name: string) => String(params[name] ?? `{${name}}`))
}
