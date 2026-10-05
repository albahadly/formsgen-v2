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
  | 'switchWrap'
  | 'switch'
  | 'optionsBlocks'
  | 'optionBlock'
  | 'optionBlockInput'
  | 'optionsButtons'
  | 'optionButton'
  | 'optionButtonInput'
  | 'image'
  | 'link'
  | 'quote'
  | 'quoteText'
  | 'quoteCite'
  | 'buttonDanger'
  | 'colorInput'
  | 'repeaterItems'
  | 'repeaterItem'
  | 'repeaterItemLabel'
  | 'repeaterItemActions'
  | 'repeaterRemove'
  /** An item's move up / move down buttons (sortable repeaters). */
  | 'repeaterMove'
  | 'repeaterAdd'
  | 'fileInput'
  | 'fileList'
  | 'fileItem'
  | 'fileThumb'
  | 'fileName'
  | 'fileSize'
  | 'fileRemove'
  /** Row of two controls (date range, add-a-date). */
  | 'pair'
  /** Wrapping list of chips under a field (multiple dates). */
  | 'chipList'
  /** A secondary button inside a pair row that never shrinks (Add date). */
  | 'pairButton'
  /** The dash between a date range's two inputs. */
  | 'pairSeparator'
  /** Matrix: scroll wrapper, table, column/row headers, row, cell, radio. */
  | 'matrixWrap'
  | 'matrix'
  | 'matrixColHead'
  | 'matrixRowHead'
  | 'matrixRow'
  | 'matrixCell'
  | 'matrixRadio'
  /** Phone field's country-code select (beside the number input). */
  | 'phoneCountry'
  /** Text add-ons around a control (prefix/suffix) and their row. */
  | 'affixGroup'
  | 'affix'
  /** Floating labels: wrapper, label, and extra classes on the control. */
  | 'floating'
  | 'floatingLabel'
  | 'floatingControl'

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
export interface CellSpans {
  sm: number
  md: number
  lg: number
}

export interface SlotMods {
  /** Medium ('md') is the absence of a size modifier. */
  size?: Exclude<ControlSize, 'md'> | undefined
  tone?: TextTone | undefined
}

export interface CssFrameworkAdapter {
  id: CssFrameworkId
  label: string
  classes(slot: Slot, mods?: SlotMods): string
  /** Class aligning an element's text (style.align). */
  alignClass(align: TextAlign): string
  /** Grid cell carrying 12-column spans for phones (sm), tablets (md) and desktops (lg). */
  cell(spans: CellSpans): CellAttrs
  /**
   * Markup shape of block/button choice options: the input inside its
   * label ('wrap'), or input then label as siblings ('sibling', which
   * Bootstrap's `.btn-check + .btn` pattern requires).
   */
  choiceLayout: 'wrap' | 'sibling'
  /** Class(es) added to a control while invalid. */
  invalidClass(): string
  /**
   * Stylesheet for generated artifacts: vanilla's full stylesheet, or a
   * framework's theme bridge (undefined when there is no theme to apply).
   */
  stylesheet?(theme?: ThemeTokens): string | undefined
  /** CDN references for the plain-HTML export. */
  assets(dir?: 'ltr' | 'rtl'): { links: string[]; scripts: string[] }
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
