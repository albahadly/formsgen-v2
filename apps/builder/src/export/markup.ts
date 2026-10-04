// Shared markup walker for the Vue-standalone and HTML targets: renders
// the tree structure (grids, cells, groups, columns, conditional wrappers)
// via the CSS adapter and delegates leaf fields to the registry emitters.

import {
  getCoreElement,
  joinPath,
  type ElementNode,
  type FormSchema,
} from '@formsgen/renderer'
import { getElement } from '@/registry'
import type { EmitterLang } from '@/registry/types'
import { compileConditions } from './compile'
import type { CssFrameworkAdapter } from './css'
import { esc } from '@/registry/emitters/shared'
import { isRequired, pathKey } from './structure'

export interface MarkupOptions {
  lang: EmitterLang
  css: CssFrameworkAdapter
  /** Expression reading a field value (for condition expressions). */
  accessor: (path: string) => string
  /**
   * Wraps a conditional block. vue: returns a v-if attribute string; html:
   * registers the expression and returns a wrapper id (see targets).
   */
  conditionAttr: (node: ElementNode, expr: string) => string
  /**
   * Alternative to conditionAttr for languages where conditions wrap the
   * block instead (React `{expr && (...)}`, Blazor `@if (...) { ... }`).
   */
  wrapConditional?: ((expr: string, block: string) => string) | undefined
  /** Attribute name for classes ('class' default; React: 'className'). */
  classAttr?: 'class' | 'className' | undefined
  /** Comment syntax (HTML default; React: JSX comment). */
  comment?: ((text: string) => string) | undefined
  /**
   * Condition compiler override for non-JS languages (Blazor compiles
   * conditions to C#). Defaults to the shared JS compiler.
   */
  conditionExpr?: ((groups: NonNullable<ElementNode['conditions']>) => string) | undefined
}

function indentBlock(text: string, depth: number): string {
  const pad = '  '.repeat(depth)
  return text
    .split('\n')
    .map((line) => (line === '' ? line : pad + line))
    .join('\n')
}

export function renderTree(schema: FormSchema, options: MarkupOptions): string {
  const { css } = options
  const classAttr = options.classAttr ?? 'class'
  const comment = options.comment ?? ((text: string) => `<!-- ${text} -->`)

  const renderNodes = (nodes: ElementNode[], parentPath: string, defaultSpan: number): string =>
    nodes
      .map((node) => renderNode(node, parentPath, defaultSpan))
      .filter(Boolean)
      .join('\n')

  const renderNode = (node: ElementNode, parentPath: string, defaultSpan: number): string => {
    const core = getCoreElement(node.type)
    const def = getElement(node.type)
    if (!core || !def) return comment(`unsupported element type: ${esc(node.type)}`)

    const span = node.layout?.colSpan ?? defaultSpan
    const cell = css.cell(span)
    const condExpr = node.conditions?.length
      ? (options.conditionExpr ?? ((groups) => compileConditions(groups, options.accessor)))(
          node.conditions,
        )
      : null
    const condAttr =
      condExpr && !options.wrapConditional ? options.conditionAttr(node, condExpr) : ''
    const styleAttr = cell.style
      ? classAttr === 'className'
        ? ` style={{ gridColumn: '${cell.style.replace('grid-column: ', '')}' }}`
        : ` style="${cell.style}"`
      : ''
    const open = `<div ${classAttr}="${cell.class}"${styleAttr}${condAttr}>`

    let inner: string
    if (core.isContainer) {
      const childPath = node.name ? joinPath(parentPath, node.name) : parentPath
      if (node.type === 'columns') {
        const count = Number(node.props['count'] ?? 2)
        const childSpan = Math.max(1, Math.round(12 / count))
        inner = `<div ${classAttr}="${css.classes('grid')}">\n${indentBlock(renderNodes(node.children ?? [], childPath, childSpan), 1)}\n</div>`
      } else {
        const label = node.props['label']
        const legend =
          typeof label === 'string' && label !== ''
            ? `<legend ${classAttr}="${css.classes('groupLabel')}">${esc(label)}</legend>\n  `
            : ''
        inner = `<fieldset ${classAttr}="${css.classes('group')}">\n  ${legend}<div ${classAttr}="${css.classes('grid')}">\n${indentBlock(renderNodes(node.children ?? [], childPath, 12), 2)}\n  </div>\n</fieldset>`
      }
    } else {
      const emitter = def.export?.[options.lang]
      if (!emitter) {
        inner = comment(`element type "${esc(node.type)}" has no ${options.lang} emitter yet`)
      } else {
        const path = node.name ? joinPath(parentPath, node.name) : ''
        const key = pathKey(path)
        inner = emitter(node, {
          css,
          path,
          key,
          id: `fg_${key}`,
          required: isRequired(node),
        })
      }
    }

    const block = `${open}\n${indentBlock(inner, 1)}\n</div>`
    return condExpr && options.wrapConditional
      ? options.wrapConditional(condExpr, block)
      : block
  }

  return renderNodes(schema.tree, '', 12)
}
