// Builder-side element registry contract (ADR-0001): authoring metadata on
// top of @formsgen/renderer's core element semantics. One definition file
// per element type in ./elements; nothing about a type is hardcoded in the
// palette, canvas, or properties panel.

import type { ElementNode, MessageCatalog, Rule } from '@formsgen/renderer'
import type { CssFrameworkAdapter } from '@/export/css/types'

export type ElementCategory = 'fields' | 'static' | 'structure'

/** Context handed to an element's export emitter (REBUILD_PROMPT §3). */
export interface EmitCtx {
  css: CssFrameworkAdapter
  /** Data path, e.g. "account.username". */
  path: string
  /** Identifier-safe key, e.g. "account_username". */
  key: string
  /** DOM id for the control. */
  id: string
  required: boolean
  /** Built-in texts for the form's locale. */
  messages: MessageCatalog
  /** The form's locale (meta.locale), e.g. for country names. */
  locale: string
  /** The label floats inside the control (meta.floatingLabels + floatsLabel). */
  floating?: boolean
}

/** Emits the element's field markup for one target language. */
export type ElementEmitter = (node: ElementNode, ctx: EmitCtx) => string

/** Target languages with per-element markup (containers are structural). */
export type EmitterLang = 'vue' | 'html' | 'react' | 'blazor'

/** Declarative properties-panel controls, rendered by ~8 shared components. */
export type PanelControl =
  | { kind: 'text'; prop: string; label: string; placeholder?: string; multiline?: boolean; hint?: string }
  | { kind: 'number'; prop: string; label: string; min?: number; max?: number }
  /** A switch; with `on`, the prop holds that string when on (and is removed when off). */
  | { kind: 'toggle'; prop: string; label: string; on?: string }
  | { kind: 'select'; prop: string; label: string; options: { value: string; label: string }[] }
  /** Key/value option-list editor (e.g. select items). */
  | { kind: 'items'; prop: string; label: string }
  /** Country picker (names in the builder's UI language). */
  | { kind: 'country'; prop: string; label: string }
  /** Data-key editor with slug + sibling-uniqueness validation. */
  | { kind: 'name' }
  /** Validation rule builder over the closed rule catalog. */
  | { kind: 'validation' }
  /** Visibility condition builder over other named fields. */
  | { kind: 'conditions' }
  /** Appearance options (ElementNode.style) offered for this element. */
  | { kind: 'appearance'; features: AppearanceFeature[] }
  /** 12-column span picker (layout.colSpan). */
  | { kind: 'colspan' }
  /** A calculated field's formula, checked against the form (props.formula). */
  | { kind: 'formula' }

export interface PanelSection {
  title: string
  controls: PanelControl[]
}

export interface ElementDefinition {
  /** Registry key; must match a core element type in @formsgen/renderer. */
  type: string
  category: ElementCategory
  label: string
  description: string
  /** Inline SVG markup for the palette. */
  icon: string
  isContainer?: boolean
  hasValue?: boolean
  defaultProps: Record<string, unknown>
  defaultValidation?: Rule[]
  propertyPanel: PanelSection[]
  /** Containers that scaffold initial children when created (tabs/steps). */
  createChildren?: (() => ElementNode[]) | undefined
  /**
   * Per-target-language markup emitters for value elements (phase 8+).
   * Containers are rendered structurally by the target scaffolds. A type
   * missing a language is reported as unsupported in the generated code.
   */
  export?: Partial<Record<EmitterLang, ElementEmitter>>
}

/** Text add-ons around a control (text-likes, number). */
export const AFFIX_CONTROLS: PanelControl[] = [
  { kind: 'text', prop: 'prefix', label: 'Text before the field (e.g. $)' },
  { kind: 'text', prop: 'suffix', label: 'Text after the field (e.g. kg)' },
]

/** Shared panel sections for value-bearing field elements. */
/** One appearance option in the panel (maps to an ElementStyle key). */
export type AppearanceFeature = 'size' | 'hideLabel' | 'align' | 'tone' | 'className'

/** Fields with a sizable control (text-likes, number, textarea, selects, tags). */
export const FIELD_APPEARANCE: AppearanceFeature[] = ['size', 'hideLabel', 'align', 'className']

export function appearanceSection(features: AppearanceFeature[]): PanelSection {
  return { title: 'Appearance', controls: [{ kind: 'appearance', features }] }
}

export function commonFieldSections(
  extra: PanelControl[] = [],
  appearance: AppearanceFeature[] = FIELD_APPEARANCE,
): PanelSection[] {
  return [
    {
      title: 'Properties',
      controls: [
        { kind: 'text', prop: 'label', label: 'Label' },
        { kind: 'text', prop: 'placeholder', label: 'Placeholder' },
        { kind: 'text', prop: 'description', label: 'Description' },
        { kind: 'text', prop: 'tooltip', label: 'Help tooltip' },
        ...extra,
      ],
    },
    { title: 'Data', controls: [{ kind: 'name' }] },
    { title: 'Layout', controls: [{ kind: 'colspan' }] },
    appearanceSection(appearance),
    { title: 'Validation', controls: [{ kind: 'validation' }] },
    { title: 'Conditions', controls: [{ kind: 'conditions' }] },
  ]
}
