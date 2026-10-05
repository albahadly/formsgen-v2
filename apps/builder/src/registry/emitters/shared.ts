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

/** A non-empty string prop, else null (tooltip, prefix, suffix). */
export function textProp(node: ElementNode, key: string): string | null {
  const v = node.props[key]
  return typeof v === 'string' && v.trim() !== '' ? v : null
}

/**
 * Help tooltip markup: a "?" button described by the tip text, shown on
 * hover/focus by framework-neutral CSS (fg-tip*). Empty without a tooltip.
 */
export function tipFor(node: ElementNode, ctx: EmitCtx, jsx = false): string {
  const text = textProp(node, 'tooltip')
  if (!text) return ''
  const c = jsx ? 'className' : 'class'
  return `<span ${c}="fg-tip"><button type="button" ${c}="fg-tip-button" aria-label="${esc(ctx.messages.moreInfo)}" aria-describedby="${ctx.id}_tip">?</button><span role="tooltip" id="${ctx.id}_tip" ${c}="fg-tip-text">${esc(text)}</span></span>`
}

/** A label, wrapped in a row with the tooltip beside it when there is one. */
function withTip(label: string, node: ElementNode, ctx: EmitCtx, jsx: boolean): string {
  const tip = tipFor(node, ctx, jsx)
  return tip ? `<div ${jsx ? 'className' : 'class'}="fg-label-row">${label}${tip}</div>` : label
}

/**
 * A fieldset legend: label text (in an id'd span the fieldset can point to
 * with aria-labelledby, so a tooltip stays out of the group's name), the
 * required mark and the tooltip.
 */
/** A text prop as markup: answers ({field}) included when the target supports them. */
export function textMarkup(node: ElementNode, ctx: EmitCtx, prop: string): string {
  const text = String(node.props[prop] ?? '')
  return ctx.pipe ? ctx.pipe(text) : esc(text)
}

export function legendFor(node: ElementNode, ctx: EmitCtx, jsx = false): string {
  const c = jsx ? 'className' : 'class'
  const text = textMarkup(node, ctx, 'label')
  const req = ctx.required ? `<span ${c}="${ctx.css.classes('required')}" aria-hidden="true">*</span>` : ''
  const tip = tipFor(node, ctx, jsx)
  return `<legend ${c}="${ctx.css.classes('label')}">${tip ? `<span id="${ctx.id}_legend">${text}</span>` : text}${req}${tip}</legend>`
}

/** ` aria-labelledby` for a fieldset whose legend carries a tooltip. */
export function legendLabelledBy(node: ElementNode, ctx: EmitCtx): string {
  return textProp(node, 'tooltip') ? ` aria-labelledby="${ctx.id}_legend"` : ''
}

/** ` aria-describedby` naming the add-ons around a control, or nothing. */
export function affixDescribedBy(node: ElementNode, ctx: EmitCtx): string {
  const ids = [textProp(node, 'prefix') && `${ctx.id}_prefix`, textProp(node, 'suffix') && `${ctx.id}_suffix`].filter(Boolean)
  return ids.length ? ` aria-describedby="${ids.join(' ')}"` : ''
}

/** The control between its text add-ons ("$", "kg"), or alone without any. */
export function affixWrap(node: ElementNode, ctx: EmitCtx, control: string, jsx = false): string {
  const prefix = textProp(node, 'prefix')
  const suffix = textProp(node, 'suffix')
  // Add-ons and floating labels never combine (see floatsLabel).
  if (!prefix && !suffix) return floatWrap(node, ctx, control, jsx)
  const c = jsx ? 'className' : 'class'
  const affix = (text: string, part: string): string =>
    `<span id="${ctx.id}_${part}" ${c}="${ctx.css.classes('affix')}">${esc(text)}</span>`
  return `<div ${c}="${ctx.css.classes('affixGroup')}">\n    ${[prefix && affix(prefix, 'prefix'), control, suffix && affix(suffix, 'suffix')]
    .filter(Boolean)
    .join('\n    ')}\n  </div>`
}

/**
 * Floating label: the control, then its label (CSS floats it when the
 * control is focused or filled). Inputs need a placeholder for
 * :placeholder-shown, so " " is added when there is none. The control
 * alone when the label doesn't float (labelFor renders it above).
 */
export function floatWrap(node: ElementNode, ctx: EmitCtx, control: string, jsx = false): string {
  if (!ctx.floating) return control
  const c = jsx ? 'className' : 'class'
  const withPlaceholder = /^<(input|Input\w+)\b/.test(control) && !/ placeholder=/.test(control)
    ? control.replace(/^(<\w+)/, '$1 placeholder=" "')
    : control
  const req = ctx.required ? `<span ${c}="${ctx.css.classes('required')}" aria-hidden="true">*</span>` : ''
  const labelClass = ctx.css.classes('floatingLabel')
  const label = `<label${labelClass ? ` ${c}="${labelClass}"` : ''} ${jsx ? 'htmlFor' : 'for'}="${ctx.id}">${textMarkup(node, ctx, 'label')}${req}</label>`
  return `<div ${c}="${ctx.css.classes('floating')}">\n    ${withPlaceholder}\n    ${label}\n  </div>`
}

export function labelFor(node: ElementNode, ctx: EmitCtx): string {
  if (ctx.floating) return ''
  const text = textMarkup(node, ctx, 'label')
  const req = ctx.required
    ? `<span class="${ctx.css.classes('required')}" aria-hidden="true">*</span>`
    : ''
  return withTip(`<label class="${ctx.css.classes('label')}" for="${ctx.id}">${text}${req}</label>`, node, ctx, false)
}

export function descriptionFor(node: ElementNode, ctx: EmitCtx): string {
  const d = node.props['description']
  if (typeof d !== 'string' || d === '') return ''
  return `<p class="${ctx.css.classes('description')}">${textMarkup(node, ctx, 'description')}</p>`
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
  if (ctx.floating) return ''
  const text = textMarkup(node, ctx, 'label')
  const req = ctx.required
    ? `<span className="${ctx.css.classes('required')}" aria-hidden="true">*</span>`
    : ''
  return withTip(`<label className="${ctx.css.classes('label')}" htmlFor="${ctx.id}">${text}${req}</label>`, node, ctx, true)
}

export function reactDescription(node: ElementNode, ctx: EmitCtx): string {
  const d = node.props['description']
  if (typeof d !== 'string' || d === '') return ''
  return `<p className="${ctx.css.classes('description')}">${textMarkup(node, ctx, 'description')}</p>`
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
