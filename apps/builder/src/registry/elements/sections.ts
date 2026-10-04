// Tabs and Steps (wizard) containers: section hosts whose children are
// `tab` / `step` section nodes. Sections are data-transparent containers.
// Export markup is produced by the targets' section hooks (markup.ts), so
// no emitters here.

import type { ElementNode } from '@formsgen/renderer'
import { nanoid } from 'nanoid'
import type { ElementDefinition } from '../types'

export function createSection(kind: 'tab' | 'step', index: number): ElementNode {
  return {
    id: nanoid(10),
    type: kind,
    props: { label: `${kind === 'tab' ? 'Tab' : 'Step'} ${index}` },
    children: [],
  }
}

const sectionPanel: ElementDefinition['propertyPanel'] = [
  {
    title: 'Properties',
    controls: [{ kind: 'text', prop: 'label', label: 'Label' }],
  },
  { title: 'Conditions', controls: [{ kind: 'conditions' }] },
]

const hostPanel: ElementDefinition['propertyPanel'] = [
  { title: 'Layout', controls: [{ kind: 'colspan' }] },
  { title: 'Conditions', controls: [{ kind: 'conditions' }] },
]

const stepsPanel: ElementDefinition['propertyPanel'] = [
  {
    title: 'Properties',
    controls: [
      { kind: 'text', prop: 'backText', label: 'Back button text' },
      { kind: 'text', prop: 'nextText', label: 'Next button text' },
    ],
  },
  { title: 'Layout', controls: [{ kind: 'colspan' }] },
  { title: 'Conditions', controls: [{ kind: 'conditions' }] },
]

export const tabsElement: ElementDefinition = {
  type: 'tabs',
  category: 'structure',
  label: 'Tabs',
  description: 'Break the form into switchable tabs',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M3 5a2 2 0 0 1 2-2h5l2 2h9a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm2 4v10h15V9z"/></svg>',
  isContainer: true,
  defaultProps: {},
  propertyPanel: hostPanel,
  createChildren: () => [createSection('tab', 1), createSection('tab', 2)],
}

export const tabElement: ElementDefinition = {
  type: 'tab',
  category: 'structure',
  label: 'Tab',
  description: 'One tab panel (drop into a Tabs container)',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M4 6a2 2 0 0 1 2-2h6l2 2h6v2H4zm0 4h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/></svg>',
  isContainer: true,
  defaultProps: { label: 'Tab' },
  propertyPanel: sectionPanel,
}

export const stepsElement: ElementDefinition = {
  type: 'steps',
  category: 'structure',
  label: 'Steps',
  description: 'Multi-step wizard with per-step validation',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M4 15h4v4H4zm6-5h4v9h-4zm6-5h4v14h-4z"/></svg>',
  isContainer: true,
  defaultProps: { backText: 'Back', nextText: 'Next' },
  propertyPanel: stepsPanel,
  createChildren: () => [createSection('step', 1), createSection('step', 2)],
}

export const stepElement: ElementDefinition = {
  type: 'step',
  category: 'structure',
  label: 'Step',
  description: 'One wizard step (drop into a Steps container)',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>',
  isContainer: true,
  defaultProps: { label: 'Step' },
  propertyPanel: sectionPanel,
}
