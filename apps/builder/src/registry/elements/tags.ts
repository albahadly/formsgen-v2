// Tags (chips) input: free-text multi-value, string[] data. The chip
// add/remove logic lives in each target's scaffold (fgAddTag/fgRemoveTag
// plus a per-field draft store); emitters only produce markup wired to
// those conventional names. Blazor binds the draft input to the generated
// fgTagDrafts dictionary and adds via @bind:after (commit on blur/Enter).

import type { ElementNode } from '@formsgen/renderer'
import {
  blazorValidationMessage,
  descriptionFor,
  esc,
  fieldWrap,
  htmlError,
  labelFor,
  pascalMember,
  placeholderAttr,
  reactDescription,
  reactError,
  reactFieldWrap,
  reactLabelFor,
  vueError,
} from '../emitters/shared'
import { commonFieldSections, type ElementDefinition, type EmitCtx } from '../types'
import { jsTemplate } from '@/export/announce'

/** Razor attribute text for a `{name}` template with Razor expressions. */
function razorTemplate(template: string, vars: Record<string, string>): string {
  return template
    .split(/(\{\w+\})/)
    .map((part) => {
      const name = /^\{(\w+)\}$/.exec(part)?.[1]
      return name !== undefined && name in vars ? vars[name] : esc(part).replace(/@/g, '@@')
    })
    .join('')
}

function htmlChipsShell(node: ElementNode, ctx: EmitCtx): string {
  return `<div class="${ctx.css.classes('tagsWrap')}" data-fg-path="${ctx.path}" data-fg-kind="tags">\n    <span data-fg-tags-chips="${ctx.path}"></span>\n    <input id="${ctx.id}" type="text" class="${ctx.css.classes('tagsInput')}" data-fg-tags-input="${ctx.path}"${placeholderAttr(node)}>\n  </div>`
}

export const tagsElement: ElementDefinition = {
  type: 'tags',
  category: 'fields',
  label: 'Tags',
  description: 'Free-text chips input',
  icon: '<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M21.4 11.6 12.4 2.6A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .6 1.4l9 9a2 2 0 0 0 2.8 0l7-7a2 2 0 0 0 0-2.8zM6.5 8A1.5 1.5 0 1 1 8 6.5 1.5 1.5 0 0 1 6.5 8z"/></svg>',
  hasValue: true,
  defaultProps: { label: 'Tags', placeholder: 'Type and press Enter' },
  propertyPanel: commonFieldSections(),
  export: {
    vue: (node, ctx) =>
      fieldWrap(
        [
          labelFor(node, ctx),
          `<div class="${ctx.css.classes('tagsWrap')}">\n    <span v-for="(tag, index) in form.${ctx.path}" :key="tag" class="${ctx.css.classes('tag')}">{{ tag }} <button type="button" class="${ctx.css.classes('tagRemove')}" :aria-label="${jsTemplate(ctx.messages.removeTag, { tag: 'tag' })}" @click="fgRemoveTag('${ctx.path}', index)">×</button></span>\n    <input id="${ctx.id}" v-model="tagDrafts['${ctx.path}']" type="text" class="${ctx.css.classes('tagsInput')}"${placeholderAttr(node)} @keydown.enter.prevent="fgAddTag('${ctx.path}')" @blur="fgAddTag('${ctx.path}'); touch('${ctx.path}')">\n  </div>`,
          descriptionFor(node, ctx),
          vueError(ctx),
        ],
        ctx,
      ),
    html: (node, ctx) =>
      fieldWrap(
        [labelFor(node, ctx), htmlChipsShell(node, ctx), descriptionFor(node, ctx), htmlError(ctx)],
        ctx,
      ),
    react: (node, ctx) =>
      reactFieldWrap(
        [
          reactLabelFor(node, ctx),
          `<div className="${ctx.css.classes('tagsWrap')}">\n    {form.${ctx.path}.map((tag, index) => (\n      <span key={tag} className="${ctx.css.classes('tag')}">{tag} <button type="button" className="${ctx.css.classes('tagRemove')}" aria-label={${jsTemplate(ctx.messages.removeTag, { tag: 'tag' })}} onClick={() => fgRemoveTag('${ctx.path}', form.${ctx.path}, index)}>×</button></span>\n    ))}\n    <input id="${ctx.id}" type="text" className="${ctx.css.classes('tagsInput')}" value={tagDrafts['${ctx.path}'] ?? ''}${placeholderAttr(node)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagDrafts((d) => ({ ...d, '${ctx.path}': e.target.value }))} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); fgAddTag('${ctx.path}', form.${ctx.path}) } }} onBlur={() => { fgAddTag('${ctx.path}', form.${ctx.path}); touch('${ctx.path}') }} />\n  </div>`,
          reactDescription(node, ctx),
          reactError(ctx),
        ],
        ctx,
      ),
    blazor: (node, ctx) => {
      const member = `Model.${pascalMember(ctx.key)}`
      const idx = `fgIdx_${ctx.key}`
      return fieldWrap(
        [
          labelFor(node, ctx),
          `<div class="${ctx.css.classes('tagsWrap')}">\n    @for (var i = 0; i < ${member}.Count; i++)\n    {\n        var ${idx} = i;\n        <span class="${ctx.css.classes('tag')}">@${member}[${idx}] <button type="button" class="${ctx.css.classes('tagRemove')}" aria-label="${razorTemplate(ctx.messages.removeTag, { tag: `@(${member}[${idx}])` })}" @onclick="() => ${member}.RemoveAt(${idx})">&times;</button></span>\n    }\n    <input id="${ctx.id}" type="text" class="${ctx.css.classes('tagsInput')}"${placeholderAttr(node)} @bind='fgTagDrafts[${JSON.stringify(ctx.key)}]' @bind:after='() => FgAddTag(${member}, ${JSON.stringify(ctx.key)})'>\n  </div>`,
          descriptionFor(node, ctx),
          blazorValidationMessage(ctx),
        ],
        ctx,
      )
    },
  },
}

