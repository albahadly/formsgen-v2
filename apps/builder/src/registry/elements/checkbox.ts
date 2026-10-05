import {
  descriptionFor,
  fieldWrap,
  htmlDataAttrs,
  htmlError,
  pascalMember,
  reactDescription,
  reactError,
  reactFieldWrap,
  vueError,
  textMarkup,
  tipFor,
} from '../emitters/shared'
import { commonFieldSections, type ElementDefinition, type EmitCtx } from '../types'
import type { ElementNode } from '@formsgen/renderer'

function checkboxLabel(node: ElementNode, ctx: EmitCtx, jsx = false): string {
  const text = textMarkup(node, ctx, 'label')
  const classAttr = jsx ? 'className' : 'class'
  const forAttr = jsx ? 'htmlFor' : 'for'
  const req = ctx.required
    ? `<span ${classAttr}="${ctx.css.classes('required')}" aria-hidden="true">*</span>`
    : ''
  return `<label ${classAttr}="${ctx.css.classes('checkboxLabel')}" ${forAttr}="${ctx.id}">${text}${req}</label>${tipFor(node, ctx, jsx)}`
}

interface CheckboxLikeConfig {
  type: string
  label: string
  description: string
  icon: string
  defaultLabel: string
  /** A toggle is a checkbox drawn (and announced) as a switch. */
  isSwitch: boolean
}

function makeCheckboxLike(config: CheckboxLikeConfig): ElementDefinition {
  const wrapSlot = config.isSwitch ? 'switchWrap' : 'checkboxWrap'
  const inputSlot = config.isSwitch ? 'switch' : 'checkbox'
  const role = config.isSwitch ? ' role="switch"' : ''
  return {
    type: config.type,
    category: 'fields',
    label: config.label,
    description: config.description,
    icon: config.icon,
    hasValue: true,
    defaultProps: { label: config.defaultLabel },
    propertyPanel: commonFieldSections([
      { kind: 'toggle', prop: 'default', label: config.isSwitch ? 'On by default' : 'Checked by default' },
    ], ['align', 'className']),
    export: {
      vue: (node, ctx) =>
        fieldWrap(
          [
            `<div class="${ctx.css.classes(wrapSlot)}">\n    <input id="${ctx.id}" v-model="form.${ctx.path}" type="checkbox"${role} class="${ctx.css.classes(inputSlot)}" @change="touch('${ctx.path}')">\n    ${checkboxLabel(node, ctx)}\n  </div>`,
            descriptionFor(node, ctx),
            vueError(ctx),
          ],
          ctx,
        ),
      html: (node, ctx) =>
        fieldWrap(
          [
            `<div class="${ctx.css.classes(wrapSlot)}">\n    <input id="${ctx.id}" type="checkbox"${role} class="${ctx.css.classes(inputSlot)}"${htmlDataAttrs(ctx, 'checkbox')}${node.props['default'] === true ? ' checked' : ''}>\n    ${checkboxLabel(node, ctx)}\n  </div>`,
            descriptionFor(node, ctx),
            htmlError(ctx),
          ],
          ctx,
        ),
      react: (node, ctx) =>
        reactFieldWrap(
          [
            `<div className="${ctx.css.classes(wrapSlot)}">\n    <input id="${ctx.id}" type="checkbox"${role} checked={form.${ctx.path}} className="${ctx.css.classes(inputSlot)}" onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setField('${ctx.path}', e.target.checked); touch('${ctx.path}') }} />\n    ${checkboxLabel(node, ctx, true)}\n  </div>`,
            reactDescription(node, ctx),
            reactError(ctx),
          ],
          ctx,
        ),
      blazor: (node, ctx) =>
        fieldWrap(
          [
            `<div class="${ctx.css.classes(wrapSlot)}">\n    <InputCheckbox id="${ctx.id}"${role} @bind-Value="Model.${pascalMember(ctx.key)}" class="${ctx.css.classes(inputSlot)}" />\n    ${checkboxLabel(node, ctx)}\n  </div>`,
            descriptionFor(node, ctx),
            `<ValidationMessage For="@(() => Model.${pascalMember(ctx.key)})" class="${ctx.css.classes('error')}" />`,
          ],
          ctx,
        ),
    },
  }
}

export const checkboxElement = makeCheckboxLike({
  type: 'checkbox',
  label: 'Checkbox',
  description: 'Single yes/no checkbox',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V5h14zm-9.2-3.4-3.5-3.5 1.4-1.4 2.1 2.1 5.1-5.1 1.4 1.4z"/></svg>',
  defaultLabel: 'Checkbox',
  isSwitch: false,
})

export const toggleElement = makeCheckboxLike({
  type: 'toggle',
  label: 'Toggle',
  description: 'On/off switch',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M17 7H7a5 5 0 0 0 0 10h10a5 5 0 0 0 0-10zm0 8a3 3 0 1 1 3-3 3 3 0 0 1-3 3z"/></svg>',
  defaultLabel: 'Toggle',
  isSwitch: true,
})
