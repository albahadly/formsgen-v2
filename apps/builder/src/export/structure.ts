// Tree analysis shared by code-generating export targets: flattens the
// schema into fields with data paths, effective visibility (own conditions
// AND every ancestor's), default values, and payload structure.

import {
  getCoreElement,
  joinPath,
  type ConditionGroups,
  type ElementNode,
  type FormSchema,
} from '@formsgen/renderer'

export interface ExportField {
  node: ElementNode
  /** Data path, e.g. "account.username". */
  path: string
  /** Stable identifier-safe key, e.g. "account_username". */
  key: string
  /** Own + inherited condition groups (every entry must pass). */
  conditionChain: ConditionGroups[]
}

export function pathKey(path: string): string {
  return path.replace(/\./g, '_')
}

/** All value-bearing fields with paths and inherited conditions. */
export function collectExportFields(schema: FormSchema): ExportField[] {
  const fields: ExportField[] = []
  const walk = (
    nodes: ElementNode[],
    parentPath: string,
    inherited: ConditionGroups[],
  ): void => {
    for (const node of nodes) {
      const chain = node.conditions?.length ? [...inherited, node.conditions] : inherited
      const core = getCoreElement(node.type)
      if (!core) continue
      if (core.isContainer) {
        const childPath = node.name ? joinPath(parentPath, node.name) : parentPath
        walk(node.children ?? [], childPath, chain)
      } else if (core.hasValue && node.name) {
        const path = joinPath(parentPath, node.name)
        fields.push({ node, path, key: pathKey(path), conditionChain: chain })
      }
    }
  }
  walk(schema.tree, '', [])
  return fields
}

/** Default value for one field node (mirrors renderer semantics). */
export function fieldDefault(node: ElementNode): unknown {
  if (node.props['default'] !== undefined) return node.props['default']
  return getCoreElement(node.type)?.defaultValue(node)
}

/** Nested defaults object (JSON-serializable) for the whole form. */
export function defaultsObject(schema: FormSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of collectExportFields(schema)) {
    const segments = field.path.split('.')
    let target = out
    for (const segment of segments.slice(0, -1)) {
      target = (target[segment] ??= {}) as Record<string, unknown>
    }
    target[segments[segments.length - 1] as string] = fieldDefault(field.node) ?? null
  }
  return out
}

export interface SelectItem {
  value: string
  label: string
}

export function selectItems(node: ElementNode): SelectItem[] {
  const raw = node.props['items']
  return Array.isArray(raw) ? (raw as SelectItem[]) : []
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function isRequired(node: ElementNode): boolean {
  return node.validation?.some((r) => r.rule === 'required') ?? false
}

/** Pretty JS object literal with stable key order (for generated code). */
export function toJsLiteral(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent)
  const padIn = '  '.repeat(indent + 1)
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return `[${value.map((v) => toJsLiteral(v, indent)).join(', ')}]`
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    const body = entries
      .map(([k, v]) => `${padIn}${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${toJsLiteral(v, indent + 1)}`)
      .join(',\n')
    return `{\n${body}\n${pad}}`
  }
  return JSON.stringify(value)
}
