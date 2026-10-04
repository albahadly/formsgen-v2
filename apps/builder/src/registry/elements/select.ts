import { commonFieldSections, type ElementDefinition } from '../types'

export const selectElement: ElementDefinition = {
  type: 'select',
  category: 'fields',
  label: 'Select',
  description: 'Dropdown with options',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M3 5h18v4H3zm2 1.5v1h10v-1zM16.5 7l1.5 1.5L19.5 7zM3 11h18v8H3zm2 2v1.5h9V13zm0 3v1.5h6V16z"/></svg>',
  hasValue: true,
  defaultProps: {
    label: 'Select',
    placeholder: 'Choose…',
    items: [
      { value: 'option_1', label: 'Option 1' },
      { value: 'option_2', label: 'Option 2' },
    ],
  },
  propertyPanel: commonFieldSections([{ kind: 'items', prop: 'items', label: 'Options' }]),
}
