// CSS framework adapters (REBUILD_PROMPT.md §7a). Element emitters and
// target scaffolds NEVER hardcode a class name — they ask the adapter, so
// one emitter serves vanilla CSS, Tailwind and Bootstrap 5 alike.

import type { ThemeTokens } from '@formsgen/renderer'

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

export interface CellAttrs {
  class: string
  style?: string
}

export interface CssFrameworkAdapter {
  id: CssFrameworkId
  label: string
  classes(slot: Slot): string
  /** Grid cell carrying a 12-column span. */
  cell(span: number): CellAttrs
  /** Class(es) added to a control while invalid. */
  invalidClass(): string
  /** Full stylesheet for generated artifacts (vanilla only). */
  stylesheet?(theme?: ThemeTokens): string
  /** CDN references for the plain-HTML export. */
  assets(): { links: string[]; scripts: string[] }
  /** One line for generated READMEs naming the framework prerequisite. */
  readmeNote(): string
}
