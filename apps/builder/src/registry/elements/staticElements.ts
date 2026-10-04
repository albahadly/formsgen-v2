// Static (non-value) elements: heading, paragraph, divider, image, link,
// quote. Link and image URLs are emitted only when safe (isSafeUrl).

import { isSafeUrl, type ElementNode } from '@formsgen/renderer'
import { esc } from '../emitters/shared'
import { appearanceSection, type ElementDefinition, type EmitCtx } from '../types'

function headingTag(node: ElementNode): string {
  const level = Number(node.props['level'] ?? 2)
  return `h${level >= 1 && level <= 4 ? level : 2}`
}

const headingMarkup = (node: ElementNode, ctx: EmitCtx, classAttr: string): string => {
  const tag = headingTag(node)
  return `<${tag} ${classAttr}="${ctx.css.classes('heading')}">${esc(String(node.props['text'] ?? ''))}</${tag}>`
}

export const headingElement: ElementDefinition = {
  type: 'heading',
  category: 'static',
  label: 'Heading',
  description: 'Section heading (H1–H4)',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M5 4h2v7h10V4h2v16h-2v-7H7v7H5z"/></svg>',
  defaultProps: { text: 'Heading', level: 2 },
  propertyPanel: [
    {
      title: 'Properties',
      controls: [
        { kind: 'text', prop: 'text', label: 'Text' },
        {
          kind: 'select',
          prop: 'level',
          label: 'Level',
          options: [
            { value: '1', label: 'H1' },
            { value: '2', label: 'H2' },
            { value: '3', label: 'H3' },
            { value: '4', label: 'H4' },
          ],
        },
      ],
    },
    { title: 'Layout', controls: [{ kind: 'colspan' }] },
    appearanceSection(['align', 'tone', 'className']),
    { title: 'Conditions', controls: [{ kind: 'conditions' }] },
  ],
  export: {
    vue: (node, ctx) => headingMarkup(node, ctx, 'class'),
    html: (node, ctx) => headingMarkup(node, ctx, 'class'),
    react: (node, ctx) => headingMarkup(node, ctx, 'className'),
    blazor: (node, ctx) => headingMarkup(node, ctx, 'class'),
  },
}

const paragraphMarkup = (node: ElementNode, ctx: EmitCtx, classAttr: string): string =>
  `<p ${classAttr}="${ctx.css.classes('paragraph')}">${esc(String(node.props['text'] ?? ''))}</p>`

export const paragraphElement: ElementDefinition = {
  type: 'paragraph',
  category: 'static',
  label: 'Paragraph',
  description: 'A block of explanatory text',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M4 5h16v2H4zm0 4h16v2H4zm0 4h16v2H4zm0 4h10v2H4z"/></svg>',
  defaultProps: { text: 'Paragraph text.' },
  propertyPanel: [
    {
      title: 'Properties',
      controls: [{ kind: 'text', prop: 'text', label: 'Text' }],
    },
    { title: 'Layout', controls: [{ kind: 'colspan' }] },
    appearanceSection(['align', 'tone', 'className']),
    { title: 'Conditions', controls: [{ kind: 'conditions' }] },
  ],
  export: {
    vue: (node, ctx) => paragraphMarkup(node, ctx, 'class'),
    html: (node, ctx) => paragraphMarkup(node, ctx, 'class'),
    react: (node, ctx) => paragraphMarkup(node, ctx, 'className'),
    blazor: (node, ctx) => paragraphMarkup(node, ctx, 'class'),
  },
}

export const dividerElement: ElementDefinition = {
  type: 'divider',
  category: 'static',
  label: 'Divider',
  description: 'Horizontal rule',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M4 11h16v2H4z"/></svg>',
  defaultProps: {},
  propertyPanel: [
    { title: 'Layout', controls: [{ kind: 'colspan' }] },
    appearanceSection(['tone', 'className']),
    { title: 'Conditions', controls: [{ kind: 'conditions' }] },
  ],
  export: {
    vue: (_node, ctx) => `<hr class="${ctx.css.classes('divider')}">`,
    html: (_node, ctx) => `<hr class="${ctx.css.classes('divider')}">`,
    react: (_node, ctx) => `<hr className="${ctx.css.classes('divider')}" />`,
    blazor: (_node, ctx) => `<hr class="${ctx.css.classes('divider')}" />`,
  },
}

const classAttrFor = (jsx: boolean): string => (jsx ? 'className' : 'class')

const imageMarkup = (node: ElementNode, ctx: EmitCtx, jsx: boolean): string => {
  const src = node.props['src']
  const srcAttr = isSafeUrl(src) ? ` src="${esc(src.trim())}"` : ''
  const width = Number(node.props['width'])
  const widthAttr = Number.isFinite(width) && width > 0 ? ` width="${Math.round(width)}"` : ''
  return `<img ${classAttrFor(jsx)}="${ctx.css.classes('image')}"${srcAttr} alt="${esc(String(node.props['alt'] ?? ''))}"${widthAttr} loading="lazy"${jsx ? ' />' : '>'}`
}

export const imageElement: ElementDefinition = {
  type: 'image',
  category: 'static',
  label: 'Image',
  description: 'Picture from a URL',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V5h14zm-5-7-3 4-2-2.5L6 17h12z"/></svg>',
  defaultProps: { src: '', alt: '' },
  propertyPanel: [
    {
      title: 'Properties',
      controls: [
        { kind: 'text', prop: 'src', label: 'Image URL', placeholder: 'https://' },
        { kind: 'text', prop: 'alt', label: 'Alt text (leave empty if decorative)' },
        { kind: 'number', prop: 'width', label: 'Width (px)', min: 1 },
      ],
    },
    { title: 'Layout', controls: [{ kind: 'colspan' }] },
    appearanceSection(['align', 'className']),
    { title: 'Conditions', controls: [{ kind: 'conditions' }] },
  ],
  export: {
    vue: (node, ctx) => imageMarkup(node, ctx, false),
    html: (node, ctx) => imageMarkup(node, ctx, false),
    react: (node, ctx) => imageMarkup(node, ctx, true),
    blazor: (node, ctx) => imageMarkup(node, ctx, false),
  },
}

const linkMarkup = (node: ElementNode, ctx: EmitCtx, jsx: boolean): string => {
  const classAttr = classAttrFor(jsx)
  const href = node.props['href']
  const hrefAttr = isSafeUrl(href) ? ` href="${esc(href.trim())}"` : ''
  const newTab = node.props['newTab'] === true
  const tabAttrs = newTab ? ' target="_blank" rel="noopener noreferrer"' : ''
  const hint = newTab
    ? `<span ${classAttr}="${ctx.css.classes('srOnly')}"> ${esc(ctx.messages.opensInNewTab)}</span>`
    : ''
  return `<a ${classAttr}="${ctx.css.classes('link')}"${hrefAttr}${tabAttrs}>${esc(String(node.props['text'] ?? ''))}${hint}</a>`
}

export const linkElement: ElementDefinition = {
  type: 'link',
  category: 'static',
  label: 'Link',
  description: 'Text link to a page',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M3.9 12A3.1 3.1 0 0 1 7 8.9h4V7H7a5 5 0 0 0 0 10h4v-1.9H7A3.1 3.1 0 0 1 3.9 12zM8 13h8v-2H8zm9-6h-4v1.9h4a3.1 3.1 0 0 1 0 6.2h-4V17h4a5 5 0 0 0 0-10z"/></svg>',
  defaultProps: { text: 'Read more', href: '' },
  propertyPanel: [
    {
      title: 'Properties',
      controls: [
        { kind: 'text', prop: 'text', label: 'Text' },
        { kind: 'text', prop: 'href', label: 'Link URL', placeholder: 'https://' },
        { kind: 'toggle', prop: 'newTab', label: 'Open in a new tab' },
      ],
    },
    { title: 'Layout', controls: [{ kind: 'colspan' }] },
    appearanceSection(['align', 'className']),
    { title: 'Conditions', controls: [{ kind: 'conditions' }] },
  ],
  export: {
    vue: (node, ctx) => linkMarkup(node, ctx, false),
    html: (node, ctx) => linkMarkup(node, ctx, false),
    react: (node, ctx) => linkMarkup(node, ctx, true),
    blazor: (node, ctx) => linkMarkup(node, ctx, false),
  },
}

const quoteMarkup = (node: ElementNode, ctx: EmitCtx, jsx: boolean): string => {
  const classAttr = classAttrFor(jsx)
  const cite = String(node.props['cite'] ?? '')
  const caption = cite
    ? `\n  <figcaption ${classAttr}="${ctx.css.classes('quoteCite')}">${esc(cite)}</figcaption>`
    : ''
  return `<figure ${classAttr}="${ctx.css.classes('quote')}">\n  <blockquote ${classAttr}="${ctx.css.classes('quoteText')}">\n    <p>${esc(String(node.props['text'] ?? ''))}</p>\n  </blockquote>${caption}\n</figure>`
}

export const quoteElement: ElementDefinition = {
  type: 'quote',
  category: 'static',
  label: 'Quote',
  description: 'Quotation with optional source',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>',
  defaultProps: { text: 'Quote text.', cite: '' },
  propertyPanel: [
    {
      title: 'Properties',
      controls: [
        { kind: 'text', prop: 'text', label: 'Text' },
        { kind: 'text', prop: 'cite', label: 'Source' },
      ],
    },
    { title: 'Layout', controls: [{ kind: 'colspan' }] },
    appearanceSection(['align', 'className']),
    { title: 'Conditions', controls: [{ kind: 'conditions' }] },
  ],
  export: {
    vue: (node, ctx) => quoteMarkup(node, ctx, false),
    html: (node, ctx) => quoteMarkup(node, ctx, false),
    react: (node, ctx) => quoteMarkup(node, ctx, true),
    blazor: (node, ctx) => quoteMarkup(node, ctx, false),
  },
}
