// Building blocks for element export emitters. Emitters are dumb string
// builders: class names come from the CSS adapter, logic from the target
// scaffold (REBUILD_PROMPT §7b).

import type { ElementNode } from '@formsgen/renderer'
import type { EmitCtx } from '../types'

/**
 * Escapes text for markup in every target. `@` becomes an entity too: in a
 * Razor file it would start C# code ("Follow @formsgen" would not compile).
 */
export const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/@/g, '&#64;')

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

// ---- React (JSX) helpers ----

export function reactFieldWrap(parts: (string | '')[], ctx: EmitCtx): string {
  const inner = parts.filter(Boolean).join('\n  ')
  return `<div className="${ctx.css.classes('field')}">\n  ${inner}\n</div>`
}

export function reactLabelFor(node: ElementNode, ctx: EmitCtx): string {
  const text = esc(String(node.props['label'] ?? ''))
  const req = ctx.required
    ? `<span className="${ctx.css.classes('required')}" aria-hidden="true">*</span>`
    : ''
  return `<label className="${ctx.css.classes('label')}" htmlFor="${ctx.id}">${text}${req}</label>`
}

export function reactDescription(node: ElementNode, ctx: EmitCtx): string {
  const d = node.props['description']
  if (typeof d !== 'string' || d === '') return ''
  return `<p className="${ctx.css.classes('description')}">${esc(d)}</p>`
}

export function reactError(ctx: EmitCtx): string {
  return `{errors['${ctx.path}'] && <p className="${ctx.css.classes('error')}" role="alert">{errors['${ctx.path}']}</p>}`
}

/** className expression switching to the invalid classes while errored. */
export function reactControlClass(
  ctx: EmitCtx,
  slot: 'input' | 'textarea' | 'select' | 'colorInput',
): string {
  const base = ctx.css.classes(slot)
  return `className={errors['${ctx.path}'] ? "${base} ${ctx.css.invalidClass()}" : "${base}"}`
}

export function reactEvents(ctx: EmitCtx, element: 'input' | 'textarea' = 'input'): string {
  const eventType = element === 'textarea' ? 'HTMLTextAreaElement' : 'HTMLInputElement'
  return ` onChange={(e: React.ChangeEvent<${eventType}>) => setField('${ctx.path}', e.target.value)} onBlur={() => touch('${ctx.path}')}`
}

// ---- Blazor (Razor) helpers ----

/** PascalCase model member from an identifier-safe key. */
export function pascalMember(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

export function blazorValidationMessage(ctx: EmitCtx): string {
  return `<ValidationMessage For="@(() => Model.${pascalMember(ctx.key)})" class="${ctx.css.classes('error')}" />`
}
