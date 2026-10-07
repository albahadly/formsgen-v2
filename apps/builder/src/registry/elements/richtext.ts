// Rich text: a contenteditable editor with a toolbar; the value is cleaned
// HTML (see the renderer's richAnswer.ts). The editors are run by a script
// wired on the form root (export/richAnswer.ts); Blazor's calls back into
// .NET with each change.

import type { ElementNode } from '@formsgen/renderer'
import { blazorValidationMessage, descriptionFor, esc, pascalMember, reactDescription, reactError, textMarkup, vueError, htmlError } from '../emitters/shared'
import { commonFieldSections, type ElementDefinition, type EmitCtx, type EmitterLang } from '../types'

const BUTTONS: [command: string, key: 'richBold' | 'richItalic' | 'richBullets' | 'richNumbers' | 'richLink', face: string][] = [
  ['bold', 'richBold', '<b>B</b>'],
  ['italic', 'richItalic', '<i>I</i>'],
  ['insertUnorderedList', 'richBullets', '•'],
  ['insertOrderedList', 'richNumbers', '<span dir="ltr">1.</span>'],
  ['link', 'richLink', '🔗'],
]

function editor(node: ElementNode, ctx: EmitCtx, lang: EmitterLang): string {
  const c = lang === 'react' ? 'className' : 'class'
  const m = ctx.messages
  // One tab stop for the toolbar (the first button to begin with); the
  // script moves it with the arrow keys (export/richAnswer.ts).
  const tabindex = (i: number): string => (lang === 'react' ? `tabIndex={${i === 0 ? 0 : -1}}` : `tabindex="${i === 0 ? 0 : -1}"`)
  const buttons = BUTTONS.map(
    ([command, key, face], i) =>
      `<button type="button" ${c}="${ctx.css.classes('richtextButton')}" aria-label="${esc(m[key])}" title="${esc(m[key])}" data-fg-rt-cmd="${command}" ${tabindex(i)}>${face}</button>`,
  ).join('\n    ')
  const member = pascalMember(ctx.key)
  const value =
    lang === 'blazor'
      ? `data-fg-richtext='@FgRichKey("${member}", v => Model.${member} = v, Model.${member})'`
      : `data-fg-richtext="${ctx.path}"`
  const extra =
    lang === 'html'
      ? ` data-fg-path="${ctx.path}" data-fg-kind="richtext"`
      : lang === 'vue'
        ? ` @blur="touch('${ctx.path}')"`
        : lang === 'react'
          ? ` onBlur={() => touch('${ctx.path}')}`
          : ''
  const editable = lang === 'react' ? 'contentEditable' : 'contenteditable="true"'
  return `<div ${c}="${ctx.css.classes('richtext')}" data-fg-rich>
  <div ${c}="${ctx.css.classes('richtextToolbar')}" role="toolbar" aria-label="${esc(m.richToolbar)}" aria-controls="${ctx.id}">
    ${buttons}
  </div>
  <div id="${ctx.id}" ${c}="${ctx.css.classes('richtextEditor')}" ${editable} role="textbox" aria-multiline="true" aria-labelledby="${ctx.id}-label"${ctx.required ? ' aria-required="true"' : ''} ${value}${extra}></div>
</div>`
}

/** The visible label (a span: an editable div can't be the target of <label for>). */
function label(node: ElementNode, ctx: EmitCtx, lang: EmitterLang): string {
  const c = lang === 'react' ? 'className' : 'class'
  const req = ctx.required ? `<span ${c}="${ctx.css.classes('required')}" aria-hidden="true">*</span>` : ''
  return `<div ${c}="${ctx.css.classes('label')}"><span id="${ctx.id}-label">${textMarkup(node, ctx, 'label')}</span>${req}</div>`
}

function wrap(parts: string[], lang: EmitterLang, ctx: EmitCtx): string {
  const c = lang === 'react' ? 'className' : 'class'
  return `<div ${c}="${ctx.css.classes('field')}">\n  ${parts
    .filter(Boolean)
    .map((part) => part.split('\n').join('\n  '))
    .join('\n  ')}\n</div>`
}

export const richTextElement: ElementDefinition = {
  type: 'richtext',
  category: 'fields',
  label: 'Rich text',
  description: 'Formatted answer (bold, lists, links)',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M5 4v3h5.5v12h3V7H19V4zM3 21h18v-1H3z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Tell us more' },
  propertyPanel: commonFieldSections([], ['hideLabel', 'align', 'className']).map((section) => ({
    ...section,
    controls: section.controls.filter((control) => !('prop' in control && control.prop === 'placeholder')),
  })),
  export: {
    vue: (node, ctx) => wrap([label(node, ctx, 'vue'), editor(node, ctx, 'vue'), descriptionFor(node, ctx), vueError(ctx)], 'vue', ctx),
    html: (node, ctx) => wrap([label(node, ctx, 'html'), editor(node, ctx, 'html'), descriptionFor(node, ctx), htmlError(ctx)], 'html', ctx),
    react: (node, ctx) => wrap([label(node, ctx, 'react'), editor(node, ctx, 'react'), reactDescription(node, ctx), reactError(ctx)], 'react', ctx),
    blazor: (node, ctx) =>
      wrap([label(node, ctx, 'blazor'), editor(node, ctx, 'blazor'), descriptionFor(node, ctx), blazorValidationMessage(ctx)], 'blazor', ctx),
  },
}
