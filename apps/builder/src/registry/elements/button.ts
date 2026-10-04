// Button element: resets the form to its initial values, or links
// somewhere styled as a button. (Submitting stays with the form's own,
// configurable submit button.)

import { isSafeUrl, type ElementNode } from '@formsgen/renderer'
import type { Slot } from '@/export/css/types'
import { esc } from '../emitters/shared'
import { appearanceSection, type ElementDefinition, type EmitCtx, type EmitterLang } from '../types'

const VARIANT_SLOTS: Record<string, Slot> = {
  primary: 'submitButton',
  secondary: 'buttonSecondary',
  danger: 'buttonDanger',
}

/** Reset handler per target (each scaffold defines its fgReset). */
const RESET_ATTR: Record<EmitterLang, string> = {
  vue: ' @click="fgReset"',
  react: ' onClick={fgReset}',
  html: ' data-fg-reset',
  blazor: ' @onclick="FgReset"',
}

export function buttonMarkup(node: ElementNode, ctx: EmitCtx, lang: EmitterLang): string {
  const classAttr = lang === 'react' ? 'className' : 'class'
  const variant = String(node.props['variant'] ?? 'primary')
  const cls = ctx.css.classes(VARIANT_SLOTS[variant] ?? 'submitButton')
  const text = esc(String(node.props['text'] ?? ''))
  if (node.props['action'] === 'link') {
    const href = node.props['href']
    const hrefAttr = isSafeUrl(href) ? ` href="${esc(href.trim())}"` : ''
    const newTab = node.props['newTab'] === true
    const tabAttrs = newTab ? ' target="_blank" rel="noopener noreferrer"' : ''
    const hint = newTab
      ? `<span ${classAttr}="${ctx.css.classes('srOnly')}"> ${esc(ctx.messages.opensInNewTab)}</span>`
      : ''
    return `<a ${classAttr}="${cls}"${hrefAttr}${tabAttrs}>${text}${hint}</a>`
  }
  return `<button type="button" ${classAttr}="${cls}"${RESET_ATTR[lang]}>${text}</button>`
}

export const buttonElement: ElementDefinition = {
  type: 'button',
  category: 'static',
  label: 'Button',
  description: 'Reset button or link styled as a button',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M19 7H5a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-4a3 3 0 0 0-3-3zm1 7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1zM7 11h10v2H7z"/></svg>',
  defaultProps: { text: 'Reset', action: 'reset', variant: 'secondary' },
  propertyPanel: [
    {
      title: 'Properties',
      controls: [
        { kind: 'text', prop: 'text', label: 'Text' },
        {
          kind: 'select',
          prop: 'action',
          label: 'Action',
          options: [
            { value: 'reset', label: 'Reset the form' },
            { value: 'link', label: 'Open a link' },
          ],
        },
        { kind: 'text', prop: 'href', label: 'Link URL', placeholder: 'https://' },
        { kind: 'toggle', prop: 'newTab', label: 'Open in a new tab' },
        {
          kind: 'select',
          prop: 'variant',
          label: 'Style',
          options: [
            { value: 'primary', label: 'Primary' },
            { value: 'secondary', label: 'Secondary' },
            { value: 'danger', label: 'Danger' },
          ],
        },
      ],
    },
    { title: 'Layout', controls: [{ kind: 'colspan' }] },
    appearanceSection(['align', 'className']),
    { title: 'Conditions', controls: [{ kind: 'conditions' }] },
  ],
  export: {
    vue: (node, ctx) => buttonMarkup(node, ctx, 'vue'),
    html: (node, ctx) => buttonMarkup(node, ctx, 'html'),
    react: (node, ctx) => buttonMarkup(node, ctx, 'react'),
    blazor: (node, ctx) => buttonMarkup(node, ctx, 'blazor'),
  },
}
