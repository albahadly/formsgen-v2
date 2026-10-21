// Hidden input: a fixed value submitted with the form (e.g. a source tag
// or campaign id), or the value of a named parameter of the page address
// (props.param, see the renderer's prefill.ts). Only the HTML target needs
// markup — the bound targets carry the value in their state, initialized
// from props.value.

import { esc, htmlDataAttrs } from '../emitters/shared'
import type { ElementDefinition } from '../types'

export const hiddenElement: ElementDefinition = {
  type: 'hidden',
  category: 'fields',
  label: 'Hidden input',
  description: 'Fixed value sent with the form',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 7a5 5 0 0 1 5 5 4.9 4.9 0 0 1-.4 1.8l2.9 2.9A11.8 11.8 0 0 0 23 12a11.8 11.8 0 0 0-14.8-6.6l2.2 2.2A4.9 4.9 0 0 1 12 7zM2 4.3l2.3 2.3.5.4A11.8 11.8 0 0 0 1 12a11.8 11.8 0 0 0 15.4 6.6l.4.4 2.9 2.9 1.3-1.3L3.3 3zm5.5 5.5 1.6 1.6A2.8 2.8 0 0 0 9 12a3 3 0 0 0 3 3 2.8 2.8 0 0 0 .6-.1l1.6 1.6A5 5 0 0 1 7.5 9.8zm4.3-.8 3.2 3.2V12a3 3 0 0 0-3-3z"/></svg>',
  hasValue: true,
  defaultProps: { value: '' },
  propertyPanel: [
    {
      title: 'Properties',
      controls: [
        { kind: 'text', prop: 'value', label: 'Value' },
        { kind: 'text', prop: 'param', label: 'URL parameter', placeholder: 'e.g. utm_source' },
      ],
    },
    { title: 'Data', controls: [{ kind: 'name' }] },
    { title: 'Conditions', controls: [{ kind: 'conditions' }] },
  ],
  export: {
    vue: () => '',
    react: () => '',
    blazor: () => '',
    html: (node, ctx) =>
      `<input id="${ctx.id}" type="hidden" value="${esc(String(node.props['value'] ?? ''))}"${htmlDataAttrs(ctx, 'text')}>`,
  },
}
