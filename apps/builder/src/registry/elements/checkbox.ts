import { commonFieldSections, type ElementDefinition } from '../types'

export const checkboxElement: ElementDefinition = {
  type: 'checkbox',
  category: 'fields',
  label: 'Checkbox',
  description: 'Single yes/no checkbox',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V5h14zm-9.2-3.4-3.5-3.5 1.4-1.4 2.1 2.1 5.1-5.1 1.4 1.4z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Checkbox' },
  propertyPanel: commonFieldSections([
    { kind: 'toggle', prop: 'default', label: 'Checked by default' },
  ]),
}
