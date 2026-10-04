// Building blocks for element export emitters. Emitters are dumb string
// builders: class names come from the CSS adapter, logic from the target
// scaffold (REBUILD_PROMPT §7b).

import type { ElementNode } from '@formsgen/renderer'
import type { EmitCtx } from '../types'

export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function labelFor(node: ElementNode, ctx: EmitCtx): string {
  const text = esc(String(node.props['label'] ?? ''))
  const req = ctx.required
    ? `<span class="${ctx.css.classes('required')}" aria-hidden="true">*</span>`
    : ''
  return `<label class="${ctx.css.classes('label')}" for="${ctx.id}">${text}${req}</label>`
}

export function descriptionFor(node: ElementNode, ctx: EmitCtx): string {
  const d = node.props['description']
  if (typeof d !== 'string' || d === '') return ''
  return `<p class="${ctx.css.classes('description')}">${esc(d)}</p>`
}

export function vueError(ctx: EmitCtx): string {
  return `<p v-if="errors['${ctx.path}']" class="${ctx.css.classes('error')}" role="alert">{{ errors['${ctx.path}'] }}</p>`
}

export function htmlError(ctx: EmitCtx): string {
  return `<p id="fg_err_${ctx.key}" class="${ctx.css.classes('error')}" role="alert" hidden></p>`
}

/** Vue class binding adding the adapter's invalid class while errored. */
export function vueInvalid(ctx: EmitCtx): string {
  return ` :class="{ '${ctx.css.invalidClass()}': !!errors['${ctx.path}'] }"`
}

export function vueEvents(ctx: EmitCtx, change = false): string {
  const trigger = change ? '@change' : '@input'
  return ` @blur="touch('${ctx.path}')" ${trigger}="revalidate('${ctx.path}')"`
}

/** Static attributes marking a control for the HTML runtime. */
export function htmlDataAttrs(ctx: EmitCtx, kind: string): string {
  return ` data-fg-path="${ctx.path}" data-fg-kind="${kind}"`
}

export function placeholderAttr(node: ElementNode): string {
  const p = node.props['placeholder']
  return typeof p === 'string' && p !== '' ? ` placeholder="${esc(p)}"` : ''
}

export function fieldWrap(parts: (string | '')[], ctx: EmitCtx): string {
  const inner = parts.filter(Boolean).join('\n  ')
  return `<div class="${ctx.css.classes('field')}">\n  ${inner}\n</div>`
}
