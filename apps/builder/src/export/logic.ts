// Compiled form logic shared by the Vue-standalone and HTML targets:
// visibility functions, a validators map, and the submit-payload builder.
// Semantics mirror @formsgen/renderer (hidden fields are excluded from
// validation and payload).

import {
  getCoreElement,
  joinPath,
  type ElementNode,
  type FormSchema,
} from '@formsgen/renderer'
import { compileConditions, compileValidator, type ValueAccessor } from './compile'
import { collectExportFields, pathKey, type ExportField } from './structure'

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

/** Object literal mapping data paths to validator functions. */
export function validatorsLiteral(
  fields: ExportField[],
  accessor: ValueAccessor,
  args = '',
  visibleCall = (key: string) => `fgVisible_${key}()`,
): string {
  const entries = fields
    .filter((f) => (f.node.validation?.length ?? 0) > 0)
    .map((f) => {
      const guard =
        f.conditionChain.length > 0 ? `if (!${visibleCall(f.key)}) return null\n  ` : ''
      const body = compileValidator(f.node.validation ?? [], accessor(f.path), accessor)
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

export { collectExportFields, pathKey }
