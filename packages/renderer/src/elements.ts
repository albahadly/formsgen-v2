// Core element semantics: the renderer-side knowledge about each element
// type — whether it carries a value, whether it nests children, and what its
// default value is. Builder-side authoring metadata (icons, palette labels,
// property panels) lives in the builder's registry (see ADR-0001).

import type { ElementNode } from './schema'

export interface CoreElementMeta {
  type: string
  /** Participates in form data under its `name`. */
  hasValue: boolean
  /** Accepts child nodes. */
  isContainer: boolean
  /** Initial value when the node's props carry no `default`. */
  defaultValue: (node: ElementNode) => unknown
}

const meta = (
  type: string,
  hasValue: boolean,
  isContainer: boolean,
  defaultValue: (node: ElementNode) => unknown,
): CoreElementMeta => ({ type, hasValue, isContainer, defaultValue })

/** Pilot element set (phase 2); grows with the catalog in later phases. */
export const coreElements: Record<string, CoreElementMeta> = {
  text: meta('text', true, false, () => ''),
  textarea: meta('textarea', true, false, () => ''),
  select: meta('select', true, false, () => null),
  checkbox: meta('checkbox', true, false, () => false),
  group: meta('group', false, true, () => undefined),
  columns: meta('columns', false, true, () => undefined),
}

export function getCoreElement(type: string): CoreElementMeta | undefined {
  return coreElements[type]
}
