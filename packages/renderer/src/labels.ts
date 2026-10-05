// Floating labels (meta.floatingLabels): the label sits inside the control
// and floats up when the control is focused or filled. Only single-line
// controls without add-ons, a tooltip or a hidden label float.

import type { ElementNode, FormMeta } from './schema'

export const FLOATING_TYPES: ReadonlySet<string> = new Set([
  'text',
  'email',
  'password',
  'url',
  'phone',
  'search',
  'number',
  'select',
])

const has = (node: ElementNode, key: string): boolean => {
  const v = node.props[key]
  return typeof v === 'string' && v.trim() !== ''
}

/** Does this field float its label in a form with these settings? */
export function floatsLabel(node: ElementNode, meta: Pick<FormMeta, 'floatingLabels'>): boolean {
  return (
    meta.floatingLabels === true &&
    FLOATING_TYPES.has(node.type) &&
    !has(node, 'prefix') &&
    !has(node, 'suffix') &&
    !has(node, 'tooltip') &&
    node.style?.hideLabel !== true &&
    !(node.type === 'phone' && node.props['countrySelect'] === true)
  )
}
