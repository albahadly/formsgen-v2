// Static (non-value) elements: heading, paragraph, divider.

import type { ElementNode } from '@formsgen/renderer'
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
