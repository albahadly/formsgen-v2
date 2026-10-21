// Scores: a star rating (1..stars) and an NPS scale (0..10). Both are a
// number or null with radios underneath — the same markup in every target,
// styled by the shared SCORE_CSS (export/composite.ts, mirrored in the
// renderer stylesheet): stars in reverse DOM order so CSS fills up to the
// chosen one, NPS options in a row with the two end words below.

import { ratingStars, type ElementNode, type MessageCatalog } from '@formsgen/renderer'
import {
  blazorValidationMessage,
  descriptionFor,
  esc,
  htmlError,
  legendFor,
  pascalMember,
  reactDescription,
  reactError,
  reactFieldWrap,
  vueError,
} from '../emitters/shared'
import { commonFieldSections, type ElementDefinition, type EmitCtx, type EmitterLang } from '../types'

type InputFor = (n: number, id: string, inputClass: string) => string

const indent = (text: string, depth: number): string =>
  text
    .split('\n')
    .map((line) => '  '.repeat(depth) + line)
    .join('\n')

function endText(node: ElementNode, key: 'lowLabel' | 'highLabel', messages: MessageCatalog): string {
  const own = node.props[key]
  return typeof own === 'string' && own.trim() !== '' ? own : key === 'lowLabel' ? messages.npsLow : messages.npsHigh
}

/** The radios and their labels; for NPS the two end words too. */
function scoreMarkup(node: ElementNode, ctx: EmitCtx, lang: EmitterLang, inputFor: InputFor): string {
  const rating = node.type === 'rating'
  const stars = ratingStars(node)
  const values = rating ? Array.from({ length: stars }, (_, i) => stars - i) : Array.from({ length: 11 }, (_, i) => i)
  const classAttr = lang === 'react' ? 'className' : 'class'
  const forAttr = lang === 'react' ? 'htmlFor' : 'for'
  const srOnly = ctx.css.classes('srOnly')
  const options = values.map((n) => {
    const id = `${ctx.id}-${n}`
    const input = inputFor(n, id, srOnly)
    const label = rating
      ? `<label ${classAttr}="fg-rating-star" ${forAttr}="${id}"><span ${classAttr}="${srOnly}">${n}</span></label>`
      : `<label ${classAttr}="fg-nps-option" ${forAttr}="${id}">${n}</label>`
    return `${input}\n${label}`
  })
  const group = `<div ${classAttr}="${rating ? 'fg-rating' : 'fg-nps'}">\n${indent(options.join('\n'), 1)}\n</div>`
  if (rating) return group
  const ends = `<div ${classAttr}="fg-nps-ends" aria-hidden="true"><span>${esc(endText(node, 'lowLabel', ctx.messages))}</span><span>${esc(endText(node, 'highLabel', ctx.messages))}</span></div>`
  return `${group}\n${ends}`
}

function fieldset(parts: string[], classAttr: 'class' | 'className', ctx: EmitCtx): string {
  const labelledBy = parts.some((p) => p.includes(`id="${ctx.id}-legend"`)) ? ` aria-labelledby="${ctx.id}-legend"` : ''
  return `<fieldset ${classAttr}="${ctx.css.classes('field')}"${labelledBy}>\n  ${parts
    .filter(Boolean)
    .map((part) => part.split('\n').join('\n  '))
    .join('\n  ')}\n</fieldset>`
}

function exportFor(): NonNullable<ElementDefinition['export']> {
  return {
    vue: (node, ctx) =>
      fieldset(
        [
          legendFor(node, ctx),
          scoreMarkup(node, ctx, 'vue', (n, id, cls) => `<input id="${id}" v-model="form.${ctx.path}" type="radio" class="${cls}" :value="${n}" @change="touch('${ctx.path}')">`),
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        'class',
        ctx,
      ),
    html: (node, ctx) =>
      fieldset(
        [
          legendFor(node, ctx),
          scoreMarkup(node, ctx, 'html', (n, id, cls) => `<input id="${id}" type="radio" name="${ctx.key}" class="${cls}" value="${n}" data-fg-path="${ctx.path}" data-fg-kind="score">`),
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
              legendFor(node, ctx, true),
              scoreMarkup(node, ctx, 'react', (n, id, cls) => `<input id="${id}" type="radio" className="${cls}" checked={form.${ctx.path} === ${n}} onChange={() => { setField('${ctx.path}', ${n}); touch('${ctx.path}') }} />`),
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
          legendFor(node, ctx),
          `<InputRadioGroup Name="${ctx.id}" @bind-Value="Model.${pascalMember(ctx.key)}">\n${indent(
            scoreMarkup(node, ctx, 'blazor', (n, id, cls) => `<InputRadio id="${id}" class="${cls}" Value="@((double?)${n})" />`),
            1,
          )}\n</InputRadioGroup>`,
          descriptionFor(node, ctx),
          blazorValidationMessage(ctx),
        ],
        'class',
        ctx,
      ),
  }
}

export const ratingElement: ElementDefinition = {
  type: 'rating',
  category: 'fields',
  label: 'Star rating',
  description: 'Pick a number of stars',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Rating', max: 5 },
  propertyPanel: commonFieldSections([{ kind: 'number', prop: 'max', label: 'Number of stars', min: 3, max: 10 }], ['hideLabel', 'align', 'className']),
  export: exportFor(),
}

export const npsElement: ElementDefinition = {
  type: 'nps',
  category: 'fields',
  label: 'NPS scale',
  description: 'A 0–10 scale with the two ends labelled',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M3 10h3v4H3zm4.5 0h3v4h-3zM12 10h3v4h-3zm4.5 0h3v4h-3zM2 7h20v1H2zm0 9h20v1H2z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'How likely are you to recommend us?' },
  propertyPanel: commonFieldSections(
    [
      { kind: 'text', prop: 'lowLabel', label: 'Label at the low end', placeholder: 'Not likely' },
      { kind: 'text', prop: 'highLabel', label: 'Label at the high end', placeholder: 'Very likely' },
    ],
    ['hideLabel', 'align', 'className'],
  ),
  export: exportFor(),
}
