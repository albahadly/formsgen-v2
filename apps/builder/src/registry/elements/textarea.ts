import { commonFieldSections, type ElementDefinition } from '../types'

export const textareaElement: ElementDefinition = {
  type: 'textarea',
  category: 'fields',
  label: 'Textarea',
  description: 'Multiline text input',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M3 4h18v2H3zm0 5h18v2H3zm0 5h18v2H3zm0 5h12v2H3z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Textarea', placeholder: '', rows: 3 },
  propertyPanel: commonFieldSections([
    { kind: 'number', prop: 'rows', label: 'Rows', min: 2, max: 20 },
  ]),
}
