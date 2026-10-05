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

/** A spam check before sending (see captcha.ts). */
export interface CaptchaConfig {
  provider: 'turnstile'
  /** The Cloudflare Turnstile site key (public; the secret stays on the server). */
  siteKey: string
}

export type SubmitAlign = 'start' | 'center' | 'end'

/** Appearance and placement of the form's submit button. */
export interface SubmitButtonConfig {
  /** Button label; defaults to "Submit". */
  text?: string | undefined
  /** Horizontal placement inside the actions row; defaults to "start". */
  align?: SubmitAlign | undefined
  /** Visual style; defaults to "primary". */
  variant?: 'primary' | 'secondary' | undefined
  /** Stretch the button to the full form width. */
  fullWidth?: boolean | undefined
  /**
   * When the form contains a steps wizard, show the submit button only
   * once every wizard sits on its last step. Defaults to true.
   */
  onLastStepOnly?: boolean | undefined
}

export interface FormMeta {
  /** Machine name (slug) of the form. */
  name: string
  title?: string | undefined
  description?: string | undefined
  locale: string
  dir: 'ltr' | 'rtl'
  submit?: SubmitConfig | undefined
  submitButton?: SubmitButtonConfig | undefined
  theme?: ThemeTokens | undefined
  /** Default control size for every field ('md' or absent = medium). */
  fieldSize?: ControlSize | undefined
  /** Labels float inside single-line controls (see labels.ts). */
  floatingLabels?: boolean | undefined
  /** Save and continue later: answers are kept in the visitor's browser until sent (see draft.ts). */
  saveDraft?: boolean | undefined
  /** Spam check: the submit button waits for a passed check (see captcha.ts). */
  captcha?: CaptchaConfig | undefined
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
  /** Span out of a 12-column grid from tablets up (≥768px); defaults to full width (12). */
  colSpan?: ColSpan | undefined
  /** Span on phones (<768px); defaults to full width (12). */
  colSpanSm?: ColSpan | undefined
  /** Span on desktops (≥1024px); defaults to colSpan. */
  colSpanLg?: ColSpan | undefined
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
  /** Appearance (ADR-0002); absent keys mean the default look. */
  style?: ElementStyle | undefined
  /** Present on containers only. */
  children?: ElementNode[] | undefined
}

/** 'md' is explicit medium (overrides a form-wide meta.fieldSize). */
export type ControlSize = 'sm' | 'md' | 'lg'
export type TextAlign = 'center' | 'end'
export type TextTone = 'muted' | 'primary' | 'danger'

/**
 * Semantic appearance options, translated by every target into its own
 * idiom (vanilla CSS variables, Tailwind utilities, Bootstrap classes).
 */
export interface ElementStyle {
  /** Field control size; medium when absent. */
  size?: ControlSize | undefined
  /** Field label hidden visually but still announced by screen readers. */
  hideLabel?: boolean | undefined
  /** Text alignment of the element; start when absent. */
  align?: TextAlign | undefined
  /** Text color of headings/paragraphs (line color of a divider). */
  tone?: TextTone | undefined
  /** Extra CSS classes on the element's cell (space-separated). */
  className?: string | undefined
}

/** Allowed custom class token: no quotes, angle brackets, "@" or "{}". */
export const CLASS_TOKEN_PATTERN = /^[A-Za-z0-9_:/.[\]%#()!,=*+-]+$/

export interface FormSchema {
  $schema: typeof SCHEMA_ID
  meta: FormMeta
  tree: ElementNode[]
}

/** Valid data key: starts with a letter, then letters/digits/underscores. */
export const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/
