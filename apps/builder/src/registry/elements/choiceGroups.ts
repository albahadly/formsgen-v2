// Choice groups: radio-group (single string value) and checkbox-group
// (string[] value). Options render per item; the HTML runtime reads them
// via dedicated kinds ('radio' / 'checks').

import type { ElementNode } from '@formsgen/renderer'
import {
  descriptionFor,
  esc,
  htmlError,
  pascalMember,
  reactDescription,
  reactError,
  reactFieldWrap,
  vueError,
} from '../emitters/shared'
import { commonFieldSections, type ElementDefinition, type EmitCtx } from '../types'

interface Item {
  value: string
  label: string
}

function items(node: ElementNode): Item[] {
  const raw = node.props['items']
  return Array.isArray(raw) ? (raw as Item[]) : []
}

function legend(node: ElementNode, ctx: EmitCtx, jsx = false): string {
  const classAttr = jsx ? 'className' : 'class'
  const text = esc(String(node.props['label'] ?? ''))
  const req = ctx.required
    ? `<span ${classAttr}="${ctx.css.classes('required')}" aria-hidden="true">*</span>`
    : ''
  return `<legend ${classAttr}="${ctx.css.classes('label')}">${text}${req}</legend>`
}

const defaultItems: Item[] = [
  { value: 'option_1', label: 'Option 1' },
  { value: 'option_2', label: 'Option 2' },
]

export const radioGroupElement: ElementDefinition = {
  type: 'radiogroup',
  category: 'fields',
  label: 'Radio Group',
  description: 'Pick one option',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-13a5 5 0 1 0 5 5 5 5 0 0 0-5-5z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Radio Group', items: structuredClone(defaultItems) },
  propertyPanel: commonFieldSections([{ kind: 'items', prop: 'items', label: 'Options' }]),
  export: {
    vue: (node, ctx) =>
      `<fieldset class="${ctx.css.classes('field')}">\n  ${[
        legend(node, ctx),
        `<div class="${ctx.css.classes('options')}">\n${items(node)
          .map(
            (item) =>
              `    <label class="${ctx.css.classes('option')}" for="${ctx.id}_${esc(item.value)}">\n      <input id="${ctx.id}_${esc(item.value)}" v-model="form.${ctx.path}" type="radio" class="${ctx.css.classes('checkbox')}" value="${esc(item.value)}" @change="touch('${ctx.path}')">\n      <span>${esc(item.label)}</span>\n    </label>`,
          )
          .join('\n')}\n  </div>`,
        descriptionFor(node, ctx),
        vueError(ctx),
      ]
        .filter(Boolean)
        .join('\n  ')}\n</fieldset>`,
    html: (node, ctx) =>
      `<fieldset class="${ctx.css.classes('field')}">\n  ${[
        legend(node, ctx),
        `<div class="${ctx.css.classes('options')}">\n${items(node)
          .map(
            (item) =>
              `    <label class="${ctx.css.classes('option')}" for="${ctx.id}_${esc(item.value)}">\n      <input id="${ctx.id}_${esc(item.value)}" type="radio" name="${ctx.key}" class="${ctx.css.classes('checkbox')}" value="${esc(item.value)}" data-fg-path="${ctx.path}" data-fg-kind="radio">\n      <span>${esc(item.label)}</span>\n    </label>`,
          )
          .join('\n')}\n  </div>`,
        descriptionFor(node, ctx),
        htmlError(ctx),
      ]
        .filter(Boolean)
        .join('\n  ')}\n</fieldset>`,
    react: (node, ctx) =>
      reactFieldWrap(
        [
          `<fieldset className="${ctx.css.classes('field')}">\n    ${legend(node, ctx, true)}\n    <div className="${ctx.css.classes('options')}">\n${items(node)
            .map(
              (item) =>
                `      <label className="${ctx.css.classes('option')}" htmlFor="${ctx.id}_${esc(item.value)}">\n        <input id="${ctx.id}_${esc(item.value)}" type="radio" className="${ctx.css.classes('checkbox')}" checked={form.${ctx.path} === '${esc(item.value)}'} onChange={() => { setField('${ctx.path}', '${esc(item.value)}'); touch('${ctx.path}') }} />\n        <span>${esc(item.label)}</span>\n      </label>`,
            )
            .join('\n')}\n    </div>\n  </fieldset>`,
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
      ),
    blazor: (node, ctx) =>
      `<fieldset class="${ctx.css.classes('field')}">\n  ${[
        legend(node, ctx),
        `<InputRadioGroup @bind-Value="Model.${pascalMember(ctx.key)}">\n    <div class="${ctx.css.classes('options')}">\n${items(node)
          .map(
            (item) =>
              `      <label class="${ctx.css.classes('option')}">\n        <InputRadio class="${ctx.css.classes('checkbox')}" Value="@(${JSON.stringify(item.value)})" />\n        <span>${esc(item.label)}</span>\n      </label>`,
          )
          .join('\n')}\n    </div>\n  </InputRadioGroup>`,
        descriptionFor(node, ctx),
        `<ValidationMessage For="@(() => Model.${pascalMember(ctx.key)})" class="${ctx.css.classes('error')}" />`,
      ]
        .filter(Boolean)
        .join('\n  ')}\n</fieldset>`,
  },
}

export const checkboxGroupElement: ElementDefinition = {
  type: 'checkboxgroup',
  category: 'fields',
  label: 'Checkbox Group',
  description: 'Pick any number of options',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM9.8 15.6l-3.5-3.5 1.4-1.4 2.1 2.1 5.1-5.1 1.4 1.4z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Checkbox Group', items: structuredClone(defaultItems) },
  propertyPanel: commonFieldSections([{ kind: 'items', prop: 'items', label: 'Options' }]),
  export: {
    vue: (node, ctx) =>
      `<fieldset class="${ctx.css.classes('field')}">\n  ${[
        legend(node, ctx),
        `<div class="${ctx.css.classes('options')}">\n${items(node)
          .map(
            (item) =>
              `    <label class="${ctx.css.classes('option')}" for="${ctx.id}_${esc(item.value)}">\n      <input id="${ctx.id}_${esc(item.value)}" v-model="form.${ctx.path}" type="checkbox" class="${ctx.css.classes('checkbox')}" value="${esc(item.value)}" @change="touch('${ctx.path}')">\n      <span>${esc(item.label)}</span>\n    </label>`,
          )
          .join('\n')}\n  </div>`,
        descriptionFor(node, ctx),
        vueError(ctx),
      ]
        .filter(Boolean)
        .join('\n  ')}\n</fieldset>`,
    html: (node, ctx) =>
      `<fieldset class="${ctx.css.classes('field')}">\n  ${[
        legend(node, ctx),
        `<div class="${ctx.css.classes('options')}">\n${items(node)
          .map(
            (item) =>
              `    <label class="${ctx.css.classes('option')}" for="${ctx.id}_${esc(item.value)}">\n      <input id="${ctx.id}_${esc(item.value)}" type="checkbox" class="${ctx.css.classes('checkbox')}" value="${esc(item.value)}" data-fg-path="${ctx.path}" data-fg-kind="checks">\n      <span>${esc(item.label)}</span>\n    </label>`,
          )
          .join('\n')}\n  </div>`,
        descriptionFor(node, ctx),
        htmlError(ctx),
      ]
        .filter(Boolean)
        .join('\n  ')}\n</fieldset>`,
    react: (node, ctx) =>
      reactFieldWrap(
        [
          `<fieldset className="${ctx.css.classes('field')}">\n    ${legend(node, ctx, true)}\n    <div className="${ctx.css.classes('options')}">\n${items(node)
            .map(
              (item) =>
                `      <label className="${ctx.css.classes('option')}" htmlFor="${ctx.id}_${esc(item.value)}">\n        <input id="${ctx.id}_${esc(item.value)}" type="checkbox" className="${ctx.css.classes('checkbox')}" checked={form.${ctx.path}.includes('${esc(item.value)}')} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setField('${ctx.path}', e.target.checked ? [...form.${ctx.path}, '${esc(item.value)}'] : form.${ctx.path}.filter((v) => v !== '${esc(item.value)}')); touch('${ctx.path}') }} />\n        <span>${esc(item.label)}</span>\n      </label>`,
            )
            .join('\n')}\n    </div>\n  </fieldset>`,
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
      ),
    // Blazor has no built-in multi-checkbox binding; deferred (the walker
    // emits an "unsupported" comment in the generated file).
  },
}
