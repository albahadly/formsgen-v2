import type { ElementDefinition } from '../types'

export const groupElement: ElementDefinition = {
  type: 'group',
  category: 'structure',
  label: 'Group',
  description: 'Container; with a name it nests its children in the data',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v12h14V6z"/></svg>',
  isContainer: true,
  defaultProps: { label: 'Group' },
  propertyPanel: [
    {
      title: 'Properties',
      controls: [{ kind: 'text', prop: 'label', label: 'Label' }],
    },
    { title: 'Data', controls: [{ kind: 'name' }] },
    { title: 'Layout', controls: [{ kind: 'colspan' }] },
    { title: 'Conditions', controls: [{ kind: 'conditions' }] },
  ],
}
