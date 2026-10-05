// Shared markup walker for the Vue-standalone and HTML targets: renders
// the tree structure (grids, cells, groups, columns, conditional wrappers)
// via the CSS adapter and delegates leaf fields to the registry emitters.

import {
  SECTION_CONTAINERS,
  fill,
  isRepeater,
  repeaterLimits,
  floatsLabel,
  getCoreElement,
  joinPath,
  resolveMessages,
  type ElementNode,
  type ControlSize,
  type ElementStyle,
  type FormSchema,
  type MessageCatalog,
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
  /**
   * Renders a tabs/steps host from its pre-rendered section panels; each
   * target wires its own active-section state. Without it, sections render
   * sequentially as labeled fieldsets.
   */
  renderSections?: ((host: RenderedSectionHost) => string) | undefined
  /**
   * Renders a repeater from its item template (children rendered once with
   * ITEM_TOKEN in place of the item index in paths and ids). Targets
   * without it emit an "unsupported" comment.
   */
  renderRepeater?: ((repeater: RenderedRepeater) => string) | undefined
  /**
   * Option overrides for markup inside a repeater item — e.g. an accessor
   * (or C# condition compiler) that reads sibling fields from the item.
   */
  itemOptions?: ((repeaterPath: string) => Partial<MarkupOptions>) | undefined
}

/** Stands for the item index inside repeater item templates. */
export const ITEM_TOKEN = '__i__'

export interface RenderedRepeater {
  node: ElementNode
  /** Data path of the item array (no index), e.g. "people". */
  path: string
  /** Identifier-safe key for generated names. */
  key: string
  /** The item's grid markup, with ITEM_TOKEN for the index. */
  itemHtml: string
  messages: MessageCatalog
  limits: { min: number; max: number; initial: number }
  /** Escaped legend text, or null. */
  legend: string | null
  /** Item label template (escaped) with {n}. */
  itemLabel: string
  /** Escaped add-button text. */
  addText: string
}

export interface RenderedSection {
  node: ElementNode
  label: string
  index: number
  /** The section's children, already rendered as a grid block. */
  html: string
}

export interface RenderedSectionHost {
  node: ElementNode
  kind: 'tabs' | 'steps'
  /** Identifier-safe key for generated state names. */
  key: string
  sections: RenderedSection[]
  /** Built-in texts for the form's locale. */
  messages: MessageCatalog
}

/** Escaped Back/Next button labels for a steps host (props backText/nextText). */
export function stepButtonLabels(host: RenderedSectionHost): { back: string; next: string } {
  const read = (prop: string, fallback: string): string => {
    const value = host.node.props[prop]
    return esc(typeof value === 'string' && value !== '' ? value : fallback)
  }
  return { back: read('backText', host.messages.back), next: read('nextText', host.messages.next) }
}

/**
 * The adapter as seen by one element's emitter: its style.size/tone flow
 * into control/text slots and style.hideLabel turns the label visually
 * hidden (still announced), so emitters need no style logic of their own.
 */
function withNodeStyle(
  css: CssFrameworkAdapter,
  style: ElementStyle | undefined,
  fieldSize?: ControlSize,
): CssFrameworkAdapter {
  // The field's own size, else the form's; 'md' is plain (no modifier).
  const chosen = style?.size ?? fieldSize
  const size = chosen === 'md' ? undefined : chosen
  if (!size && !style?.tone && !style?.hideLabel) return css
  return {
    ...css,
    classes: (slot, mods) =>
      slot === 'label' && style?.hideLabel
        ? css.classes('srOnly')
        : css.classes(slot, { size, tone: style?.tone, ...mods }),
  }
}

/** Floating labels: the control's slot also carries the framework's floating classes. */
function withFloatingControl(css: CssFrameworkAdapter): CssFrameworkAdapter {
  const extra = css.classes('floatingControl')
  if (!extra) return css
  return {
    ...css,
    classes: (slot, mods) =>
      slot === 'input' || slot === 'select' ? `${css.classes(slot, mods)} ${extra}` : css.classes(slot, mods),
  }
}

/**
 * A CSS declaration string as a JSX style object. Custom properties keep
 * their names (React sets them as-is), which CSSProperties doesn't type.
 */
export function jsxStyle(css: string): string {
  const entries = css
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const i = d.indexOf(':')
      const prop = d.slice(0, i).trim()
      const value = d.slice(i + 1).trim().replace(/'/g, "\\'")
      const key = prop.startsWith('--') ? `'${prop}'` : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
      return `${key}: '${value}'`
    })
  const object = `{ ${entries.join(', ')} }`
  return entries.some((e) => e.startsWith("'--")) ? `${object} as React.CSSProperties` : object
}

function indentBlock(text: string, depth: number): string {
  const pad = '  '.repeat(depth)
  return text
    .split('\n')
    .map((line) => (line === '' ? line : pad + line))
    .join('\n')
}

export function renderTree(schema: FormSchema, rootOptions: MarkupOptions): string {
  const { css } = rootOptions
  const messages = resolveMessages(schema.meta.locale)
  const classAttr = rootOptions.classAttr ?? 'class'
  const comment = rootOptions.comment ?? ((text: string) => `<!-- ${text} -->`)

  const renderNodes = (
    nodes: ElementNode[],
    parentPath: string,
    defaultSpan: number,
    options: MarkupOptions = rootOptions,
  ): string =>
    nodes
      .map((node) => renderNode(node, parentPath, defaultSpan, options))
      .filter(Boolean)
      .join('\n')

  const renderNode = (
    node: ElementNode,
    parentPath: string,
    defaultSpan: number,
    options: MarkupOptions,
  ): string => {
    const core = getCoreElement(node.type)
    const def = getElement(node.type)
    if (!core || !def) return comment(`unsupported element type: ${esc(node.type)}`)

    // A hidden input takes no grid cell (only the HTML target emits markup;
    // the bound targets carry its value in their state).
    if (node.type === 'hidden') {
      const path = node.name ? joinPath(parentPath, node.name) : ''
      const key = pathKey(path)
      return (
        def.export?.[options.lang]?.(node, {
          css,
          path,
          key,
          id: `fg_${key}`,
          required: false,
          messages,
          locale: schema.meta.locale,
        }) ?? ''
      )
    }

    const span = node.layout?.colSpan ?? defaultSpan
    const cell = css.cell({ sm: node.layout?.colSpanSm ?? 12, md: span, lg: node.layout?.colSpanLg ?? span })
    const condExpr = node.conditions?.length
      ? (options.conditionExpr ?? ((groups) => compileConditions(groups, options.accessor)))(
          node.conditions,
        )
      : null
    const condAttr =
      condExpr && !options.wrapConditional ? options.conditionAttr(node, condExpr) : ''
    const styleAttr = cell.style
      ? classAttr === 'className'
        ? ` style={${jsxStyle(cell.style)}}`
        : ` style="${cell.style}"`
      : ''
    const cellClass = [
      cell.class,
      node.style?.align ? css.alignClass(node.style.align) : '',
      node.style?.className ? esc(node.style.className.trim().replace(/\s+/g, ' ')) : '',
    ]
      .filter(Boolean)
      .join(' ')
    const open = `<div ${classAttr}="${cellClass}"${styleAttr}${condAttr}>`

    let inner: string
    if (isRepeater(node)) {
      const repeaterPath = node.name ? joinPath(parentPath, node.name) : parentPath
      if (!options.renderRepeater || !node.name) {
        inner = comment(`repeating section "${esc(node.name ?? node.id)}" is not supported by this target yet`)
      } else {
        const itemOptions: MarkupOptions = { ...options, ...options.itemOptions?.(repeaterPath) }
        const itemHtml = `<div ${classAttr}="${css.classes('grid')}">\n${indentBlock(
          renderNodes(node.children ?? [], `${repeaterPath}.${ITEM_TOKEN}`, 12, itemOptions),
          1,
        )}\n</div>`
        const label = node.props['label']
        const itemLabel = node.props['itemLabel']
        const addText = node.props['addText']
        inner = options.renderRepeater({
          node,
          path: repeaterPath,
          key: pathKey(repeaterPath),
          itemHtml,
          messages,
          limits: repeaterLimits(node),
          legend: typeof label === 'string' && label !== '' ? esc(label) : null,
          itemLabel: esc(typeof itemLabel === 'string' && itemLabel !== '' ? itemLabel : messages.item),
          addText: esc(typeof addText === 'string' && addText !== '' ? addText : messages.addItem),
        })
      }
    } else if (core.isContainer) {
      const childPath = node.name ? joinPath(parentPath, node.name) : parentPath
      const sectionType = SECTION_CONTAINERS[node.type]
      if (sectionType) {
        const sections: RenderedSection[] = (node.children ?? [])
          .filter((c) => c.type === sectionType)
          .map((section, index) => ({
            node: section,
            index,
            label:
              typeof section.props['label'] === 'string' && section.props['label'] !== ''
                ? esc(section.props['label'] as string)
                : esc(fill(sectionType === 'tab' ? messages.tab : messages.step, { n: index + 1 })),
            html: `<div ${classAttr}="${css.classes('grid')}">\n${indentBlock(renderNodes(section.children ?? [], childPath, 12, options), 1)}\n</div>`,
          }))
        const host: RenderedSectionHost = {
          node,
          kind: node.type as 'tabs' | 'steps',
          key: node.id.replace(/[^A-Za-z0-9]/g, '_'),
          sections,
          messages,
        }
        inner = options.renderSections
          ? options.renderSections(host)
          : sections
              .map(
                (s) =>
                  `<fieldset ${classAttr}="${css.classes('group')}">\n  <legend ${classAttr}="${css.classes('groupLabel')}">${s.label}</legend>\n${indentBlock(s.html, 1)}\n</fieldset>`,
              )
              .join('\n')
      } else if (node.type === 'columns') {
        const count = Number(node.props['count'] ?? 2)
        const childSpan = Math.max(1, Math.round(12 / count))
        inner = `<div ${classAttr}="${css.classes('grid')}">\n${indentBlock(renderNodes(node.children ?? [], childPath, childSpan, options), 1)}\n</div>`
      } else {
        const label = node.props['label']
        const legend =
          typeof label === 'string' && label !== ''
            ? `<legend ${classAttr}="${css.classes('groupLabel')}">${esc(label)}</legend>\n  `
            : ''
        inner = `<fieldset ${classAttr}="${css.classes('group')}">\n  ${legend}<div ${classAttr}="${css.classes('grid')}">\n${indentBlock(renderNodes(node.children ?? [], childPath, 12, options), 2)}\n  </div>\n</fieldset>`
      }
    } else {
      const emitter = def.export?.[options.lang]
      if (!emitter) {
        inner = comment(`element type "${esc(node.type)}" has no ${options.lang} emitter yet`)
      } else {
        const path = node.name ? joinPath(parentPath, node.name) : ''
        const key = pathKey(path)
        const floating = floatsLabel(node, schema.meta)
        const styled = withNodeStyle(css, node.style, schema.meta.fieldSize)
        inner = emitter(node, {
          css: floating ? withFloatingControl(styled) : styled,
          floating,
          path,
          key,
          id: `fg_${key}`,
          required: isRequired(node),
          messages,
          locale: schema.meta.locale,
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

/** Splits text on ITEM_TOKEN: `a__i__b` → ['a', 'b']. */
export function splitItemToken(text: string): string[] {
  return text.split(ITEM_TOKEN)
}
