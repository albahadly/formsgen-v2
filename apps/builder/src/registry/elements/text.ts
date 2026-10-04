import {
  blazorValidationMessage,
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
  reactEvents,
  reactFieldWrap,
  reactLabelFor,
  vueError,
  vueEvents,
  vueInvalid,
} from '../emitters/shared'
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
  export: {
    vue: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<input id="${ctx.id}" v-model="form.${ctx.path}" type="text" class="${ctx.css.classes('input')}"${vueInvalid(ctx)}${placeholderAttr(node)}${vueEvents(ctx)}>`,
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        ctx,
      ),
    html: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<input id="${ctx.id}" type="text" class="${ctx.css.classes('input')}"${htmlDataAttrs(ctx, 'text')}${placeholderAttr(node)}>`,
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        ctx,
      ),
    react: (node, ctx) =>
      reactFieldWrap(
        [
          reactLabelFor(node, ctx),
          `<input id="${ctx.id}" type="text" value={form.${ctx.path}} ${reactControlClass(ctx, 'input')}${placeholderAttr(node)}${reactEvents(ctx)} />`,
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
      ),
    blazor: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<InputText id="${ctx.id}" @bind-Value="Model.${pascalMember(ctx.key)}" class="${ctx.css.classes('input')}"${placeholderAttr(node)} />`,
          descriptionFor(node, ctx),
          blazorValidationMessage(ctx),
        ],
        ctx,
      ),
  },
}
