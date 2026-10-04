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
  /** JS expression reading a field value (for condition expressions). */
  accessor: (path: string) => string
  /**
   * Wraps a conditional block. vue: returns a v-if attribute string; html:
   * registers the expression and returns a wrapper id (see targets).
   */
  conditionAttr: (node: ElementNode, expr: string) => string
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

  const renderNodes = (nodes: ElementNode[], parentPath: string, defaultSpan: number): string =>
    nodes
      .map((node) => renderNode(node, parentPath, defaultSpan))
      .filter(Boolean)
      .join('\n')

  const renderNode = (node: ElementNode, parentPath: string, defaultSpan: number): string => {
    const core = getCoreElement(node.type)
    const def = getElement(node.type)
    if (!core || !def) return `<!-- unsupported element type: ${esc(node.type)} -->`

    const span = node.layout?.colSpan ?? defaultSpan
    const cell = css.cell(span)
    const condAttr = node.conditions?.length
      ? options.conditionAttr(node, compileConditions(node.conditions, options.accessor))
      : ''
    const open = `<div class="${cell.class}"${cell.style ? ` style="${cell.style}"` : ''}${condAttr}>`

    let inner: string
    if (core.isContainer) {
      const childPath = node.name ? joinPath(parentPath, node.name) : parentPath
      if (node.type === 'columns') {
        const count = Number(node.props['count'] ?? 2)
        const childSpan = Math.max(1, Math.round(12 / count))
        inner = `<div class="${css.classes('grid')}">\n${indentBlock(renderNodes(node.children ?? [], childPath, childSpan), 1)}\n</div>`
      } else {
        const label = node.props['label']
        const legend =
          typeof label === 'string' && label !== ''
            ? `<legend class="${css.classes('groupLabel')}">${esc(label)}</legend>\n  `
            : ''
        inner = `<fieldset class="${css.classes('group')}">\n  ${legend}<div class="${css.classes('grid')}">\n${indentBlock(renderNodes(node.children ?? [], childPath, 12), 2)}\n  </div>\n</fieldset>`
      }
    } else {
      const emitter = def.export?.[options.lang]
      if (!emitter) {
        inner = `<!-- element type "${esc(node.type)}" has no ${options.lang} emitter yet -->`
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

    return `${open}\n${indentBlock(inner, 1)}\n</div>`
  }

  return renderNodes(schema.tree, '', 12)
}
