// Phone with a country-code selector (props.countrySelect): a select of
// countries ("Oman (+968)", names in the form's language) beside the
// national number. The value stays one string, "+<code> <number>" ("" while
// no number is typed); the selected country lives in a per-field store
// (fgPhoneCountry) so it survives an empty number. Inside repeater items
// the store is keyed by each item's own path.

import { hasCountrySelect, initialPhoneCountry, phoneCountries, type ElementNode } from '@formsgen/renderer'
import {
  blazorValidationMessage,
  descriptionFor,
  esc,
  fieldWrap,
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
import type { ElementDefinition, EmitCtx, EmitterLang, PanelSection } from '../types'


function options(node: ElementNode, ctx: EmitCtx, html: boolean): string {
  const initial = initialPhoneCountry(node, ctx.locale)
  return phoneCountries(node, ctx.locale)
    .map(
      (c) =>
        `<option value="${c.code}"${html ? ` data-dial="${c.dial}"${c.code === initial ? ' selected' : ''}` : ''}>${esc(`${c.name} (+${c.dial})`)}</option>`,
    )
    .join('\n      ')
}

const telAttrs = (node: ElementNode): string => ` autocomplete="tel-national"${placeholderAttr(node)}`

function countryEmitters(): Record<EmitterLang, (node: ElementNode, ctx: EmitCtx) => string> {
  return {
    vue: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<div class="${ctx.css.classes('pair')}">\n    <select class="${ctx.css.classes('phoneCountry')}" aria-label="${esc(ctx.messages.countryCode)}" :value="fgPhoneCountryOf('${ctx.path}')" @change="fgPhoneSetCountry('${ctx.path}', $event)" @blur="touch('${ctx.path}')">\n      ${options(node, ctx, false)}\n    </select>\n    <input id="${ctx.id}" type="tel" class="${ctx.css.classes('input')}"${vueInvalid(ctx)}${telAttrs(node)} :value="fgPhoneNumber(form.${ctx.path}, fgPhoneCountryOf('${ctx.path}'))" @input="fgPhoneInput('${ctx.path}', $event)" @blur="touch('${ctx.path}')">\n  </div>`,
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        ctx,
      ),
    html: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<div class="${ctx.css.classes('pair')}">\n    <select class="${ctx.css.classes('phoneCountry')}" aria-label="${esc(ctx.messages.countryCode)}" data-fg-phone-country="${ctx.path}">\n      ${options(node, ctx, true)}\n    </select>\n    <input id="${ctx.id}" type="tel" class="${ctx.css.classes('input')}" data-fg-path="${ctx.path}" data-fg-kind="phone"${telAttrs(node)}>\n  </div>`,
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        ctx,
      ),
    react: (node, ctx) =>
      reactFieldWrap(
        [
          reactLabelFor(node, ctx),
          `<div className="${ctx.css.classes('pair')}">\n    <select className="${ctx.css.classes('phoneCountry')}" aria-label="${esc(ctx.messages.countryCode)}" value={fgPhoneCountryOf('${ctx.path}')} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => fgPhoneSetCountry('${ctx.path}', form.${ctx.path}, e.target.value)} onBlur={() => touch('${ctx.path}')}>\n      ${options(node, ctx, false)}\n    </select>\n    <input id="${ctx.id}" type="tel" ${reactControlClass(ctx, 'input')}${telAttrs(node).replace('autocomplete=', 'autoComplete=')} value={fgPhoneNumber(form.${ctx.path}, fgPhoneCountryOf('${ctx.path}'))} onChange={(e: React.ChangeEvent<HTMLInputElement>) => fgPhoneInput('${ctx.path}', e.target.value)} onBlur={() => touch('${ctx.path}')} />\n  </div>`,
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
      ),
    blazor: (node, ctx) => {
      const member = pascalMember(ctx.key)
      const m = `Model.${member}`
      return fieldWrap(
        [
          labelFor(node, ctx),
          // @onchange on the number (not per keystroke), like InputText.
          `<div class="${ctx.css.classes('pair')}">\n    <select class="${ctx.css.classes('phoneCountry')}" aria-label="${esc(ctx.messages.countryCode)}" value='@fgPhoneCountry["${member}"]' @onchange='e => { ${m} = FgPhoneSetCountry("${member}", ${m}, e); FgChanged("${member}"); }'>\n      ${options(node, ctx, false)}\n    </select>\n    <input id="${ctx.id}" type="tel" class="${ctx.css.classes('input')}"${telAttrs(node)} value='@FgPhoneNumber(${m}, fgPhoneCountry["${member}"])' @onchange='e => { ${m} = FgPhoneInput("${member}", e); FgChanged("${member}"); }' />\n  </div>`,
          descriptionFor(node, ctx),
          blazorValidationMessage(ctx),
        ],
        ctx,
      )
    },
  }
}

/** Adds the country selector (panel controls + emitters) to the phone element. */
export function withCountrySelect(base: ElementDefinition): ElementDefinition {
  const country = countryEmitters()
  const export_: ElementDefinition['export'] = {}
  for (const lang of ['vue', 'html', 'react', 'blazor'] as const) {
    const plain = base.export?.[lang]
    export_[lang] = (node, ctx) => (hasCountrySelect(node) ? country[lang](node, ctx) : (plain?.(node, ctx) ?? ''))
  }
  const propertyPanel: PanelSection[] = base.propertyPanel.map((section) =>
    section.title === 'Properties'
      ? {
          ...section,
          controls: [
            ...section.controls,
            { kind: 'toggle', prop: 'countrySelect', label: 'Country code selector' },
            { kind: 'country', prop: 'defaultCountry', label: 'Default country' },
            { kind: 'text', prop: 'countries', label: 'Only these countries (ISO codes, e.g. OM, AE, SA)', placeholder: 'OM, AE, SA' },
          ],
        }
      : section,
  )
  return { ...base, defaultProps: { ...base.defaultProps, defaultCountry: 'US' }, propertyPanel, export: export_ }
}

