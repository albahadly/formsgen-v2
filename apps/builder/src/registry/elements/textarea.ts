import {
  descriptionFor,
  fieldWrap,
  htmlDataAttrs,
  htmlError,
  labelFor,
  placeholderAttr,
  vueError,
  vueEvents,
  vueInvalid,
} from '../emitters/shared'
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
  export: {
    vue: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<textarea id="${ctx.id}" v-model="form.${ctx.path}" class="${ctx.css.classes('textarea')}" rows="${Number(node.props['rows'] ?? 3)}"${vueInvalid(ctx)}${placeholderAttr(node)}${vueEvents(ctx)}></textarea>`,
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        ctx,
      ),
    html: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<textarea id="${ctx.id}" class="${ctx.css.classes('textarea')}" rows="${Number(node.props['rows'] ?? 3)}"${htmlDataAttrs(ctx, 'text')}${placeholderAttr(node)}></textarea>`,
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        ctx,
      ),
  },
}
