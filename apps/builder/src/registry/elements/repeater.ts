// Repeatable section: visitors add or remove items, each holding the same
// fields (e.g. "add another person"). The value is an array of objects.
// Export targets render it structurally (see export/markup.ts).

import type { ElementDefinition } from '../types'

export const repeaterElement: ElementDefinition = {
  type: 'repeater',
  category: 'structure',
  label: 'Repeating section',
  description: 'Fields people can add again (e.g. another person)',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M4 4h12v4H4zm0 6h12v4H4zm0 6h12v4H4zm15-6h2v3h3v2h-3v3h-2v-3h-3v-2h3z"/></svg>',
  isContainer: true,
  hasValue: true,
  defaultProps: { label: 'Repeating section', minItems: 1, initialItems: 1 },
  propertyPanel: [
    {
      title: 'Properties',
      controls: [
        { kind: 'text', prop: 'label', label: 'Label' },
        { kind: 'text', prop: 'itemLabel', label: 'Item label ({n} = number)', placeholder: 'Item {n}' },
        { kind: 'text', prop: 'addText', label: 'Add button text' },
        { kind: 'number', prop: 'minItems', label: 'Minimum items', min: 0 },
        { kind: 'number', prop: 'maxItems', label: 'Maximum items (empty = no limit)', min: 1 },
        { kind: 'number', prop: 'initialItems', label: 'Items shown at start', min: 0 },
      ],
    },
    { title: 'Data', controls: [{ kind: 'name' }] },
    { title: 'Layout', controls: [{ kind: 'colspan' }] },
    { title: 'Conditions', controls: [{ kind: 'conditions' }] },
  ],
}
