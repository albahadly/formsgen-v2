// Export target plugin contract (REBUILD_PROMPT §7b, pragmatic subset for
// the core targets; React/Blazor plug in via the same interface in phase 9).

import type { FormSchema } from '@formsgen/renderer'
import type { CssFrameworkAdapter } from '../css'

export interface ExportedFile {
  path: string
  content: string
  /** highlight.js language id for display. */
  language: 'json' | 'xml' | 'javascript' | 'typescript' | 'markdown' | 'css'
  /** False for a file the project must not be appended to (a prebuilt bundle). */
  project?: false
}

/** Prebuilt pieces a target may include when the caller has them. */
export interface ExportAssets {
  /** The renderer's web-component bundle (dist/element/formsgen-element.js). */
  elementScript?: string | null
  /** Where that bundle can be loaded from instead (the builder's own origin). */
  elementScriptUrl?: string | null
}

export interface ExportContext {
  schema: FormSchema
  css: CssFrameworkAdapter
  assets?: ExportAssets | undefined
}

export interface ExportTarget {
  id: string
  label: string
  description: string
  /** False when the CSS framework choice does not apply (e.g. JSON). */
  frameworkAware: boolean
  /** Generated files; the FIRST file is the primary artifact. */
  generate(ctx: ExportContext): ExportedFile[]
  /** README content for the zip "project package" mode. */
  readme(ctx: ExportContext): string
}

/** PascalCase component name from the form's machine name. */
export function componentName(schema: FormSchema): string {
  const pascal = schema.meta.name
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return `${pascal || 'Generated'}Form`
}
