// Calculated field: a read-only value worked out from other answers with a
// formula (see @formsgen/renderer formula.ts). Each target recomputes it on
// every change (export/calc.ts) and shows it with fixed decimals; the value
// (a number, or null) is submitted like any field.

import { calculatedDecimals, type ElementNode } from '@formsgen/renderer'
import {
  affixDescribedBy,
  affixWrap,
  blazorValidationMessage,
  descriptionFor,
  fieldWrap,
  htmlDataAttrs,
  htmlError,
  labelFor,
  pascalMember,
  reactDescription,
  reactError,
  reactFieldWrap,
  reactLabelFor,
  vueError,
  vueInvalid,
} from '../emitters/shared'
import { AFFIX_CONTROLS, commonFieldSections, type ElementDefinition } from '../types'

const d = (node: ElementNode): number => calculatedDecimals(node)

export const calculatedElement: ElementDefinition = {
  type: 'calculated',
  category: 'fields',
  label: 'Calculated',
  description: 'A value worked out from other answers',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm1 3v2h5V6zm7.5 0-1 1L14 8.5 12.5 10l1 1 1.5-1.5 1.5 1.5 1-1L16 8.5 17.5 7l-1-1L15 7.5zM6 15v2h5v-2zm7 0v2h5v-2zm-6 0h2zm6-2v-1h5v1zM8 13v1.5H6V16h2v1.5h1.5V16H11v-1.5H9.5V13z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Total', formula: '', decimals: 2 },
  propertyPanel: commonFieldSections([
    { kind: 'formula' },
    { kind: 'number', prop: 'decimals', label: 'Decimal places', min: 0, max: 6 },
    ...AFFIX_CONTROLS,
  ]).map((section) => ({
    ...section,
    controls: section.controls.filter((c) => !('prop' in c && c.prop === 'placeholder')),
  })),
  export: {
    vue: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          affixWrap(
            node,
            ctx,
            `<input id="${ctx.id}" type="text" readonly class="${ctx.css.classes('calculated')}" :value="fgFmt(form.${ctx.path}, ${d(node)})"${vueInvalid(ctx)}${affixDescribedBy(node, ctx)}>`,
          ),
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        ctx,
      ),
    html: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          affixWrap(
            node,
            ctx,
            `<input id="${ctx.id}" type="text" readonly class="${ctx.css.classes('calculated')}"${htmlDataAttrs(ctx, 'calculated')} data-fg-value=""${affixDescribedBy(node, ctx)}>`,
          ),
          descriptionFor(node, ctx),
          htmlError(ctx),
        ],
        ctx,
      ),
    react: (node, ctx) =>
      reactFieldWrap(
        [
          reactLabelFor(node, ctx),
          affixWrap(
            node,
            ctx,
            `<input id="${ctx.id}" type="text" readOnly className="${ctx.css.classes('calculated')}" value={fgFmt(form.${ctx.path}, ${d(node)})} aria-invalid={errors['${ctx.path}'] ? true : undefined}${affixDescribedBy(node, ctx)} />`,
            true,
          ),
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
      ),
    blazor: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          affixWrap(
            node,
            ctx,
            `<input id="${ctx.id}" type="text" readonly class="${ctx.css.classes('calculated')}" value="@FgFmt(Model.${pascalMember(ctx.key)}, ${d(node)})"${affixDescribedBy(node, ctx)} />`,
          ),
          descriptionFor(node, ctx),
          blazorValidationMessage(ctx),
        ],
        ctx,
      ),
  },
}
