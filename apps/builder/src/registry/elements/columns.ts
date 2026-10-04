import type { ElementDefinition } from '../types'

export const columnsElement: ElementDefinition = {
  type: 'columns',
  category: 'structure',
  label: 'Columns',
  description: 'Side-by-side column layout (transparent in the data)',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M4 4h7v16H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm9 0h7a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-7z"/></svg>',
  isContainer: true,
  defaultProps: { count: 2 },
  propertyPanel: [
    {
      title: 'Properties',
      controls: [
        {
          kind: 'select',
          prop: 'count',
          label: 'Columns',
          options: [
            { value: '2', label: '2 columns' },
            { value: '3', label: '3 columns' },
            { value: '4', label: '4 columns' },
          ],
        },
      ],
    },
    { title: 'Layout', controls: [{ kind: 'colspan' }] },
    { title: 'Conditions', controls: [{ kind: 'conditions' }] },
  ],
}
