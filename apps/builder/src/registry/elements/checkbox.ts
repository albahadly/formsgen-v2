import {
  descriptionFor,
  esc,
  fieldWrap,
  htmlDataAttrs,
  htmlError,
  vueError,
} from '../emitters/shared'
import { commonFieldSections, type ElementDefinition, type EmitCtx } from '../types'
import type { ElementNode } from '@formsgen/renderer'

function checkboxLabel(node: ElementNode, ctx: EmitCtx): string {
  const text = esc(String(node.props['label'] ?? ''))
  const req = ctx.required
    ? `<span class="${ctx.css.classes('required')}" aria-hidden="true">*</span>`
    : ''
  return `<label class="${ctx.css.classes('checkboxLabel')}" for="${ctx.id}">${text}${req}</label>`
}

export const checkboxElement: ElementDefinition = {
  type: 'checkbox',
  category: 'fields',
  label: 'Checkbox',
  description: 'Single yes/no checkbox',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V5h14zm-9.2-3.4-3.5-3.5 1.4-1.4 2.1 2.1 5.1-5.1 1.4 1.4z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Checkbox' },
  propertyPanel: commonFieldSections([
    { kind: 'toggle', prop: 'default', label: 'Checked by default' },
  ]),
  export: {
    vue: (node, ctx) =>
      fieldWrap(
        [
          `<div class="${ctx.css.classes('checkboxWrap')}">\n    <input id="${ctx.id}" v-model="form.${ctx.path}" type="checkbox" class="${ctx.css.classes('checkbox')}" @change="touch('${ctx.path}')">\n    ${checkboxLabel(node, ctx)}\n  </div>`,
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        ctx,
      ),
    html: (node, ctx) =>
      fieldWrap(
        [
          `<div class="${ctx.css.classes('checkboxWrap')}">\n    <input id="${ctx.id}" type="checkbox" class="${ctx.css.classes('checkbox')}"${htmlDataAttrs(ctx, 'checkbox')}${node.props['default'] === true ? ' checked' : ''}>\n    ${checkboxLabel(node, ctx)}\n  </div>`,
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        ctx,
      ),
  },
}
