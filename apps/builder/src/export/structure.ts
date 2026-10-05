// Tree analysis shared by code-generating export targets: flattens the
// schema into fields with data paths, effective visibility (own conditions
// AND every ancestor's), default values, and payload structure.

import {
  MATRIX_TYPE,
  SECTION_CONTAINERS,
  matrixRows,
  isRepeater,
  repeaterItemDefaults,
  repeaterLimits,
  defaultRuleMessage,
  fill,
  getCoreElement,
  joinPath,
  resolveMessages,
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

/**
 * All value-bearing fields with paths and inherited conditions. Rules
 * without a custom message get the localized default for meta.locale
 * filled in, so every code generator emits the form's language.
 */
export function collectExportFields(schema: FormSchema): ExportField[] {
  const localize = localizer(schema)
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
      if (isRepeater(node)) {
        // Item fields have per-item paths: see collectExportRepeaters.
        continue
      } else if (core.isContainer) {
        const childPath = node.name ? joinPath(parentPath, node.name) : parentPath
        walk(node.children ?? [], childPath, chain)
      } else if (core.hasValue && node.name) {
        const path = joinPath(parentPath, node.name)
        fields.push({ node: localize(node), path, key: pathKey(path), conditionChain: chain })
      }
    }
  }
  walk(schema.tree, '', [])
  return fields
}

/** Rules without a custom message get the localized default for meta.locale. */
function localizer(schema: FormSchema): (node: ElementNode) => ElementNode {
  const messages = resolveMessages(schema.meta.locale)
  return (node) =>
    node.validation?.length
      ? {
          ...node,
          validation: node.validation.map((rule) =>
            rule.message ? rule : { ...rule, message: defaultRuleMessage(rule, messages) },
          ),
        }
      : node
}

// ---- repeatable sections ----

/** One field inside a repeater item. */
export interface ExportItemField {
  node: ElementNode
  /** The field's name inside the item object. */
  name: string
  /** Template path used by conditions (`people.name`). */
  templatePath: string
  /** Identifier-safe key of the template path (`people_name`). */
  key: string
  /** Item-scoped condition groups: layout containers' inside the item, then the field's own. */
  conditions: ConditionGroups[]
}

export interface ExportRepeater {
  node: ElementNode
  /**
   * Template path of the item array, without item indexes: "people",
   * "account.people", or for an inner repeater "travellers.bags".
   */
  path: string
  /** Identifier-safe key, e.g. "account_people" / "travellers_bags". */
  key: string
  /** 1 for a top-level repeater, 2 for one inside another's item. */
  depth: number
  /** The outer repeater's template path (depth 2), else null. */
  parent: string | null
  /** Root-scoped condition groups (for an inner repeater: its outer repeater's). */
  conditionChain: ConditionGroups[]
  /** Depth 2: conditions between the outer item and this repeater (outer-item scoped). */
  itemConditionChain: ConditionGroups[]
  fields: ExportItemField[]
  /** Static (valueless) children are rendered but carry no data. */
  limits: { min: number; max: number; initial: number }
  itemDefaults: Record<string, unknown>
  /** Item label template with {n} (localized fallback applied). */
  itemLabel: string
  addText: string
}

/** The placeholder for an item index in rendered paths/ids, per depth. */
export const ITEM_TOKENS = ['__i__', '__j__'] as const

/** A repeater as seen from markup/runtime code: template path, depth, outer repeater. */
export interface RepeaterRef {
  path: string
  depth: number
  parent: string | null
}

/** A repeater path that may carry index tokens (`travellers.__i__.bags`) → its ref. */
export function repeaterRef(path: string): RepeaterRef {
  const segments = path.split('.').filter((s) => !(ITEM_TOKENS as readonly string[]).includes(s) && !/^\d+$/.test(s))
  const depth = path.split('.').filter((s) => (ITEM_TOKENS as readonly string[]).includes(s) || /^\d+$/.test(s)).length + 1
  return {
    path: segments.join('.'),
    depth,
    parent: depth > 1 ? segments.slice(0, -1).join('.') : null,
  }
}

/**
 * Every repeater in the schema with its item fields (rules localized),
 * outer repeaters before their inner ones. Item fields are found through
 * layout containers; an inner repeater's fields belong to it alone.
 */
export function collectExportRepeaters(schema: FormSchema): ExportRepeater[] {
  const localize = localizer(schema)
  const messages = resolveMessages(schema.meta.locale)
  const repeaters: ExportRepeater[] = []
  const addRepeater = (
    node: ElementNode,
    path: string,
    outer: ExportRepeater | null,
    chain: ConditionGroups[],
    itemChain: ConditionGroups[],
  ): void => {
    const fields: ExportItemField[] = []
    const inner: Array<{ node: ElementNode; chain: ConditionGroups[] }> = []
    const collect = (nodes: ElementNode[], conditions: ConditionGroups[]): void => {
      for (const child of nodes) {
        const childCore = getCoreElement(child.type)
        if (!childCore) continue
        const own = child.conditions?.length ? [...conditions, child.conditions] : conditions
        if (isRepeater(child)) {
          if (child.name) inner.push({ node: child, chain: own })
        } else if (childCore.isContainer) {
          collect(child.children ?? [], own)
        } else if (childCore.hasValue && child.name) {
          const templatePath = joinPath(path, child.name)
          fields.push({ node: localize(child), name: child.name, templatePath, key: pathKey(templatePath), conditions: own })
        }
      }
    }
    collect(node.children ?? [], [])
    const addText = node.props['addText']
    const repeater: ExportRepeater = {
      node,
      path,
      key: pathKey(path),
      depth: outer ? 2 : 1,
      parent: outer?.path ?? null,
      conditionChain: chain,
      itemConditionChain: itemChain,
      fields,
      limits: repeaterLimits(node),
      itemDefaults: repeaterItemDefaults(node),
      itemLabel:
        typeof node.props['itemLabel'] === 'string' && node.props['itemLabel'] !== ''
          ? (node.props['itemLabel'] as string)
          : messages.item,
      addText: typeof addText === 'string' && addText !== '' ? addText : messages.addItem,
    }
    repeaters.push(repeater)
    for (const child of inner) {
      addRepeater(child.node, joinPath(path, child.node.name!), repeater, chain, child.chain)
    }
  }
  const walk = (nodes: ElementNode[], parentPath: string, inherited: ConditionGroups[]): void => {
    for (const node of nodes) {
      const chain = node.conditions?.length ? [...inherited, node.conditions] : inherited
      const core = getCoreElement(node.type)
      if (!core) continue
      if (isRepeater(node)) {
        if (node.name) addRepeater(node, joinPath(parentPath, node.name), null, chain, [])
      } else if (core.isContainer) {
        walk(node.children ?? [], node.name ? joinPath(parentPath, node.name) : parentPath, chain)
      }
    }
  }
  walk(schema.tree, '', [])
  return repeaters
}

/**
 * Top-level fields plus every repeater item field, the latter with its
 * template path (`crew.cv`) as `path`. Targets key per-field helper tables
 * by template path; at run time an item path (`crew.2.cv`) maps back to it
 * by dropping the index (fgTpl).
 */
export function collectTemplateFields(schema: FormSchema): ExportField[] {
  return [
    ...collectExportFields(schema),
    ...collectExportRepeaters(schema).flatMap((r) =>
      r.fields.map((f) => ({ node: f.node, path: f.templatePath, key: f.key, conditionChain: r.conditionChain })),
    ),
  ]
}

/** JS: an item path without its indexes (`crew.2.cv` → `crew.cv`). */
export function tplHelper(ts: boolean): string {
  return `function fgTpl(path${ts ? ': string' : ''})${ts ? ': string' : ''} {
  return path.replace(/\\.\\d+(?=\\.|$)/g, '')
}`
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
  // Inner repeaters live inside their outer items' defaults.
  for (const repeater of collectExportRepeaters(schema).filter((r) => r.depth === 1)) {
    const segments = repeater.path.split('.')
    let target = out
    for (const segment of segments.slice(0, -1)) {
      target = (target[segment] ??= {}) as Record<string, unknown>
    }
    target[segments[segments.length - 1] as string] = Array.from({ length: repeater.limits.initial }, () =>
      structuredClone(repeater.itemDefaults),
    )
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
  /** Repeaters inside this section: their item fields count too. */
  repeaters: string[]
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
      if (isRepeater(child)) continue
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

/** Data paths of the repeaters in a subtree (their item fields are dynamic). */
export function subtreeRepeaterPaths(nodes: ElementNode[], basePath: string): string[] {
  const paths: string[] = []
  const walk = (children: ElementNode[], base: string): void => {
    for (const child of children) {
      if (isRepeater(child)) {
        if (child.name) paths.push(joinPath(base, child.name))
      } else if (getCoreElement(child.type)?.isContainer) {
        walk(child.children ?? [], child.name ? joinPath(base, child.name) : base)
      }
    }
  }
  walk(nodes, basePath)
  return paths
}

/** Every tabs/steps host in the schema, with labels and per-section paths. */
export function collectSectionHosts(schema: FormSchema): SectionHostInfo[] {
  const messages = resolveMessages(schema.meta.locale)
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
                : fill(sectionType === 'tab' ? messages.tab : messages.step, { n: index + 1 }),
            paths: subtreeFieldPaths(section.children ?? [], childPath),
            repeaters: subtreeRepeaterPaths(section.children ?? [], childPath),
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
    text: escapeHtml(
      typeof cfg.text === 'string' && cfg.text !== ''
        ? cfg.text
        : resolveMessages(schema.meta.locale).submit,
    ),
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

/** True when the form contains a reset button (targets then emit fgReset). */
export function hasResetButton(schema: FormSchema): boolean {
  let found = false
  const walk = (nodes: ElementNode[]): void => {
    for (const node of nodes) {
      if (node.type === 'button' && node.props['action'] !== 'link') found = true
      walk(node.children ?? [])
    }
  }
  walk(schema.tree)
  return found
}

/** TS type for one field's value, by element type. */
const FIELD_TS_TYPES: Record<string, string> = {
  number: 'number | null',
  select: 'string | null',
  radiogroup: 'string | null',
  checkbox: 'boolean',
  toggle: 'boolean',
  checkboxgroup: 'string[]',
  multiselect: 'string[]',
  tags: 'string[]',
  range: 'number',
  file: 'File[]',
  imageupload: 'File[]',
  rangeslider: '{ from: number; to: number }',
  daterange: '{ from: string; to: string }',
  dates: 'string[]',
}

/** TS type of one field's value (a matrix lists its rows). */
function fieldTsType(node: ElementNode): string {
  if (node.type === MATRIX_TYPE) {
    const rows = matrixRows(node).map((r) => `${/^[A-Za-z_$][\w$]*$/.test(r.value) ? r.value : JSON.stringify(r.value)}: string | null`)
    return rows.length ? `{ ${rows.join('; ')} }` : 'Record<string, string | null>'
  }
  return FIELD_TS_TYPES[node.type] ?? 'string'
}

/** TS type literal for the form data shape, derived from the SCHEMA (Vue, React). */
export function formDataType(schema: FormSchema): string {
  interface TypeTree {
    [key: string]: string | TypeTree
  }
  const root: TypeTree = {}
  for (const field of collectExportFields(schema)) {
    const segments = field.path.split('.')
    let target = root
    for (const segment of segments.slice(0, -1)) {
      target = (target[segment] ??= {}) as TypeTree
    }
    target[segments[segments.length - 1] as string] =
      fieldTsType(field.node)
  }
  const repeaterTypes = new Map<string, TypeTree>()
  // Outer repeaters come first, so an inner one finds its outer item type.
  for (const repeater of collectExportRepeaters(schema)) {
    const item: TypeTree = {}
    for (const field of repeater.fields) item[field.name] = fieldTsType(field.node)
    const marker = `__repeater_${repeater.key}`
    repeaterTypes.set(marker, item)
    const name = repeater.path.split('.').pop()!
    if (repeater.parent !== null) {
      repeaterTypes.get(`__repeater_${pathKey(repeater.parent)}`)![name] = marker
      continue
    }
    const segments = repeater.path.split('.')
    let target = root
    for (const segment of segments.slice(0, -1)) {
      target = (target[segment] ??= {}) as TypeTree
    }
    target[name] = marker
  }
  const render = (tree: TypeTree, indent: number): string => {
    const pad = '  '.repeat(indent)
    const padIn = '  '.repeat(indent + 1)
    const body = Object.entries(tree)
      .map(
        ([k, v]) =>
          `${padIn}${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${
            typeof v !== 'string' ? render(v, indent + 1) : repeaterTypes.has(v) ? `Array<${render(repeaterTypes.get(v)!, indent + 1)}>` : v
          }`,
      )
      .join('\n')
    return `{\n${body}\n${pad}}`
  }
  return render(root, 0)
}
