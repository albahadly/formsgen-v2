import { commonFieldSections, type ElementDefinition } from '../types'

export const textElement: ElementDefinition = {
  type: 'text',
  category: 'fields',
  label: 'Text Input',
  description: 'Single line text input',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M4 5h16v2H4zm0 6h16v2H4zm0 6h10v2H4z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Text Input', placeholder: '' },
  propertyPanel: commonFieldSections(),
}
