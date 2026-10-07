// Choice groups: radio-group (single string value) and checkbox-group
// (string[] value). Options render per item; the HTML runtime reads them
// via dedicated kinds ('radio' / 'checks'). props.display picks a plain
// list, bordered blocks or a segmented button row.

import { choiceDisplay, type ElementNode } from '@formsgen/renderer'
import {
  blazorValidationMessage,
  descriptionFor,
  esc,
  htmlError,
  pascalMember,
  reactDescription,
  reactError,
  reactFieldWrap,
  vueError,
  legendFor,
} from '../emitters/shared'
import type { Slot } from '@/export/css/types'
import {
  commonFieldSections,
  type ElementDefinition,
  type EmitCtx,
  type EmitterLang,
} from '../types'

interface Item {
  value: string
  label: string
}

function items(node: ElementNode): Item[] {
  const raw = node.props['items']
  return Array.isArray(raw) ? (raw as Item[]) : []
}

function legend(node: ElementNode, ctx: EmitCtx, jsx = false): string {
  return legendFor(node, ctx, jsx)
}

const defaultItems: Item[] = [
  { value: 'option_1', label: 'Option 1' },
  { value: 'option_2', label: 'Option 2' },
]

const DISPLAY_SLOTS: Record<'list' | 'blocks' | 'buttons', [Slot, Slot, Slot]> = {
  list: ['options', 'option', 'checkbox'],
  blocks: ['optionsBlocks', 'optionBlock', 'optionBlockInput'],
  buttons: ['optionsButtons', 'optionButton', 'optionButtonInput'],
}

/** Builds one option's input element for a target language. */
type InputFor = (item: Item, id: string, inputClass: string) => string

function indent(text: string, depth: number): string {
  const pad = '  '.repeat(depth)
  return text
    .split('\n')
    .map((line) => pad + line)
    .join('\n')
}

/** The options container with every option, in the display's markup. */
function optionsMarkup(node: ElementNode, ctx: EmitCtx, lang: EmitterLang, inputFor: InputFor): string {
  const display = choiceDisplay(node)
  const [containerSlot, optionSlot, inputSlot] = DISPLAY_SLOTS[display]
  const classAttr = lang === 'react' ? 'className' : 'class'
  const forAttr = lang === 'react' ? 'htmlFor' : 'for'
  // The plain list always nests; blocks/buttons follow the framework.
  const layout = display === 'list' ? 'wrap' : ctx.css.choiceLayout(display)
  const options = items(node).map((item) => {
    const id = `${ctx.id}-${esc(item.value)}`
    const input = inputFor(item, id, ctx.css.classes(inputSlot))
    const labelOpen = `<label ${classAttr}="${ctx.css.classes(optionSlot)}" ${forAttr}="${id}">`
    return layout === 'wrap'
      ? `${labelOpen}\n  ${input}\n  <span>${esc(item.label)}</span>\n</label>`
      : `${input}\n${labelOpen}${esc(item.label)}</label>`
  })
  return `<div ${classAttr}="${ctx.css.classes(containerSlot)}">\n${indent(options.join('\n'), 1)}\n</div>`
}

function fieldset(parts: string[], classAttr: 'class' | 'className', ctx: EmitCtx): string {
  // A legend with a tooltip names the group by its text span only.
  const labelledBy = parts.some((p) => p.includes(`id="${ctx.id}-legend"`)) ? ` aria-labelledby="${ctx.id}-legend"` : ''
  return `<fieldset ${classAttr}="${ctx.css.classes('field')}"${labelledBy}>\n  ${parts
    .filter(Boolean)
    .map((part) => part.split('\n').join('\n  '))
    .join('\n  ')}\n</fieldset>`
}

const DISPLAY_CONTROL = {
  kind: 'select',
  prop: 'display',
  label: 'Display',
  options: [
    { value: 'list', label: 'List' },
    { value: 'blocks', label: 'Blocks' },
    { value: 'buttons', label: 'Buttons' },
  ],
} as const

function choicePanel() {
  return commonFieldSections(
    [{ kind: 'items', prop: 'items', label: 'Options' }, { ...DISPLAY_CONTROL, options: [...DISPLAY_CONTROL.options] }],
    ['hideLabel', 'align', 'className'],
  )
}

export const radioGroupElement: ElementDefinition = {
  type: 'radiogroup',
  category: 'fields',
  label: 'Radio Group',
  description: 'Pick one option',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-13a5 5 0 1 0 5 5 5 5 0 0 0-5-5z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Radio Group', items: structuredClone(defaultItems) },
  propertyPanel: choicePanel(),
  export: {
    vue: (node, ctx) =>
      fieldset(
        [
          legend(node, ctx),
          optionsMarkup(node, ctx, 'vue', (item, id, cls) =>
            `<input id="${id}" v-model="form.${ctx.path}" type="radio" class="${cls}" value="${esc(item.value)}" @change="touch('${ctx.path}')">`,
          ),
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        'class',
        ctx,
      ),
    html: (node, ctx) =>
      fieldset(
        [
          legend(node, ctx),
          optionsMarkup(node, ctx, 'html', (item, id, cls) =>
            `<input id="${id}" type="radio" name="${ctx.key}" class="${cls}" value="${esc(item.value)}" data-fg-path="${ctx.path}" data-fg-kind="radio">`,
          ),
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        'class',
        ctx,
      ),
    react: (node, ctx) =>
      reactFieldWrap(
        [
          fieldset(
            [
              legend(node, ctx, true),
              optionsMarkup(node, ctx, 'react', (item, id, cls) =>
                `<input id="${id}" type="radio" className="${cls}" checked={form.${ctx.path} === '${esc(item.value)}'} onChange={() => { setField('${ctx.path}', '${esc(item.value)}'); touch('${ctx.path}') }} />`,
              ),
            ],
            'className',
            ctx,
          ),
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
      ),
    blazor: (node, ctx) =>
      fieldset(
        [
          legend(node, ctx),
          // An explicit Name: the default comes from the bound expression, so
          // every repeater item's group would share one (`item.Plan`).
          `<InputRadioGroup Name="${ctx.id}" @bind-Value="Model.${pascalMember(ctx.key)}">\n${indent(
            optionsMarkup(node, ctx, 'blazor', (item, id, cls) =>
              `<InputRadio id="${id}" class="${cls}" Value="@(${JSON.stringify(item.value)})" />`,
            ),
            1,
          )}\n</InputRadioGroup>`,
          descriptionFor(node, ctx),
          `<ValidationMessage For="@(() => Model.${pascalMember(ctx.key)})" class="${ctx.css.classes('error')}" />`,
        ],
        'class',
        ctx,
      ),
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
  propertyPanel: choicePanel(),
  export: {
    vue: (node, ctx) =>
      fieldset(
        [
          legend(node, ctx),
          optionsMarkup(node, ctx, 'vue', (item, id, cls) =>
            `<input id="${id}" v-model="form.${ctx.path}" type="checkbox" class="${cls}" value="${esc(item.value)}" @change="touch('${ctx.path}')">`,
          ),
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        'class',
        ctx,
      ),
    html: (node, ctx) =>
      fieldset(
        [
          legend(node, ctx),
          optionsMarkup(node, ctx, 'html', (item, id, cls) =>
            `<input id="${id}" type="checkbox" class="${cls}" value="${esc(item.value)}" data-fg-path="${ctx.path}" data-fg-kind="checks">`,
          ),
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        'class',
        ctx,
      ),
    react: (node, ctx) =>
      reactFieldWrap(
        [
          fieldset(
            [
              legend(node, ctx, true),
              optionsMarkup(node, ctx, 'react', (item, id, cls) =>
                `<input id="${id}" type="checkbox" className="${cls}" checked={form.${ctx.path}.includes('${esc(item.value)}')} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setField('${ctx.path}', e.target.checked ? [...form.${ctx.path}, '${esc(item.value)}'] : form.${ctx.path}.filter((v) => v !== '${esc(item.value)}')); touch('${ctx.path}') }} />`,
              ),
            ],
            'className',
            ctx,
          ),
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
      ),
    // Blazor has no built-in multi-checkbox binding — plain inputs call the
    // generated FgToggle(list, value, e) helper (single-quoted attributes
    // so the C# string literals survive).
    blazor: (node, ctx) =>
      fieldset(
        [
          legend(node, ctx),
          optionsMarkup(node, ctx, 'blazor', (item, id, cls) =>
            `<input id="${id}" type="checkbox" class="${cls}" checked='@Model.${pascalMember(ctx.key)}.Contains(${JSON.stringify(item.value)})' @onchange='e => FgToggle(Model.${pascalMember(ctx.key)}, ${JSON.stringify(item.value)}, e)' />`,
          ),
          descriptionFor(node, ctx),
          blazorValidationMessage(ctx),
        ],
        'class',
        ctx,
      ),
  },
}
