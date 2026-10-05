// Matrix (Likert-style grid): one single-choice answer per row. The value
// maps each row's value to the chosen column's value (null = unanswered);
// "required" means every row is answered (see isEmptyValue).
// With props.multiple, each row takes several answers (checkboxes): the
// value maps each row to the chosen columns, in column order ([] = none).

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

export const matrixMultiple = (node: ElementNode): boolean => node.props['multiple'] === true

/** Every row unanswered. */
export function matrixDefault(node: ElementNode): Record<string, string | null> | Record<string, string[]> {
  const rows = matrixRows(node)
  return matrixMultiple(node)
    ? Object.fromEntries(rows.map((row) => [row.value, [] as string[]]))
    : Object.fromEntries(rows.map((row) => [row.value, null]))
}

/** A row's answers with `column` ticked or unticked, in column order. */
export function toggleMatrixCell(node: ElementNode, answers: unknown, column: string): string[] {
  const current = Array.isArray(answers) ? answers : []
  return matrixColumns(node)
    .map((c) => c.value)
    .filter((c) => (c === column) !== current.includes(c))
}
