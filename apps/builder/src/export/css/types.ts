// CSS framework adapters (REBUILD_PROMPT.md §7a). Element emitters and
// target scaffolds NEVER hardcode a class name — they ask the adapter, so
// one emitter serves vanilla CSS, Tailwind and Bootstrap 5 alike.

import type { ControlSize, TextAlign, TextTone, ThemeTokens } from '@formsgen/renderer'

export type CssFrameworkId = 'vanilla' | 'tailwind' | 'bootstrap5'

export type Slot =
  | 'form'
  | 'grid'
  | 'field'
  | 'label'
  | 'required'
  | 'input'
  | 'textarea'
  | 'select'
  | 'checkboxWrap'
  | 'checkbox'
  | 'checkboxLabel'
  | 'description'
  | 'error'
  | 'group'
  | 'groupLabel'
  | 'actions'
  | 'submitButton'
  | 'payload'
  | 'options'
  | 'option'
  | 'range'
  | 'heading'
  | 'paragraph'
  | 'divider'
  | 'tabList'
  | 'tabButton'
  | 'tabButtonActive'
  | 'stepList'
  | 'stepItem'
  | 'stepItemActive'
  | 'stepActions'
  | 'buttonSecondary'
  | 'tagsWrap'
  | 'tag'
  | 'tagRemove'
  | 'tagsInput'
  | 'srOnly'

export interface CellAttrs {
  class: string
  style?: string
}

/**
 * Appearance modifiers (ElementNode.style). `size` applies to control
 * slots (input, textarea, select, tagsWrap); `tone` to heading, paragraph
 * and divider. Adapters return a complete class string per variant, so
 * conflicting utilities are never stacked on one element.
 */
export interface SlotMods {
  size?: ControlSize | undefined
  tone?: TextTone | undefined
}

export interface CssFrameworkAdapter {
  id: CssFrameworkId
  label: string
  classes(slot: Slot, mods?: SlotMods): string
  /** Class aligning an element's text (style.align). */
  alignClass(align: TextAlign): string
  /** Grid cell carrying a 12-column span. */
  cell(span: number): CellAttrs
  /** Class(es) added to a control while invalid. */
  invalidClass(): string
  /**
   * Stylesheet for generated artifacts: vanilla's full stylesheet, or a
   * framework's theme bridge (undefined when there is no theme to apply).
   */
  stylesheet?(theme?: ThemeTokens): string | undefined
  /** CDN references for the plain-HTML export. */
  assets(): { links: string[]; scripts: string[] }
  /** One line for generated READMEs naming the framework prerequisite. */
  readmeNote(): string
}

/** Slots that take `size` / `tone` modifiers. */
export const SIZED_SLOTS: ReadonlySet<Slot> = new Set<Slot>(['input', 'textarea', 'select', 'tagsWrap'])
export const TONED_SLOTS: ReadonlySet<Slot> = new Set<Slot>(['heading', 'paragraph', 'divider'])

/** Replaces `from` in a class string; throws if absent (caught by tests). */
export function swapClasses(base: string, from: string, to: string): string {
  if (!base.includes(from)) throw new Error(`class swap: "${from}" not found in "${base}"`)
  return base.replace(from, to)
}
