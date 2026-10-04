// Matrix: a table with one single-choice answer per row. The value maps
// each row to the chosen column (null = unanswered); "required" means
// every row is answered. Each radio is named "<row>: <column>". Blazor
// models it as Dictionary<string, string?> and sets cells via FgSetCell.

import { matrixColumns, matrixRows, type ElementNode } from '@formsgen/renderer'
import {
  blazorValidationMessage,
  descriptionFor,
  esc,
  htmlError,
  pascalMember,
  reactDescription,
  reactError,
  vueError,
} from '../emitters/shared'
import { commonFieldSections, type ElementDefinition, type EmitCtx } from '../types'
import type { Slot } from '@/export/css/types'

type Lang = 'vue' | 'html' | 'react' | 'blazor'

const attr = (lang: Lang): string => (lang === 'react' ? 'className' : 'class')

/** ` class="…"` for a slot, or nothing when the framework leaves it unstyled. */
function cls(ctx: EmitCtx, slot: Slot, lang: Lang): string {
  const value = ctx.css.classes(slot)
  return value ? ` ${attr(lang)}="${value}"` : ''
}

function legend(node: ElementNode, ctx: EmitCtx, lang: Lang): string {
  const req = ctx.required
    ? `<span ${attr(lang)}="${ctx.css.classes('required')}" aria-hidden="true">*</span>`
    : ''
  return `<legend ${attr(lang)}="${ctx.css.classes('label')}">${esc(String(node.props['label'] ?? ''))}${req}</legend>`
}

/** The radio for one cell, per target (first cell carries the field id). */
type RadioFn = (row: string, column: string, id: string, label: string) => string

function table(node: ElementNode, ctx: EmitCtx, lang: Lang, radio: RadioFn): string {
  const rows = matrixRows(node)
  const columns = matrixColumns(node)
  const heads = columns.map((c) => `<th scope="col"${cls(ctx, 'matrixColHead', lang)}>${esc(c.label)}</th>`).join('')
  const body = rows
    .map((row, ri) => {
      const cells = columns
        .map((column, ci) => {
          const id = ri === 0 && ci === 0 ? ctx.id : `${ctx.id}_${ri}_${ci}`
          return `<td${cls(ctx, 'matrixCell', lang)}>${radio(row.value, column.value, id, esc(`${row.label}: ${column.label}`))}</td>`
        })
        .join('')
      return `      <tr${cls(ctx, 'matrixRow', lang)}><th scope="row"${cls(ctx, 'matrixRowHead', lang)}>${esc(row.label)}</th>${cells}</tr>`
    })
    .join('\n')
  return `<div${cls(ctx, 'matrixWrap', lang)}>
    <table${cls(ctx, 'matrix', lang)}>
      <thead><tr><td></td>${heads}</tr></thead>
      <tbody>
${body}
      </tbody>
    </table>
  </div>`
}

function wrap(parts: string[], ctx: EmitCtx, lang: Lang): string {
  return `<fieldset ${attr(lang)}="${ctx.css.classes('field')}">\n  ${parts.filter(Boolean).join('\n  ')}\n</fieldset>`
}

/** A single-quoted JS string literal (for expressions inside double-quoted attributes). */
const jsSingle = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

const radioName = (ctx: EmitCtx, row: string): string => `${ctx.id}_${row.replace(/[^\w-]/g, '_')}`

export const matrixElement: ElementDefinition = {
  type: 'matrix',
  category: 'fields',
  label: 'Matrix',
  description: 'Rate several rows on the same scale',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M3 3h18v18H3zm2 2v3h3V5zm5 0v3h4V5zm6 0v3h3V5zM5 10v4h3v-4zm5 0v4h4v-4zm6 0v4h3v-4zM5 16v3h3v-3zm5 0v3h4v-3zm6 0v3h3v-3z"/></svg>',
  hasValue: true,
  defaultProps: {
    label: 'Rate us',
    rows: [
      { value: 'speed', label: 'Speed' },
      { value: 'quality', label: 'Quality' },
    ],
    columns: [
      { value: '1', label: 'Poor' },
      { value: '2', label: 'OK' },
      { value: '3', label: 'Great' },
    ],
  },
  propertyPanel: commonFieldSections(
    [
      { kind: 'items', prop: 'rows', label: 'Rows (questions)' },
      { kind: 'items', prop: 'columns', label: 'Columns (answers)' },
    ],
    ['hideLabel', 'align', 'className'],
  ).map((section) => ({
    ...section,
    controls: section.controls.filter((c) => !('prop' in c && c.prop === 'placeholder')),
  })),
  export: {
    vue: (node, ctx) =>
      wrap(
        [
          legend(node, ctx, 'vue'),
          table(
            node,
            ctx,
            'vue',
            (row, column, id, label) =>
              `<input id="${id}" type="radio"${cls(ctx, 'matrixRadio', 'vue')} name="${radioName(ctx, row)}" value="${esc(column)}" v-model="form.${ctx.path}[${esc(jsSingle(row))}]" aria-label="${label}" @change="revalidate('${ctx.path}')" @blur="touch('${ctx.path}')">`,
          ),
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        ctx,
        'vue',
      ),
    html: (node, ctx) =>
      wrap(
        [
          legend(node, ctx, 'html'),
          table(
            node,
            ctx,
            'html',
            (row, column, id, label) =>
              `<input id="${id}" type="radio"${cls(ctx, 'matrixRadio', 'html')} name="${radioName(ctx, row)}" value="${esc(column)}" data-fg-path="${ctx.path}" data-fg-kind="matrix" data-fg-row="${esc(row)}" aria-label="${label}">`,
          ),
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        ctx,
        'html',
      ),
    react: (node, ctx) =>
      wrap(
        [
          legend(node, ctx, 'react'),
          table(
            node,
            ctx,
            'react',
            (row, column, id, label) =>
              `<input id="${id}" type="radio"${cls(ctx, 'matrixRadio', 'react')} name="${radioName(ctx, row)}" value="${esc(column)}" checked={form.${ctx.path}[${JSON.stringify(row)}] === ${JSON.stringify(column)}} aria-label="${label}" onChange={() => setField('${ctx.path}', { ...form.${ctx.path}, [${JSON.stringify(row)}]: ${JSON.stringify(column)} })} onBlur={() => touch('${ctx.path}')} />`,
          ),
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
        'react',
      ),
    blazor: (node, ctx) => {
      const member = pascalMember(ctx.key)
      const m = `Model.${member}`
      const cs = (s: string): string => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
      return wrap(
        [
          legend(node, ctx, 'blazor'),
          table(
            node,
            ctx,
            'blazor',
            (row, column, id, label) =>
              `<input id="${id}" type="radio"${cls(ctx, 'matrixRadio', 'blazor')} name="${radioName(ctx, row)}" value="${esc(column)}" checked='@(${m}[${cs(row)}] == ${cs(column)})' aria-label="${label}" @onchange='() => FgSetCell(${m}, ${cs(row)}, ${cs(column)}, "${member}")' />`,
          ),
          descriptionFor(node, ctx),
          blazorValidationMessage(ctx),
        ],
        ctx,
        'blazor',
      )
    },
  },
}
