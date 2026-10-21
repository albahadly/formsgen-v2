// Address: a text input whose datalist fills with suggestions from a
// provider as people type (export/money.ts: fgWireSuggest reads the
// data-fg-suggest attributes). The value is the text, picked or typed.

import { suggestMinChars, suggestUrl, type ElementNode } from '@albahadly/formsgen-renderer'
import {
  affixDescribedBy,
  affixWrap,
  descriptionFor,
  esc,
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
import { AFFIX_CONTROLS, commonFieldSections, type ElementDefinition, type EmitCtx } from '../types'

/** The datalist link and the provider settings the shared script reads. */
function suggestAttrs(node: ElementNode, ctx: EmitCtx, jsx = false): string {
  return ` list="${ctx.id}-list" ${jsx ? 'autoComplete' : 'autocomplete'}="off" data-fg-suggest="${esc(suggestUrl(node))}" data-fg-suggest-min="${suggestMinChars(node)}"`
}
const datalist = (ctx: EmitCtx): string => `<datalist id="${ctx.id}-list"></datalist>`

export const addressElement: ElementDefinition = {
  type: 'address',
  category: 'fields',
  label: 'Address',
  description: 'Text with address suggestions as you type',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Address', placeholder: '' },
  propertyPanel: commonFieldSections([
    ...AFFIX_CONTROLS,
    { kind: 'text', prop: 'suggestUrl', label: 'Suggestions URL', hint: '{q} stands for the typed text; empty = OpenStreetMap (Nominatim)' },
    { kind: 'number', prop: 'minChars', label: 'Letters before suggesting', min: 1, max: 10 },
  ]),
  export: {
    vue: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          affixWrap(
            node,
            ctx,
            `<input id="${ctx.id}" v-model="form.${ctx.path}" type="text" class="${ctx.css.classes('input')}"${vueInvalid(ctx)}${placeholderAttr(node)}${affixDescribedBy(node, ctx)}${suggestAttrs(node, ctx)}${vueEvents(ctx)}>`,
          ),
          datalist(ctx),
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        ctx,
      ),
    html: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          affixWrap(
            node,
            ctx,
            `<input id="${ctx.id}" type="text" class="${ctx.css.classes('input')}"${htmlDataAttrs(ctx, 'text')}${placeholderAttr(node)}${affixDescribedBy(node, ctx)}${suggestAttrs(node, ctx)}>`,
          ),
          datalist(ctx),
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        ctx,
      ),
    react: (node, ctx) =>
      reactFieldWrap(
        [
          reactLabelFor(node, ctx),
          affixWrap(
            node,
            ctx,
            `<input id="${ctx.id}" type="text" value={form.${ctx.path}} ${reactControlClass(ctx, 'input')}${placeholderAttr(node)}${affixDescribedBy(node, ctx)}${suggestAttrs(node, ctx, true)}${reactEvents(ctx)} />`,
            true,
          ),
          datalist(ctx),
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
      ),
    blazor: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          affixWrap(
            node,
            ctx,
            `<InputText id="${ctx.id}" @bind-Value="Model.${pascalMember(ctx.key)}" class="${ctx.css.classes('input')}"${placeholderAttr(node)}${affixDescribedBy(node, ctx)}${suggestAttrs(node, ctx)} />`,
          ),
          datalist(ctx),
          descriptionFor(node, ctx),
          `<ValidationMessage For="@(() => Model.${pascalMember(ctx.key)})" class="${ctx.css.classes('error')}" />`,
        ],
        ctx,
      ),
  },
}
