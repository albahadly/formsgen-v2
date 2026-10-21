// Currency: an amount (a number or null) typed into a text control that
// shows it with the form locale's separators once the field is left
// (export/money.ts carries the helpers each target calls); the currency sign
// sits before it as a prefix add-on.

import { currencyCode, currencySymbol, moneyDecimals, type ElementNode } from '@albahadly/formsgen-renderer'
import {
  affixDescribedBy,
  affixWrap,
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
  vueInvalid,
} from '../emitters/shared'
import { commonFieldSections, type ElementDefinition } from '../types'

/** The node with the currency sign as its prefix add-on (an author's own prefix wins). */
function signed(node: ElementNode): ElementNode {
  const own = node.props['prefix']
  if (typeof own === 'string' && own.trim() !== '') return node
  return { ...node, props: { ...node.props, prefix: currencySymbol(currencyCode(node)) } }
}

export const currencyElement: ElementDefinition = {
  type: 'currency',
  category: 'fields',
  label: 'Currency',
  description: 'An amount of money, formatted for the form’s language',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.9-9.1c-1.9-.5-2.5-.9-2.5-1.6 0-.8.8-1.3 2-1.3 1.3 0 1.8.6 1.9 1.5h1.7c-.1-1.4-.9-2.6-2.6-3V5h-2v1.5c-1.6.3-2.8 1.3-2.8 2.9 0 1.9 1.5 2.8 3.8 3.3 2 .5 2.4 1.2 2.4 1.9 0 .5-.4 1.4-2 1.4-1.5 0-2.1-.7-2.2-1.5H8.9c.1 1.8 1.4 2.8 3 3.1V19h2v-1.4c1.7-.3 3-1.3 3-3 0-2.3-2-3.1-4-3.7z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Amount', placeholder: '', currency: 'USD', decimals: 2 },
  propertyPanel: commonFieldSections([
    { kind: 'text', prop: 'currency', label: 'Currency code', hint: 'Three letters (ISO 4217): USD, EUR, GBP, OMR…' },
    { kind: 'number', prop: 'decimals', label: 'Decimals', min: 0, max: 4 },
    { kind: 'text', prop: 'suffix', label: 'Text after the field (e.g. per month)' },
  ]),
  export: {
    vue: (node, ctx) => {
      const s = signed(node)
      const d = moneyDecimals(node)
      return fieldWrap(
        [
          labelFor(node, ctx),
          affixWrap(
            s,
            ctx,
            `<input id="${ctx.id}" type="text" inputmode="decimal" autocomplete="off" class="${ctx.css.classes('input')}"${vueInvalid(ctx)}${placeholderAttr(node)}${affixDescribedBy(s, ctx)} :value="fgMoneyText('${ctx.path}', form.${ctx.path}, ${d})" @input="fgMoneyInput('${ctx.path}', $event, ${d})" @blur="fgMoneyBlur('${ctx.path}')">`,
          ),
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        ctx,
      )
    },
    html: (node, ctx) => {
      const s = signed(node)
      return fieldWrap(
        [
          labelFor(node, ctx),
          affixWrap(
            s,
            ctx,
            `<input id="${ctx.id}" type="text" inputmode="decimal" autocomplete="off" class="${ctx.css.classes('input')}"${htmlDataAttrs(ctx, 'currency')} data-fg-decimals="${moneyDecimals(node)}"${placeholderAttr(node)}${affixDescribedBy(s, ctx)}>`,
          ),
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        ctx,
      )
    },
    react: (node, ctx) => {
      const s = signed(node)
      const d = moneyDecimals(node)
      return reactFieldWrap(
        [
          reactLabelFor(node, ctx),
          affixWrap(
            s,
            ctx,
            `<input id="${ctx.id}" type="text" inputMode="decimal" autoComplete="off" value={fgMoneyText('${ctx.path}', form.${ctx.path}, ${d})} ${reactControlClass(ctx, 'input')}${placeholderAttr(node)}${affixDescribedBy(s, ctx)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => fgMoneyInput('${ctx.path}', e.target.value, ${d})} onBlur={() => fgMoneyBlur('${ctx.path}')} />`,
            true,
          ),
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
      )
    },
    blazor: (node, ctx) => {
      const s = signed(node)
      const m = pascalMember(ctx.key)
      const d = moneyDecimals(node)
      return fieldWrap(
        [
          labelFor(node, ctx),
          affixWrap(
            s,
            ctx,
            `<input id="${ctx.id}" type="text" inputmode="decimal" autocomplete="off" class="${ctx.css.classes('input')}"${placeholderAttr(node)}${affixDescribedBy(s, ctx)} value='@FgMoneyText("${m}", Model.${m}, ${d})' @oninput='e => Model.${m} = FgMoneyInput("${m}", e, ${d})' @onblur='() => FgMoneyBlur("${m}")' />`,
          ),
          descriptionFor(node, ctx),
          `<ValidationMessage For="@(() => Model.${m})" class="${ctx.css.classes('error')}" />`,
        ],
        ctx,
      )
    },
  },
}
