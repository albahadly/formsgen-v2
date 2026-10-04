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

/** Text-like types sharing the FgText component; value = input type attr. */
export const TEXT_INPUT_TYPES: Record<string, string> = {
  text: 'text',
  email: 'email',
  password: 'password',
  url: 'url',
  phone: 'tel',
  date: 'date',
  time: 'time',
}

/** Core element catalog; builder definitions must match (ADR-0001). */
export const coreElements: Record<string, CoreElementMeta> = {
  text: meta('text', true, false, () => ''),
  email: meta('email', true, false, () => ''),
  password: meta('password', true, false, () => ''),
  url: meta('url', true, false, () => ''),
  phone: meta('phone', true, false, () => ''),
  date: meta('date', true, false, () => ''),
  time: meta('time', true, false, () => ''),
  textarea: meta('textarea', true, false, () => ''),
  number: meta('number', true, false, () => null),
  select: meta('select', true, false, () => null),
  multiselect: meta('multiselect', true, false, () => []),
  radiogroup: meta('radiogroup', true, false, () => null),
  checkbox: meta('checkbox', true, false, () => false),
  checkboxgroup: meta('checkboxgroup', true, false, () => []),
  range: meta('range', true, false, (node) => Number(node.props['min'] ?? 0)),
  heading: meta('heading', false, false, () => undefined),
  paragraph: meta('paragraph', false, false, () => undefined),
  divider: meta('divider', false, false, () => undefined),
  group: meta('group', false, true, () => undefined),
  columns: meta('columns', false, true, () => undefined),
  tabs: meta('tabs', false, true, () => undefined),
  tab: meta('tab', false, true, () => undefined),
  steps: meta('steps', false, true, () => undefined),
  step: meta('step', false, true, () => undefined),
}

/** Container types whose children are restricted to one section type. */
export const SECTION_CONTAINERS: Record<string, string> = {
  tabs: 'tab',
  steps: 'step',
}

/** Section types that may ONLY live inside their parent container type. */
export const SECTION_TYPES: Record<string, string> = {
  tab: 'tabs',
  step: 'steps',
}

export function getCoreElement(type: string): CoreElementMeta | undefined {
  return coreElements[type]
}
