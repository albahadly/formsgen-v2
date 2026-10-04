// Factory for text-like input variants: same component, same panel, same
// emitters as `text` — only the HTML input type and palette metadata vary.

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
  reactEvents,
  reactFieldWrap,
  reactLabelFor,
  vueError,
  vueEvents,
  vueInvalid,
} from '../emitters/shared'
import { commonFieldSections, type ElementDefinition } from '../types'

export interface TextLikeConfig {
  type: string
  inputType: string
  label: string
  description: string
  icon: string
  defaultValidation?: ElementDefinition['defaultValidation']
  /** false: the control has no placeholder (e.g. a color picker). */
  placeholder?: boolean
  /** CSS slot for the control (default 'input'). */
  inputSlot?: 'input' | 'colorInput'
}

export function makeTextLikeElement(config: TextLikeConfig): ElementDefinition {
  const { type, inputType } = config
  const slot = config.inputSlot ?? 'input'
  const definition: ElementDefinition = {
    type,
    category: 'fields',
    label: config.label,
    description: config.description,
    icon: config.icon,
    hasValue: true,
    defaultProps: config.placeholder === false ? { label: config.label } : { label: config.label, placeholder: '' },
    propertyPanel:
      config.placeholder === false
        ? commonFieldSections().map((section) => ({
            ...section,
            controls: section.controls.filter((c) => !('prop' in c && c.prop === 'placeholder')),
          }))
        : commonFieldSections(),
    export: {
      vue: (node, ctx) =>
        fieldWrap(
          [
            labelFor(node, ctx),
            `<input id="${ctx.id}" v-model="form.${ctx.path}" type="${inputType}" class="${ctx.css.classes(slot)}"${vueInvalid(ctx)}${placeholderAttr(node)}${vueEvents(ctx)}>`,
            descriptionFor(node, ctx),
            vueError(ctx),
          ],
          ctx,
        ),
      html: (node, ctx) =>
        fieldWrap(
          [
            labelFor(node, ctx),
            `<input id="${ctx.id}" type="${inputType}" class="${ctx.css.classes(slot)}"${htmlDataAttrs(ctx, 'text')}${placeholderAttr(node)}>`,
            descriptionFor(node, ctx),
            htmlError(ctx),
          ],
          ctx,
        ),
      react: (node, ctx) =>
        reactFieldWrap(
          [
            reactLabelFor(node, ctx),
            `<input id="${ctx.id}" type="${inputType}" value={form.${ctx.path}} ${reactControlClass(ctx, slot)}${placeholderAttr(node)}${reactEvents(ctx)} />`,
            reactDescription(node, ctx),
            reactError(ctx),
          ],
          ctx,
        ),
      blazor: (node, ctx) =>
        fieldWrap(
          [
            labelFor(node, ctx),
            `<InputText id="${ctx.id}" type="${inputType}" @bind-Value="Model.${pascalMember(ctx.key)}" class="${ctx.css.classes(slot)}"${placeholderAttr(node)} />`,
            descriptionFor(node, ctx),
            `<ValidationMessage For="@(() => Model.${pascalMember(ctx.key)})" class="${ctx.css.classes('error')}" />`,
          ],
          ctx,
        ),
    },
  }
  if (config.defaultValidation) definition.defaultValidation = config.defaultValidation
  return definition
}
