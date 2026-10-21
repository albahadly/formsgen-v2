// Compiled form logic shared by the Vue-standalone and HTML targets:
// visibility functions, a validators map, and the submit-payload builder.
// Semantics mirror @albahadly/formsgen-renderer (hidden fields are excluded from
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
  type ConditionGroups,
  type MessageCatalog,
  type ElementNode,
  type FormSchema,
  tooManyFilesText,
} from '@albahadly/formsgen-renderer'
import { compileConditions, compileValidator, type ValueAccessor } from './compile'
import {
  collectExportFields,
  collectExportRepeaters,
  pathKey,
  type ExportField,
  type ExportRepeater,
  type RepeaterRef,
} from './structure'

/**
 * How a target reads repeater items: `map` turns the item array into an
 * array of per-item expressions, `read` reads a template path
 * (`people.name`) from the current item inside such an expression.
 */
export interface ItemAccess {
  /** Maps the repeater's items (an inner repeater: within the outer item) to `body`. */
  map: (repeater: RepeaterRef, body: string) => string
  /** Reads an item field by template path (`people.name`) inside `map`'s body. */
  read: (templatePath: string, repeater: RepeaterRef) => string
}

/** Root accessor that sends the repeater's template paths to the item. */
export function scopedAccessor(accessor: ValueAccessor, items: ItemAccess, repeater: RepeaterRef): ValueAccessor {
  return (path) => (path.startsWith(`${repeater.path}.`) ? items.read(path, repeater) : accessor(path))
}

/** Every group of a chain must pass (`true` for none). */
function chainExpr(chain: ConditionGroups[], accessor: ValueAccessor): string {
  return chain.length === 1
    ? compileConditions(chain[0]!, accessor)
    : chain.map((groups) => `(${compileConditions(groups, accessor)})`).join(' && ')
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
    const scoped = scopedAccessor(accessor, items, repeater)
    const entries = repeater.fields
      .filter((f) => needsValidator(f.node))
      .map((f) => {
        const guard = f.conditions.length ? `if (!(${chainExpr(f.conditions, scoped)})) return null\n      ` : ''
        const body = compileValidator(
          f.node.validation ?? [],
          items.read(f.templatePath, repeater),
          scoped,
          builtinCheckExpr(f.node, messages),
          ruleSubject(f.node),
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

/** What size and format rules judge: a rich-text answer's visible text, else the value. */
const ruleSubject = (node: ElementNode): string | undefined => (node.type === 'richtext' ? 'fgRichPlain(v)' : undefined)

/** `fgFileProblem(v, …)` for an upload field (null for other fields). */
export function fileCheckExpr(node: ElementNode, messages: MessageCatalog): string | undefined {
  if (!FILE_TYPES.has(node.type)) return undefined
  const limits = fileLimits(node)
  const m = {
    tooMany: tooManyFilesText(messages, limits.maxFiles),
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
        ruleSubject(f.node),
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
        const list = itemList(node, { path: joinPath(parentPath, node.name), depth: 1, parent: null })
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

  /**
   * One repeater's items as an array expression: each item an object of its
   * visible fields (through layout containers) and inner repeaters' lists.
   */
  function itemList(node: ElementNode, repeater: RepeaterRef): string {
    const scoped = scopedAccessor(accessor, items!, repeater)
    const itemEntries = (nodes: ElementNode[]): string[] => {
      const out: string[] = []
      for (const child of nodes) {
        const childCore = getCoreElement(child.type)
        if (!childCore) continue
        const cond = child.conditions?.length ? compileConditions(child.conditions, scoped) : null
        const conditional = (entry: string): string => (cond ? `...(${cond} ? { ${entry} } : {})` : entry)
        if (isRepeater(child)) {
          if (!child.name) continue
          const inner = itemList(child, { path: joinPath(repeater.path, child.name), depth: repeater.depth + 1, parent: repeater.path })
          out.push(conditional(`${JSON.stringify(child.name)}: ${inner}`))
        } else if (childCore.isContainer) {
          const inner = itemEntries(child.children ?? [])
          if (inner.length) out.push(cond ? `...(${cond} ? { ${inner.join(', ')} } : {})` : inner.join(', '))
        } else if (childCore.hasValue && child.name) {
          out.push(conditional(`${JSON.stringify(child.name)}: ${items!.read(joinPath(repeater.path, child.name), repeater)}`))
        }
      }
      return out
    }
    return items!.map(repeater, `({ ${itemEntries(node.children ?? []).join(', ')} })`)
  }

  const entries = walkEntries(schema.tree, '', 1)
  return `{\n${entries.join('\n')}\n}`
}

export { collectExportFields, collectExportRepeaters, pathKey }
