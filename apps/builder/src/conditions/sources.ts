// Authoring metadata for visibility conditions: which fields an element's
// conditions may test, which operators fit each field type, and what kind
// of value each operator compares against. The renderer compares with ===,
// so values must be stored with the source field's runtime type (boolean
// for a checkbox, number for number/range, the option's string value…).

import {
  BOOLEAN_TYPES,
  FILE_TYPES,
  findParent,
  getCoreElement,
  isRepeater,
  joinPath,
  type Condition,
  type ConditionOperator,
  type ElementNode,
} from '@formsgen/renderer'

export interface ConditionOption {
  value: string
  label: string
}

export interface ConditionSource {
  /** Root-relative data path, as stored in Condition.field. */
  path: string
  label: string
  type: string
  options: ConditionOption[]
}

export type ConditionValueKind = 'none' | 'text' | 'number' | 'boolean' | 'option'

const TEXT_OPS: ConditionOperator[] = ['equals', 'not-equals', 'contains', 'empty', 'not-empty']
const NUMBER_OPS: ConditionOperator[] = [
  'equals',
  'not-equals',
  'greater-than',
  'less-than',
  'empty',
  'not-empty',
]
const OPTION_OPS: ConditionOperator[] = ['equals', 'not-equals', 'empty', 'not-empty']
const LIST_OPS: ConditionOperator[] = ['contains', 'empty', 'not-empty']
const PRESENCE_OPS: ConditionOperator[] = ['not-empty', 'empty']

const NUMBER_TYPES = new Set(['number', 'range'])
const OPTION_TYPES = new Set(['select', 'radiogroup'])
const LIST_TYPES = new Set(['multiselect', 'checkboxgroup', 'tags'])

function optionsOf(node: ElementNode): ConditionOption[] {
  const items = node.props['items']
  if (!Array.isArray(items)) return []
  return items
    .filter((i): i is { value: unknown; label?: unknown } => typeof i === 'object' && i !== null)
    .map((i) => ({ value: String(i.value), label: typeof i.label === 'string' ? i.label : String(i.value) }))
}

/**
 * Value fields a node's conditions may reference, in tree order. The node
 * itself and its descendants are excluded: a container hidden by its own
 * child's value could never be shown again.
 */
export function listConditionSources(tree: ElementNode[], excludeId: string): ConditionSource[] {
  const sources: ConditionSource[] = []
  // Fields inside a repeater exist once per item: only fields of the SAME
  // repeater (resolved to the same item at runtime) may reference them.
  const parent = findParent(tree, excludeId)
  const ownRepeater = parent && isRepeater(parent) ? parent : null
  let prefix = ''
  const walk = (nodes: ElementNode[], base: string): void => {
    for (const node of nodes) {
      if (node.id === excludeId) continue
      const core = getCoreElement(node.type)
      if (!core) continue
      if (isRepeater(node)) {
        if (node.id === ownRepeater?.id && node.name) {
          const label = node.props['label']
          prefix = `${typeof label === 'string' && label !== '' ? label : node.name} › `
          walk(node.children ?? [], joinPath(base, node.name))
          prefix = ''
        }
      } else if (core.isContainer) {
        walk(node.children ?? [], node.name ? joinPath(base, node.name) : base)
      } else if (core.hasValue && node.name) {
        const label = node.props['label']
        sources.push({
          path: joinPath(base, node.name),
          label: prefix + (typeof label === 'string' && label !== '' ? label : node.name),
          type: node.type,
          options: optionsOf(node),
        })
      }
    }
  }
  walk(tree, '')
  return sources
}

export function operatorsFor(type: string): ConditionOperator[] {
  if (BOOLEAN_TYPES.has(type)) return ['equals']
  if (NUMBER_TYPES.has(type)) return NUMBER_OPS
  if (OPTION_TYPES.has(type)) return OPTION_OPS
  if (LIST_TYPES.has(type)) return LIST_OPS
  // Uploads: only "a file was chosen" / "no file" make sense.
  if (FILE_TYPES.has(type)) return PRESENCE_OPS
  return TEXT_OPS
}

export function valueKindFor(source: ConditionSource, operator: ConditionOperator): ConditionValueKind {
  if (operator === 'empty' || operator === 'not-empty') return 'none'
  if (BOOLEAN_TYPES.has(source.type)) return 'boolean'
  if (operator === 'greater-than' || operator === 'less-than' || NUMBER_TYPES.has(source.type)) {
    return 'number'
  }
  if (source.options.length > 0 && (OPTION_TYPES.has(source.type) || LIST_TYPES.has(source.type))) {
    return 'option'
  }
  return 'text'
}

export function defaultValueFor(source: ConditionSource, operator: ConditionOperator): unknown {
  switch (valueKindFor(source, operator)) {
    case 'none':
      return undefined
    case 'boolean':
      return true
    case 'number':
      return 0
    case 'option':
      return source.options[0]?.value ?? ''
    case 'text':
      return ''
  }
}

/** A fresh condition testing `source` with its first sensible operator. */
export function newCondition(source: ConditionSource): Condition {
  const operator = operatorsFor(source.type)[0] ?? 'equals'
  return withValue({ field: source.path, operator }, defaultValueFor(source, operator))
}

/** Sets or drops `value` (operators without a value must not store one). */
export function withValue(condition: Condition, value: unknown): Condition {
  const next: Condition = { field: condition.field, operator: condition.operator }
  if (value !== undefined) next.value = value
  return next
}
