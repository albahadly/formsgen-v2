// Matrix (Likert-style grid): one single-choice answer per row. The value
// maps each row's value to the chosen column's value (null = unanswered);
// "required" means every row is answered (see isEmptyValue).

import type { ElementNode } from './schema'

export const MATRIX_TYPE = 'matrix'

export interface MatrixOption {
  value: string
  label: string
}

function options(raw: unknown): MatrixOption[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  return raw
    .filter((o): o is { value: unknown; label?: unknown } => typeof o === 'object' && o !== null && 'value' in o)
    .map((o) => ({ value: String(o.value), label: typeof o.label === 'string' ? o.label : String(o.value) }))
    .filter((o) => o.value !== '' && !seen.has(o.value) && Boolean(seen.add(o.value)))
}

export const matrixRows = (node: ElementNode): MatrixOption[] => options(node.props['rows'])
export const matrixColumns = (node: ElementNode): MatrixOption[] => options(node.props['columns'])

/** Every row unanswered. */
export function matrixDefault(node: ElementNode): Record<string, string | null> {
  return Object.fromEntries(matrixRows(node).map((row) => [row.value, null]))
}
