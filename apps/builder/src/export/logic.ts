// Compiled form logic shared by the Vue-standalone and HTML targets:
// visibility functions, a validators map, and the submit-payload builder.
// Semantics mirror @formsgen/renderer (hidden fields are excluded from
// validation and payload).

import {
  DATE_RANGE_TYPE,
  FILE_TYPES,
  MESSAGES,
  fileLimits,
  fill,
  getCoreElement,
  isRepeater,
  joinPath,
  type MessageCatalog,
  type ElementNode,
  type FormSchema,
} from '@formsgen/renderer'
import { compileConditions, compileValidator, type ValueAccessor } from './compile'
import {
  collectExportFields,
  collectExportRepeaters,
  pathKey,
  type ExportField,
  type ExportRepeater,
} from './structure'

/**
 * How a target reads repeater items: `map` turns the item array into an
 * array of per-item expressions, `read` reads a template path
 * (`people.name`) from the current item inside such an expression.
 */
export interface ItemAccess {
  map: (repeaterPath: string, body: string) => string
  read: (templatePath: string, repeaterPath: string) => string
}

/** Root accessor that sends the repeater's template paths to the item. */
export function scopedAccessor(
  accessor: ValueAccessor,
  items: ItemAccess,
  repeaterPath: string,
): ValueAccessor {
  return (path) => (path.startsWith(`${repeaterPath}.`) ? items.read(path, repeaterPath) : accessor(path))
}

/**
 * `{ 'people': { 'name': function (<args>) { ... } } }` — one validator per
 * item field, guarded by the field's own (item-scoped) conditions.
 */
export function itemValidatorsLiteral(
  repeaters: ExportRepeater[],
  accessor: ValueAccessor,
  items: ItemAccess,
  /** Parameter list; gets the compiled body (to mark unused parameters). */
  args: (repeater: ExportRepeater, body: string) => string,
  messages: MessageCatalog = MESSAGES.en,
): string {
  const blocks = repeaters.map((repeater) => {
    const scoped = scopedAccessor(accessor, items, repeater.path)
    const entries = repeater.fields
      .filter((f) => needsValidator(f.node))
      .map((f) => {
        const guard = f.node.conditions?.length
          ? `if (!(${compileConditions(f.node.conditions, scoped)})) return null\n      `
          : ''
        const body = compileValidator(
          f.node.validation ?? [],
          items.read(f.templatePath, repeater.path),
          scoped,
          builtinCheckExpr(f.node, messages),
        )
        return `    '${f.name}': function (${args(repeater, guard + body)}) {\n      ${guard}${body.split('\n  ').join('\n      ')}\n    },`
      })
    return `  '${repeater.path}': {\n${entries.join('\n')}\n  },`
  })
  return `{\n${blocks.join('\n')}\n}`
}

/**
 * `function fgVisible_<key>(<args>) { ... }` for every field with
 * conditions. `args` lets targets thread a state parameter through
 * (e.g. React passes `data: FormData`).
 */
export function visibilityFunctions(
  fields: ExportField[],
  accessor: ValueAccessor,
  args = '',
): string {
  return fields
    .filter((f) => f.conditionChain.length > 0)
    .map((f) => {
      const expr = f.conditionChain
        .map((groups) => `(${compileConditions(groups, accessor)})`)
        .join(' && ')
      return `function fgVisible_${f.key}(${args}) {\n  return ${expr}\n}`
    })
    .join('\n')
}

/** `fgFileProblem(v, …)` for an upload field (null for other fields). */
export function fileCheckExpr(node: ElementNode, messages: MessageCatalog): string | undefined {
  if (!FILE_TYPES.has(node.type)) return undefined
  const limits = fileLimits(node)
  const m = {
    tooMany: fill(messages.tooManyFiles, { n: limits.maxFiles }),
    type: messages.fileType,
    size: fill(messages.fileTooLarge, { size: limits.maxSizeMb }),
  }
  return `fgFileProblem(v, ${JSON.stringify(limits.accept)}, ${limits.maxSizeMb}, ${limits.maxFiles}, ${JSON.stringify(m)})`
}

/** Built-in check after "required": upload limits, date range order. */
export function builtinCheckExpr(node: ElementNode, messages: MessageCatalog): string | undefined {
  if (node.type === DATE_RANGE_TYPE) {
    return `(fgDateOrder(v) ? ${JSON.stringify(messages.dateOrder)} : null)`
  }
  return fileCheckExpr(node, messages)
}

/** Fields that need a validator: rules, or a built-in check. */
export function needsValidator(node: ElementNode): boolean {
  return (node.validation?.length ?? 0) > 0 || FILE_TYPES.has(node.type) || node.type === DATE_RANGE_TYPE
}

/** Object literal mapping data paths to validator functions. */
export function validatorsLiteral(
  fields: ExportField[],
  accessor: ValueAccessor,
  args = '',
  visibleCall = (key: string) => `fgVisible_${key}()`,
  messages: MessageCatalog = MESSAGES.en,
): string {
  const entries = fields
    .filter((f) => needsValidator(f.node))
    .map((f) => {
      const guard =
        f.conditionChain.length > 0 ? `if (!${visibleCall(f.key)}) return null\n  ` : ''
      const body = compileValidator(
        f.node.validation ?? [],
        accessor(f.path),
        accessor,
        builtinCheckExpr(f.node, messages),
      )
      return `  '${f.path}': function (${args}) {\n  ${guard}${body}\n  },`
    })
  return `{\n${entries.join('\n')}\n}`
}

/**
 * JS object-literal expression building the submit payload from visible
 * fields only (conditional fields/containers become conditional spreads).
 */
export function payloadExpr(
  schema: FormSchema,
  accessor: ValueAccessor,
  visibleCall = (key: string) => `fgVisible_${key}()`,
  items?: ItemAccess,
): string {
  const fields = collectExportFields(schema)
  const chainByPath = new Map(fields.map((f) => [f.path, f]))

  const walkEntries = (nodes: ElementNode[], parentPath: string, indent: number): string[] => {
    const pad = '  '.repeat(indent)
    const entries: string[] = []
    for (const node of nodes) {
      const core = getCoreElement(node.type)
      if (!core) continue
      const ownCond = node.conditions?.length
        ? compileConditions(node.conditions, accessor)
        : null

      if (isRepeater(node)) {
        if (!node.name || !items) continue
        const repeaterPath = joinPath(parentPath, node.name)
        const scoped = scopedAccessor(accessor, items, repeaterPath)
        const itemEntries: string[] = []
        for (const child of node.children ?? []) {
          const childCore = getCoreElement(child.type)
          if (!childCore?.hasValue || childCore.isContainer || !child.name) continue
          const read = items.read(joinPath(repeaterPath, child.name), repeaterPath)
          itemEntries.push(
            child.conditions?.length
              ? `...(${compileConditions(child.conditions, scoped)} ? { ${JSON.stringify(child.name)}: ${read} } : {})`
              : `${JSON.stringify(child.name)}: ${read}`,
          )
        }
        const list = items.map(repeaterPath, `({ ${itemEntries.join(', ')} })`)
        entries.push(
          ownCond
            ? `${pad}...(${ownCond} ? { ${JSON.stringify(node.name)}: ${list} } : {}),`
            : `${pad}${JSON.stringify(node.name)}: ${list},`,
        )
        continue
      }

      if (core.isContainer) {
        const childPath = node.name ? joinPath(parentPath, node.name) : parentPath
        const inner = walkEntries(node.children ?? [], childPath, node.name ? indent + 1 : indent)
        if (node.name) {
          const literal = `{\n${inner.join('\n')}\n${pad}}`
          entries.push(
            ownCond
              ? `${pad}...(${ownCond} ? { ${JSON.stringify(node.name)}: ${literal} } : {}),`
              : `${pad}${JSON.stringify(node.name)}: ${literal},`,
          )
        } else if (ownCond) {
          entries.push(`${pad}...(${ownCond} ? {\n${inner.join('\n')}\n${pad}} : {}),`)
        } else {
          entries.push(...inner)
        }
      } else if (core.hasValue && node.name) {
        const path = joinPath(parentPath, node.name)
        const field = chainByPath.get(path)
        const value = accessor(path)
        if (field && field.conditionChain.length > 0) {
          entries.push(
            `${pad}...(${visibleCall(field.key)} ? { ${JSON.stringify(node.name)}: ${value} } : {}),`,
          )
        } else {
          entries.push(`${pad}${JSON.stringify(node.name)}: ${value},`)
        }
      }
    }
    return entries
  }

  const entries = walkEntries(schema.tree, '', 1)
  return `{\n${entries.join('\n')}\n}`
}

export { collectExportFields, collectExportRepeaters, pathKey }
