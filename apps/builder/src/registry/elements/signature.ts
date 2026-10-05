// Signature: draw on a pad or type a name; the value is one PNG file
// (signature.png), sent like an upload. The pads are run by a script wired
// on the form root (export/signature.ts); Blazor's calls back into .NET.

import type { ElementNode } from '@formsgen/renderer'
import { blazorValidationMessage, descriptionFor, esc, legendFor, pascalMember, reactDescription, reactError, vueError, htmlError } from '../emitters/shared'
import { commonFieldSections, type ElementDefinition, type EmitCtx, type EmitterLang } from '../types'
import { signatureHeight, signatureTyping } from '@/export/signature'

function pad(node: ElementNode, ctx: EmitCtx, lang: EmitterLang): string {
  const c = lang === 'react' ? 'className' : 'class'
  const m = ctx.messages
  const style = lang === 'react' ? `style={{ height: '${signatureHeight(node)}px' }}` : `style="height: ${signatureHeight(node)}px"`
  // The pad's value key: the field path (JS targets) or the Blazor field key.
  const key =
    lang === 'blazor'
      ? `data-fg-signature='@FgSignKey(Model.${pascalMember(ctx.key)}, "${pascalMember(ctx.key)}")'`
      : `data-fg-signature="${ctx.path}"`
  const html = lang === 'html' ? ` data-fg-path="${ctx.path}" data-fg-kind="signature"` : ''
  const typed = signatureTyping(node)
    ? `\n    <input type="text" ${c}="${ctx.css.classes('input')}" placeholder="${esc(m.signatureType)}" aria-label="${esc(m.signatureType)}" data-fg-sign-type${lang === 'react' ? ' />' : '>'}`
    : ''
  const clear = esc(m.signatureClear)
  return `<div ${c}="${ctx.css.classes('signature')}" data-fg-sign>
  <canvas id="${ctx.id}" ${c}="${ctx.css.classes('signaturePad')}" ${style} role="img" aria-label="${esc(m.signatureDraw)}" ${key}${html}></canvas>
  <div ${c}="${ctx.css.classes('signatureRow')}">${typed}
    <button type="button" ${c}="${ctx.css.classes('buttonSecondary')}" data-fg-sign-clear>${lang === 'blazor' ? clear.replace(/@/g, '&#64;') : clear}</button>
  </div>
</div>`
}

function fieldset(parts: string[], lang: EmitterLang, ctx: EmitCtx): string {
  const c = lang === 'react' ? 'className' : 'class'
  const labelledBy = parts.some((p) => p.includes(`id="${ctx.id}_legend"`)) ? ` aria-labelledby="${ctx.id}_legend"` : ''
  return `<fieldset ${c}="${ctx.css.classes('field')}"${labelledBy}>\n  ${parts
    .filter(Boolean)
    .map((part) => part.split('\n').join('\n  '))
    .join('\n  ')}\n</fieldset>`
}

export const signatureElement: ElementDefinition = {
  type: 'signature',
  category: 'fields',
  label: 'Signature',
  description: 'Draw or type a signature',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M3 17.25V21h3.75l11-11.03-3.75-3.75zM20.7 7.04a1 1 0 0 0 0-1.41l-2.33-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75zM3 22h18v1H3z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Signature', typing: true, height: 160 },
  propertyPanel: commonFieldSections(
    [
      { kind: 'toggle', prop: 'typing', label: 'Let people type their name instead' },
      { kind: 'number', prop: 'height', label: 'Pad height (px)', min: 80, max: 400 },
    ],
    ['hideLabel', 'align', 'className'],
  ).map((section) => ({
    ...section,
    controls: section.controls.filter((control) => !('prop' in control && control.prop === 'placeholder')),
  })),
  export: {
    vue: (node, ctx) => fieldset([legendFor(node, ctx), pad(node, ctx, 'vue'), descriptionFor(node, ctx), vueError(ctx)], 'vue', ctx),
    html: (node, ctx) => fieldset([legendFor(node, ctx), pad(node, ctx, 'html'), descriptionFor(node, ctx), htmlError(ctx)], 'html', ctx),
    react: (node, ctx) => fieldset([legendFor(node, ctx, true), pad(node, ctx, 'react'), reactDescription(node, ctx), reactError(ctx)], 'react', ctx),
    blazor: (node, ctx) =>
      fieldset([legendFor(node, ctx), pad(node, ctx, 'blazor'), descriptionFor(node, ctx), blazorValidationMessage(ctx)], 'blazor', ctx),
  },
}
