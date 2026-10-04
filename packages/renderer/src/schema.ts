// Canonical FormsGen schema types ("formsgen/v2").
// This is the single source of truth for the whole system: the builder edits
// it, the renderer renders it, export targets translate from it.
// Changing these shapes after phase 2 requires an ADR + version bump
// (REBUILD_PROMPT.md §11).

export const SCHEMA_ID = 'formsgen/v2'

/** CSS-variable-backed theme values, e.g. { "color-primary": "#4f46e5" }. */
export type ThemeTokens = Record<string, string>

export interface SubmitConfig {
  url?: string | undefined
  method?: 'POST' | 'PUT' | undefined
  headers?: Record<string, string> | undefined
}

export interface FormMeta {
  /** Machine name (slug) of the form. */
  name: string
  title?: string | undefined
  description?: string | undefined
  locale: string
  dir: 'ltr' | 'rtl'
  submit?: SubmitConfig | undefined
  theme?: ThemeTokens | undefined
}

export type RuleName =
  | 'required'
  | 'min'
  | 'max'
  | 'between'
  | 'email'
  | 'url'
  | 'regex'
  | 'same-as'

export interface Rule {
  rule: RuleName
  /** Rule argument: number for min/max, [min,max] for between, pattern for regex, field name for same-as. */
  value?: unknown
  /** Optional custom error message (overrides the locale default). */
  message?: string | undefined
}

export type ConditionOperator =
  | 'equals'
  | 'not-equals'
  | 'contains'
  | 'empty'
  | 'not-empty'
  | 'greater-than'
  | 'less-than'

export interface Condition {
  /** Name of the field whose value is tested. */
  field: string
  operator: ConditionOperator
  value?: unknown
}

/**
 * Visibility logic for a node: the outer array is OR-ed, each inner array is
 * AND-ed. `[[a, b], [c]]` reads "(a AND b) OR c". An absent/empty value means
 * always visible.
 */
export type ConditionGroups = Condition[][]

export type ColSpan = 1 | 2 | 3 | 4 | 6 | 12

export interface LayoutConfig {
  /** Span out of a 12-column grid; defaults to full width (12). */
  colSpan?: ColSpan | undefined
  width?: string | undefined
}

export interface ElementNode {
  /** Stable unique id (nanoid) for the node's lifetime. */
  id: string
  /** Registry key, e.g. 'text', 'select', 'group'. */
  type: string
  /** Data key (value elements and named containers); unique among siblings. */
  name?: string | undefined
  /** Element configuration: label, placeholder, items, ... */
  props: Record<string, unknown>
  validation?: Rule[] | undefined
  conditions?: ConditionGroups | undefined
  layout?: LayoutConfig | undefined
  /** Present on containers only. */
  children?: ElementNode[] | undefined
}

export interface FormSchema {
  $schema: typeof SCHEMA_ID
  meta: FormMeta
  tree: ElementNode[]
}

/** Valid data key: starts with a letter, then letters/digits/underscores. */
export const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/
