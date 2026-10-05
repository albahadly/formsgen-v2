// Composite-value fields: two-handle range slider ({ from, to } numbers),
// date range ({ from, to } ISO dates) and multiple dates (sorted ISO date
// list). Emitters produce markup wired to conventional helper names that
// each target scaffold emits when the type is present: fgDualClamp /
// fgDualFill / fgDualFromOnTop (slider), fgAddDate / fgRemoveDate with a
// per-field draft store (dates); Blazor uses the FgRange / FgDateRange
// classes and FgDualSet / FgAddDate / FgChanged.

import { rangeBounds, rangeSliderDefault, type ElementNode } from '@formsgen/renderer'
import {
  blazorValidationMessage,
  descriptionFor,
  esc,
  fieldWrap,
  htmlError,
  labelFor,
  pascalMember,
  reactControlClass,
  reactDescription,
  reactError,
  reactFieldWrap,
  reactLabelFor,
  vueError,
  vueInvalid,
} from '../emitters/shared'
import { commonFieldSections, type ElementDefinition, type EmitCtx, type PanelSection } from '../types'
import { jsTemplate } from '@/export/announce'

const icon = (path: string): string =>
  `<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="${path}"/></svg>`

/** Field panel without the placeholder control (these controls have none). */
function panel(extra: Parameters<typeof commonFieldSections>[0] = []): PanelSection[] {
  return commonFieldSections(extra, ['hideLabel', 'align', 'className']).map((section) => ({
    ...section,
    controls: section.controls.filter((c) => !('prop' in c && c.prop === 'placeholder')),
  }))
}

const partLabel = (node: ElementNode, part: string): string => esc(`${String(node.props['label'] ?? '')}: ${part}`)

// ------------------------------------------------------------ range slider

function sliderAttrs(node: ElementNode): string {
  const { min, max, step } = rangeBounds(node)
  return ` min="${min}" max="${max}" step="${step}"`
}

const DUAL_TRACK_OPEN = '<div class="fg-dual">\n    <div class="fg-dual-track">'

export const rangeSliderElement: ElementDefinition = {
  type: 'rangeslider',
  category: 'fields',
  label: 'Range slider',
  description: 'Pick a low and a high value (two handles)',
  icon: icon('M3 11h3.2a3 3 0 0 1 5.6 0h.4a3 3 0 0 1 5.6 0H21v2h-3.2a3 3 0 0 1-5.6 0h-.4a3 3 0 0 1-5.6 0H3zm6 2a1 1 0 1 0-1-1 1 1 0 0 0 1 1zm6 0a1 1 0 1 0-1-1 1 1 0 0 0 1 1z'),
  hasValue: true,
  defaultProps: { label: 'Range', min: 0, max: 100, step: 1, defaultFrom: 20, defaultTo: 80 },
  propertyPanel: panel([
    { kind: 'number', prop: 'min', label: 'Min' },
    { kind: 'number', prop: 'max', label: 'Max' },
    { kind: 'number', prop: 'step', label: 'Step' },
    { kind: 'number', prop: 'defaultFrom', label: 'Initial low value' },
    { kind: 'number', prop: 'defaultTo', label: 'Initial high value' },
  ]),
  export: {
    vue: (node, ctx) => {
      const { min, max } = rangeBounds(node)
      const v = `form.${ctx.path}`
      const input = (side: 'from' | 'to', id: string, label: string, zIndex: string): string =>
        `<input id="${id}" type="range"${sliderAttrs(node)} :value="${v}.${side}" aria-label="${label}" :style="{ zIndex: ${zIndex} }" @input="fgDualSet(${v}, '${side}', $event)" @change="touch('${ctx.path}')">`
      return fieldWrap(
        [
          labelFor(node, ctx),
          `${DUAL_TRACK_OPEN}<div class="fg-dual-fill" :style="fgDualFill(${v}, ${min}, ${max})"></div></div>\n    ${input('from', ctx.id, partLabel(node, ctx.messages.rangeFrom), `fgDualFromOnTop(${v}, ${min}, ${max}) ? 3 : 1`)}\n    ${input('to', `${ctx.id}_to`, partLabel(node, ctx.messages.rangeTo), '2')}\n  </div>`,
          `<p class="${ctx.css.classes('description')}">{{ ${v}.from }} – {{ ${v}.to }}</p>`,
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        ctx,
      )
    },
    html: (node, ctx) => {
      const initial = rangeSliderDefault(node)
      const input = (side: 'from' | 'to', id: string, label: string): string =>
        `<input id="${id}" type="range"${sliderAttrs(node)} value="${initial[side]}" data-fg-path="${ctx.path}" data-fg-kind="range2" data-fg-part="${side}" aria-label="${label}">`
      return fieldWrap(
        [
          labelFor(node, ctx),
          `<div class="fg-dual" data-fg-dual="${ctx.path}">\n    <div class="fg-dual-track"><div class="fg-dual-fill" data-fg-dual-fill></div></div>\n    ${input('from', ctx.id, partLabel(node, ctx.messages.rangeFrom))}\n    ${input('to', `${ctx.id}_to`, partLabel(node, ctx.messages.rangeTo))}\n  </div>`,
          `<p class="${ctx.css.classes('description')}" data-fg-dual-text="${ctx.path}">${initial.from} – ${initial.to}</p>`,
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        ctx,
      )
    },
    react: (node, ctx) => {
      const { min, max } = rangeBounds(node)
      const v = `form.${ctx.path}`
      const input = (side: 'from' | 'to', id: string, label: string, zIndex: string): string =>
        `<input id="${id}" type="range"${sliderAttrs(node)} value={${v}.${side}} aria-label="${label}" style={{ zIndex: ${zIndex} }} onChange={(e: React.ChangeEvent<HTMLInputElement>) => fgDualChange('${ctx.path}', ${v}, '${side}', Number(e.target.value))} />`
      return reactFieldWrap(
        [
          reactLabelFor(node, ctx),
          `<div className="fg-dual">\n    <div className="fg-dual-track"><div className="fg-dual-fill" style={fgDualFill(${v}, ${min}, ${max})}></div></div>\n    ${input('from', ctx.id, partLabel(node, ctx.messages.rangeFrom), `fgDualFromOnTop(${v}, ${min}, ${max}) ? 3 : 1`)}\n    ${input('to', `${ctx.id}_to`, partLabel(node, ctx.messages.rangeTo), '2')}\n  </div>`,
          `<p className="${ctx.css.classes('description')}">{${v}.from} – {${v}.to}</p>`,
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
      )
    },
    blazor: (node, ctx) => {
      const { min, max } = rangeBounds(node)
      const m = `Model.${pascalMember(ctx.key)}`
      // Drawn from Shown* and re-created by Version (see FgRange in the target).
      const input = (side: 'From' | 'To', id: string, label: string, zIndex: string): string =>
        `<input @key='$"${side}{${m}.Version}"' @ref='fgDualRefs["${id}"]' id="${id}" type="range"${sliderAttrs(node)} value="@FgNum(${m}.Shown${side})" aria-label="${label}" style="z-index: ${zIndex}" @oninput='e => FgDualSet(${m}, ${side === 'From' ? 'true' : 'false'}, e, "${id}")' />`
      return fieldWrap(
        [
          labelFor(node, ctx),
          `${DUAL_TRACK_OPEN}<div class="fg-dual-fill" style="@FgDualFill(${m}, ${min}, ${max})"></div></div>\n    ${input('From', ctx.id, partLabel(node, ctx.messages.rangeFrom), `@(FgDualFromOnTop(${m}, ${min}, ${max}) ? 3 : 1)`)}\n    ${input('To', `${ctx.id}_to`, partLabel(node, ctx.messages.rangeTo), '2')}\n  </div>`,
          `<p class="${ctx.css.classes('description')}">@FgNum(${m}.From) – @FgNum(${m}.To)</p>`,
          descriptionFor(node, ctx),
          blazorValidationMessage(ctx),
        ],
        ctx,
      )
    },
  },
}

// -------------------------------------------------------------- date range

/** The dash between the two dates (an input-group text in Bootstrap). */
function separator(ctx: EmitCtx, attr: 'class' | 'className' = 'class'): string {
  const cls = ctx.css.classes('pairSeparator')
  return `<span${cls ? ` ${attr}="${cls}"` : ''} aria-hidden="true">–</span>`
}

export const dateRangeElement: ElementDefinition = {
  type: 'daterange',
  category: 'fields',
  label: 'Date range',
  description: 'Start and end dates',
  icon: icon('M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zM5 9h14v11H5zm2 3v2h4v-2zm6 0v2h4v-2zm-6 4v2h10v-2z'),
  hasValue: true,
  defaultProps: { label: 'Dates' },
  propertyPanel: panel(),
  export: {
    vue: (node, ctx) => {
      const v = `form.${ctx.path}`
      const input = (side: 'from' | 'to', id: string, label: string, extra = ''): string =>
        `<input id="${id}" v-model="${v}.${side}" type="date" class="${ctx.css.classes('input')}"${vueInvalid(ctx)}${extra} aria-label="${label}" @blur="touch('${ctx.path}')" @change="revalidate('${ctx.path}')">`
      return fieldWrap(
        [
          labelFor(node, ctx),
          `<div class="${ctx.css.classes('pair')}">\n    ${input('from', ctx.id, partLabel(node, ctx.messages.dateFrom))}\n    ${separator(ctx)}\n    ${input('to', `${ctx.id}_to`, partLabel(node, ctx.messages.dateTo), ` :min="${v}.from || undefined"`)}\n  </div>`,
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        ctx,
      )
    },
    html: (node, ctx) => {
      const input = (side: 'from' | 'to', id: string, label: string): string =>
        `<input id="${id}" type="date" class="${ctx.css.classes('input')}" data-fg-path="${ctx.path}" data-fg-kind="daterange" data-fg-part="${side}" aria-label="${label}">`
      return fieldWrap(
        [
          labelFor(node, ctx),
          `<div class="${ctx.css.classes('pair')}">\n    ${input('from', ctx.id, partLabel(node, ctx.messages.dateFrom))}\n    ${separator(ctx)}\n    ${input('to', `${ctx.id}_to`, partLabel(node, ctx.messages.dateTo))}\n  </div>`,
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        ctx,
      )
    },
    react: (node, ctx) => {
      const v = `form.${ctx.path}`
      const input = (side: 'from' | 'to', id: string, label: string, extra = ''): string =>
        `<input id="${id}" type="date" value={${v}.${side}} ${reactControlClass(ctx, 'input')}${extra} aria-label="${label}" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('${ctx.path}', { ...${v}, ${side}: e.target.value })} onBlur={() => touch('${ctx.path}')} />`
      return reactFieldWrap(
        [
          reactLabelFor(node, ctx),
          `<div className="${ctx.css.classes('pair')}">\n    ${input('from', ctx.id, partLabel(node, ctx.messages.dateFrom))}\n    ${separator(ctx, 'className')}\n    ${input('to', `${ctx.id}_to`, partLabel(node, ctx.messages.dateTo), ` min={${v}.from || undefined}`)}\n  </div>`,
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
      )
    },
    blazor: (node, ctx) => {
      const member = pascalMember(ctx.key)
      const m = `Model.${member}`
      const input = (side: 'From' | 'To', id: string, label: string, extra = ''): string =>
        // value + @onchange, not @bind: Razor binds type="date" as DateTime.
        `<input id="${id}" type="date" class="${ctx.css.classes('input')}"${extra} aria-label="${label}" value="@${m}.${side}" @onchange='e => FgSetDate(${m}, ${side === 'From' ? 'true' : 'false'}, e, "${member}")' />`
      return fieldWrap(
        [
          labelFor(node, ctx),
          `<div class="${ctx.css.classes('pair')}">\n    ${input('From', ctx.id, partLabel(node, ctx.messages.dateFrom))}\n    ${separator(ctx)}\n    ${input('To', `${ctx.id}_to`, partLabel(node, ctx.messages.dateTo), ` min="@${m}.From"`)}\n  </div>`,
          descriptionFor(node, ctx),
          blazorValidationMessage(ctx),
        ],
        ctx,
      )
    },
  },
}

// ---------------------------------------------------------- multiple dates

function addButton(ctx: EmitCtx, handler: string): string {
  return `<button type="button" class="${ctx.css.classes('pairButton')}" ${handler}>${esc(ctx.messages.addDate)}</button>`
}

export const datesElement: ElementDefinition = {
  type: 'dates',
  category: 'fields',
  label: 'Multiple dates',
  description: 'A list of dates (add one at a time)',
  icon: icon('M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7v-2H5V9h14v3h2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zm11 12v3h-3v2h3v3h2v-3h3v-2h-3v-3z'),
  hasValue: true,
  defaultProps: { label: 'Dates' },
  propertyPanel: panel(),
  export: {
    vue: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<div class="${ctx.css.classes('pair')}">\n    <input id="${ctx.id}" v-model="fgDateDrafts['${ctx.path}']" type="date" class="${ctx.css.classes('input')}"${vueInvalid(ctx)} @keydown.enter.prevent="fgAddDate('${ctx.path}')">\n    ${addButton(ctx, `@click="fgAddDate('${ctx.path}')"`)}\n  </div>`,
          `<div v-if="form.${ctx.path}.length" class="${ctx.css.classes('chipList')}">\n    <span v-for="(date, index) in form.${ctx.path}" :key="date" class="${ctx.css.classes('tag')}">{{ date }} <button type="button" class="${ctx.css.classes('tagRemove')}" :aria-label="${jsTemplate(ctx.messages.removeDate, { date: 'date' })}" @click="fgRemoveDate('${ctx.path}', index)">×</button></span>\n  </div>`,
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        ctx,
      ),
    html: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<div class="${ctx.css.classes('pair')}" data-fg-path="${ctx.path}" data-fg-kind="dates">\n    <input id="${ctx.id}" type="date" class="${ctx.css.classes('input')}" data-fg-dates-input="${ctx.path}">\n    ${addButton(ctx, `data-fg-dates-add="${ctx.path}"`)}\n  </div>`,
          `<div class="${ctx.css.classes('chipList')}" data-fg-dates-chips="${ctx.path}" hidden></div>`,
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        ctx,
      ),
    react: (node, ctx) =>
      reactFieldWrap(
        [
          reactLabelFor(node, ctx),
          `<div className="${ctx.css.classes('pair')}">\n    <input id="${ctx.id}" type="date" value={dateDrafts['${ctx.path}'] ?? ''} ${reactControlClass(ctx, 'input')} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateDrafts((d) => ({ ...d, '${ctx.path}': e.target.value }))} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); fgAddDate('${ctx.path}', form.${ctx.path}) } }} />\n    ${addButton(ctx, `onClick={() => fgAddDate('${ctx.path}', form.${ctx.path})}`).replace('class=', 'className=')}\n  </div>`,
          `{form.${ctx.path}.length > 0 && (\n    <div className="${ctx.css.classes('chipList')}">\n      {form.${ctx.path}.map((date, index) => (\n        <span key={date} className="${ctx.css.classes('tag')}">{date} <button type="button" className="${ctx.css.classes('tagRemove')}" aria-label={${jsTemplate(ctx.messages.removeDate, { date: 'date' })}} onClick={() => fgRemoveDate('${ctx.path}', form.${ctx.path}, index)}>×</button></span>\n      ))}\n    </div>\n  )}`,
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
          `<div class="${ctx.css.classes('pair')}">\n    <input id="${ctx.id}" type="date" class="${ctx.css.classes('input')}" value='@fgDateDrafts["${member}"]' @onchange='e => fgDateDrafts["${member}"] = Convert.ToString(e.Value) ?? ""' />\n    ${addButton(ctx, `@onclick='() => FgAddDate(${m}, "${member}")'`)}\n  </div>`,
          `@if (${m}.Count > 0)\n  {\n      <div class="${ctx.css.classes('chipList')}">\n          @foreach (var date in ${m}.ToList())\n          {\n              <span @key="date" class="${ctx.css.classes('tag')}">@date <button type="button" class="${ctx.css.classes('tagRemove')}" aria-label='@FgRemoveDateLabel(date)' @onclick='() => FgRemoveDate(${m}, date, "${member}")'>&times;</button></span>\n          }\n      </div>\n  }`,
          descriptionFor(node, ctx),
          blazorValidationMessage(ctx),
        ],
        ctx,
      )
    },
  },
}
