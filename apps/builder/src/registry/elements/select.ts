import {
  blazorValidationMessage,
  descriptionFor,
  esc,
  fieldWrap,
  htmlDataAttrs,
  htmlError,
  labelFor,
  pascalMember,
  reactControlClass,
  reactDescription,
  reactError,
  reactFieldWrap,
  reactLabelFor,
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
    react: (node, ctx) =>
      reactFieldWrap(
        [
          reactLabelFor(node, ctx),
          `<select id="${ctx.id}" value={form.${ctx.path} ?? ''} ${reactControlClass(ctx, 'select')} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setField('${ctx.path}', e.target.value === '' ? null : e.target.value)} onBlur={() => touch('${ctx.path}')}>\n    ${optionTags(node)}\n  </select>`,
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
      ),
    blazor: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<InputSelect id="${ctx.id}" @bind-Value="Model.${pascalMember(ctx.key)}" class="${ctx.css.classes('select')}">\n    ${optionTags(node)}\n  </InputSelect>`,
          descriptionFor(node, ctx),
          blazorValidationMessage(ctx),
        ],
        ctx,
      ),
  },
}

export const multiSelectElement: ElementDefinition = {
  type: 'multiselect',
  category: 'fields',
  label: 'Multiselect',
  description: 'Pick several options from a list',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M3 4h18v3H3zm0 5h18v3H3zm2 1v1h10v-1zm-2 4h18v3H3zm2 1v1h7v-1zM5 5v1h10V5z"/></svg>',
  hasValue: true,
  defaultProps: {
    label: 'Multiselect',
    items: [
      { value: 'option_1', label: 'Option 1' },
      { value: 'option_2', label: 'Option 2' },
      { value: 'option_3', label: 'Option 3' },
    ],
  },
  propertyPanel: commonFieldSections([{ kind: 'items', prop: 'items', label: 'Options' }]),
  export: {
    vue: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<select id="${ctx.id}" v-model="form.${ctx.path}" multiple class="${ctx.css.classes('select')}"${vueInvalid(ctx)} @change="touch('${ctx.path}')">\n    ${multiOptionTags(node)}\n  </select>`,
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        ctx,
      ),
    html: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<select id="${ctx.id}" multiple class="${ctx.css.classes('select')}"${htmlDataAttrs(ctx, 'multiselect')}>\n    ${multiOptionTags(node)}\n  </select>`,
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        ctx,
      ),
    react: (node, ctx) =>
      reactFieldWrap(
        [
          reactLabelFor(node, ctx),
          `<select id="${ctx.id}" multiple value={form.${ctx.path}} ${reactControlClass(ctx, 'select')} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setField('${ctx.path}', Array.from(e.target.selectedOptions).map((o) => o.value)); touch('${ctx.path}') }}>\n    ${multiOptionTags(node)}\n  </select>`,
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
      ),
    // Blazor multi-binding needs a custom component; deferred like
    // checkboxgroup (the walker emits an "unsupported" comment).
  },
}

function multiOptionTags(node: { props: Record<string, unknown> }): string {
  const items = Array.isArray(node.props['items']) ? (node.props['items'] as Item[]) : []
  return items.map((i) => `<option value="${esc(i.value)}">${esc(i.label)}</option>`).join('\n    ')
}
