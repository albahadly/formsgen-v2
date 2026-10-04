import {
  descriptionFor,
  fieldWrap,
  htmlDataAttrs,
  htmlError,
  labelFor,
  pascalMember,
  placeholderAttr,
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
import { isVerticalRange, type ElementNode } from '@formsgen/renderer'

function rangeAttrs(node: ElementNode): string {
  const parts: string[] = []
  for (const key of ['min', 'max', 'step'] as const) {
    const v = node.props[key]
    if (typeof v === 'number') parts.push(` ${key}="${v}"`)
  }
  return parts.join('')
}

export const numberElement: ElementDefinition = {
  type: 'number',
  category: 'fields',
  label: 'Number',
  description: 'Numeric input',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M7 4 5.5 9H2v2h2.9l-.7 2H2v2h1.6L2 20h2l1.6-5h3.8L7.8 20h2l1.6-5H15v-2h-3l.7-2H16V9h-2.7L15 4h-2l-1.7 5H7.5L9 4zm-.1 7h3.8l-.7 2H6.2z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Number', placeholder: '' },
  propertyPanel: commonFieldSections([
    { kind: 'number', prop: 'min', label: 'Min (input attribute)' },
    { kind: 'number', prop: 'max', label: 'Max (input attribute)' },
    { kind: 'number', prop: 'step', label: 'Step' },
  ]),
  export: {
    vue: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<input id="${ctx.id}" v-model.number="form.${ctx.path}" type="number" class="${ctx.css.classes('input')}"${vueInvalid(ctx)}${rangeAttrs(node)}${placeholderAttr(node)}${vueEvents(ctx)}>`,
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        ctx,
      ),
    html: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<input id="${ctx.id}" type="number" class="${ctx.css.classes('input')}"${htmlDataAttrs(ctx, 'number')}${rangeAttrs(node)}${placeholderAttr(node)}>`,
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        ctx,
      ),
    react: (node, ctx) =>
      reactFieldWrap(
        [
          reactLabelFor(node, ctx),
          `<input id="${ctx.id}" type="number" value={form.${ctx.path} ?? ''} ${reactControlClass(ctx, 'input')}${rangeAttrs(node)}${placeholderAttr(node)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('${ctx.path}', e.target.value === '' ? null : Number(e.target.value))} onBlur={() => touch('${ctx.path}')} />`,
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
      ),
    blazor: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<InputNumber id="${ctx.id}" @bind-Value="Model.${pascalMember(ctx.key)}" class="${ctx.css.classes('input')}"${placeholderAttr(node)} />`,
          descriptionFor(node, ctx),
          `<ValidationMessage For="@(() => Model.${pascalMember(ctx.key)})" class="${ctx.css.classes('error')}" />`,
        ],
        ctx,
      ),
  },
}

// Vertical sliders: the writing-mode trick every modern browser supports
// (inline, so it works with every CSS framework). Max sits at the top.
const VERTICAL_STYLE =
  'writing-mode: vertical-lr; direction: rtl; align-self: flex-start; width: auto; height: 10rem'
const VERTICAL_STYLE_JSX =
  "{{ writingMode: 'vertical-lr', direction: 'rtl', alignSelf: 'flex-start', width: 'auto', height: '10rem' }}"

function verticalAttrs(node: ElementNode, jsx = false): string {
  if (!isVerticalRange(node)) return ''
  return jsx
    ? ` aria-orientation="vertical" style=${VERTICAL_STYLE_JSX}`
    : ` aria-orientation="vertical" style="${VERTICAL_STYLE}"`
}

export const rangeElement: ElementDefinition = {
  type: 'range',
  category: 'fields',
  label: 'Slider',
  description: 'Range slider (horizontal or vertical)',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M4 11h10.2a3 3 0 0 1 5.6 0H20v2h-.2a3 3 0 0 1-5.6 0H4zm13 2a1 1 0 1 0-1-1 1 1 0 0 0 1 1z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Slider', min: 0, max: 100, step: 1 },
  propertyPanel: commonFieldSections([
    { kind: 'number', prop: 'min', label: 'Min' },
    { kind: 'number', prop: 'max', label: 'Max' },
    { kind: 'number', prop: 'step', label: 'Step' },
    {
      kind: 'select',
      prop: 'orientation',
      label: 'Orientation',
      options: [
        { value: 'horizontal', label: 'Horizontal' },
        { value: 'vertical', label: 'Vertical' },
      ],
    },
  ], ['hideLabel', 'align', 'className']),
  export: {
    vue: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<input id="${ctx.id}" v-model.number="form.${ctx.path}" type="range" class="${ctx.css.classes('range')}"${rangeAttrs(node)}${verticalAttrs(node)} @change="touch('${ctx.path}')">`,
          `<p class="${ctx.css.classes('description')}">{{ form.${ctx.path} }}</p>`,
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        ctx,
      ),
    html: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<input id="${ctx.id}" type="range" class="${ctx.css.classes('range')}"${htmlDataAttrs(ctx, 'number')}${rangeAttrs(node)}${verticalAttrs(node)} value="${Number(node.props['default'] ?? node.props['min'] ?? 0)}">`,
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        ctx,
      ),
    react: (node, ctx) =>
      reactFieldWrap(
        [
          reactLabelFor(node, ctx),
          `<input id="${ctx.id}" type="range" value={form.${ctx.path}} className="${ctx.css.classes('range')}"${rangeAttrs(node)}${verticalAttrs(node, true)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setField('${ctx.path}', Number(e.target.value)); touch('${ctx.path}') }} />`,
          `<p className="${ctx.css.classes('description')}">{form.${ctx.path}}</p>`,
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
      ),
    blazor: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          // Plain input: Blazor's InputNumber hardcodes type="number".
          `<input id="${ctx.id}" type="range" @bind="Model.${pascalMember(ctx.key)}" @bind:event="oninput" class="${ctx.css.classes('range')}"${rangeAttrs(node)}${verticalAttrs(node)} />`,
          descriptionFor(node, ctx),
          `<ValidationMessage For="@(() => Model.${pascalMember(ctx.key)})" class="${ctx.css.classes('error')}" />`,
        ],
        ctx,
      ),
  },
}
