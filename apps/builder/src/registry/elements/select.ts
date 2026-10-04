import {
  descriptionFor,
  esc,
  fieldWrap,
  htmlDataAttrs,
  htmlError,
  labelFor,
  vueError,
  vueEvents,
  vueInvalid,
} from '../emitters/shared'
import { commonFieldSections, type ElementDefinition } from '../types'

interface Item {
  value: string
  label: string
}

function optionTags(node: { props: Record<string, unknown> }): string {
  const items = Array.isArray(node.props['items']) ? (node.props['items'] as Item[]) : []
  const placeholder = esc(String(node.props['placeholder'] ?? '—'))
  return [
    `<option value="" disabled>${placeholder}</option>`,
    ...items.map((i) => `<option value="${esc(i.value)}">${esc(i.label)}</option>`),
  ].join('\n    ')
}

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
  export: {
    vue: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<select id="${ctx.id}" v-model="form.${ctx.path}" class="${ctx.css.classes('select')}"${vueInvalid(ctx)}${vueEvents(ctx, true)}>\n    ${optionTags(node)}\n  </select>`,
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        ctx,
      ),
    html: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<select id="${ctx.id}" class="${ctx.css.classes('select')}"${htmlDataAttrs(ctx, 'select')}>\n    ${optionTags(node)}\n  </select>`,
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        ctx,
      ),
  },
}
