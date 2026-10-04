// Tree analysis shared by code-generating export targets: flattens the
// schema into fields with data paths, effective visibility (own conditions
// AND every ancestor's), default values, and payload structure.

import {
  SECTION_CONTAINERS,
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

/** Pretty JS object literal with stable key order (for generated code). */export function toJsLiteral(value: unknown, indent = 0): string {
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

// ---- tabs / steps section hosts ----

export interface SectionInfo {
  node: ElementNode
  label: string
  index: number
  /** Data paths of value fields inside this section (conditions aside). */
  paths: string[]
}

export interface SectionHostInfo {
  node: ElementNode
  kind: 'tabs' | 'steps'
  /** Identifier-safe key derived from the node id. */
  key: string
  sections: SectionInfo[]
}

export function sectionKey(node: ElementNode): string {
  return node.id.replace(/[^A-Za-z0-9]/g, '_')
}

/** Data paths of all value fields in a subtree, from `basePath`. */
export function subtreeFieldPaths(nodes: ElementNode[], basePath: string): string[] {
  const paths: string[] = []
  const walk = (children: ElementNode[], base: string): void => {
    for (const child of children) {
      const core = getCoreElement(child.type)
      if (!core) continue
      if (core.isContainer) {
        walk(child.children ?? [], child.name ? joinPath(base, child.name) : base)
      } else if (core.hasValue && child.name) {
        paths.push(joinPath(base, child.name))
      }
    }
  }
  walk(nodes, basePath)
  return paths
}

/** Every tabs/steps host in the schema, with labels and per-section paths. */
export function collectSectionHosts(schema: FormSchema): SectionHostInfo[] {
  const hosts: SectionHostInfo[] = []
  const walk = (nodes: ElementNode[], basePath: string): void => {
    for (const node of nodes) {
      const core = getCoreElement(node.type)
      if (!core?.isContainer) continue
      const childPath = node.name ? joinPath(basePath, node.name) : basePath
      const sectionType = SECTION_CONTAINERS[node.type]
      if (sectionType) {
        const sections = (node.children ?? [])
          .filter((c) => c.type === sectionType)
          .map((section, index) => ({
            node: section,
            index,
            label:
              typeof section.props['label'] === 'string' && section.props['label'] !== ''
                ? (section.props['label'] as string)
                : `${sectionType === 'tab' ? 'Tab' : 'Step'} ${index + 1}`,
            paths: subtreeFieldPaths(section.children ?? [], childPath),
          }))
        hosts.push({
          node,
          kind: node.type as 'tabs' | 'steps',
          key: sectionKey(node),
          sections,
        })
      }
      walk(node.children ?? [], childPath)
    }
  }
  walk(schema.tree, '')
  return hosts
}

/** meta.submitButton resolved to generation-ready values (text escaped). */
export interface ResolvedSubmitButton {
  text: string
  align: 'start' | 'center' | 'end'
  secondary: boolean
  fullWidth: boolean
  /** Steps hosts that must sit on their last step before submit shows. */
  gatingHosts: SectionHostInfo[]
  /** Inline style for the actions container ('' when default). */
  actionsStyle: string
  /** Inline style for the button itself ('' when default). */
  buttonStyle: string
}

export function resolveSubmitButton(
  schema: FormSchema,
  hosts: SectionHostInfo[],
): ResolvedSubmitButton {
  const cfg = schema.meta.submitButton ?? {}
  const align = cfg.align === 'center' || cfg.align === 'end' ? cfg.align : 'start'
  const fullWidth = cfg.fullWidth === true
  return {
    text: escapeHtml(typeof cfg.text === 'string' && cfg.text !== '' ? cfg.text : 'Submit'),
    align,
    secondary: cfg.variant === 'secondary',
    fullWidth,
    gatingHosts:
      cfg.onLastStepOnly === false
        ? []
        : hosts.filter((h) => h.kind === 'steps' && h.sections.length > 1),
    actionsStyle: align !== 'start' ? `text-align: ${align}` : '',
    buttonStyle: fullWidth ? 'width: 100%' : '',
  }
}
