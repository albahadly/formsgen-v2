// File and image uploads. The value is the list of chosen files; each
// target lists them (thumbnails for images in the JS targets) with remove
// buttons and submits multipart form data (see export/compile.ts).

import { fileLimits, type ElementNode } from '@formsgen/renderer'
import {
  blazorValidationMessage,
  descriptionFor,
  esc,
  fieldWrap,
  htmlError,
  labelFor,
  pascalMember,
  reactDescription,
  reactError,
  reactFieldWrap,
  reactLabelFor,
  vueError,
} from '../emitters/shared'
import { commonFieldSections, type ElementDefinition, type EmitCtx } from '../types'

function inputAttrs(node: ElementNode, jsx = false): string {
  const limits = fileLimits(node)
  return `${limits.accept ? ` accept="${esc(limits.accept)}"` : ''}${limits.multiple ? (jsx ? ' multiple' : ' multiple') : ''}`
}

const isImageUpload = (node: ElementNode): boolean => node.type === 'imageupload'

function vueList(node: ElementNode, ctx: EmitCtx): string {
  const list = `form.${ctx.path}`
  const thumb = isImageUpload(node)
    ? `\n      <img v-if="file.type.startsWith('image/')" class="${ctx.css.classes('fileThumb')}" :src="fgThumb(file)" alt="" width="40" height="40">`
    : ''
  return `<ul v-if="${list}.length" class="${ctx.css.classes('fileList')}">
    <li v-for="(file, fi) in ${list}" :key="fi" class="${ctx.css.classes('fileItem')}">${thumb}
      <span class="${ctx.css.classes('fileName')}">{{ file.name }}</span>
      <span class="${ctx.css.classes('fileSize')}">{{ fgFileSize(file.size) }}</span>
      <button type="button" class="${ctx.css.classes('fileRemove')}" :aria-label="fgRemoveFileLabel(file.name)" @click="fgRemoveFile('${ctx.path}', fi)">×</button>
    </li>
  </ul>`
}

function reactList(node: ElementNode, ctx: EmitCtx): string {
  const list = `form.${ctx.path}`
  const thumb = isImageUpload(node)
    ? `\n        {file.type.startsWith('image/') && <img className="${ctx.css.classes('fileThumb')}" src={fgThumb(file)} alt="" width={40} height={40} />}`
    : ''
  return `{${list}.length > 0 && (
    <ul className="${ctx.css.classes('fileList')}">
      {${list}.map((file, fi) => (
        <li key={fi} className="${ctx.css.classes('fileItem')}">${thumb}
          <span className="${ctx.css.classes('fileName')}">{file.name}</span>
          <span className="${ctx.css.classes('fileSize')}">{fgFileSize(file.size)}</span>
          <button type="button" className="${ctx.css.classes('fileRemove')}" aria-label={fgRemoveFileLabel(file.name)} onClick={() => fgRemoveFile('${ctx.path}', fi)}>×</button>
        </li>
      ))}
    </ul>
  )}`
}

function blazorList(node: ElementNode, ctx: EmitCtx): string {
  const member = `Model.${pascalMember(ctx.key)}`
  const thumb = isImageUpload(node)
    ? `
                  @if (file.Thumb != null)
                  {
                      <img class="${ctx.css.classes('fileThumb')}" src="@file.Thumb" alt="" width="40" height="40" />
                  }`
    : ''
  return `@if (${member}.Count > 0)
  {
      <ul class="${ctx.css.classes('fileList')}">
          @foreach (var file in ${member}.ToList())
          {
              <li @key="file" class="${ctx.css.classes('fileItem')}">${thumb}
                  <span class="${ctx.css.classes('fileName')}">@file.Name</span>
                  <span class="${ctx.css.classes('fileSize')}">@FgFileSize(file.Size)</span>
                  <button type="button" class="${ctx.css.classes('fileRemove')}" aria-label='@FgRemoveFileLabel(file.Name)' @onclick='() => FgRemoveFile(${member}, file, "${pascalMember(ctx.key)}")'>×</button>
              </li>
          }
      </ul>
  }`
}

/** Re-created (new @key) after each pick so it reads empty, like the JS targets' inputs. */
function blazorInput(node: ElementNode, ctx: EmitCtx): string {
  const limits = fileLimits(node)
  const member = pascalMember(ctx.key)
  const maxBytes = limits.maxSizeMb > 0 ? `${Math.round(limits.maxSizeMb * 1024 * 1024)}L` : '0L'
  const args = [`Model.${member}`, 'e', String(limits.multiple), maxBytes, String(isImageUpload(node)), `"${member}"`]
  return `<InputFile @key='fgFileKeys["${member}"]' @ref='fgFileInputs["${member}"]' id="${ctx.id}" class="${ctx.css.classes('fileInput')}"${inputAttrs(node)} OnChange='@(e => FgPickFiles(${args.join(', ')}))' />`
}

function makeUpload(config: { type: string; label: string; description: string; icon: string }): ElementDefinition {
  return {
    type: config.type,
    category: 'fields',
    label: config.label,
    description: config.description,
    icon: config.icon,
    hasValue: true,
    defaultProps: { label: config.label, multiple: false, maxSizeMb: 10 },
    propertyPanel: commonFieldSections(
      [
        { kind: 'toggle', prop: 'multiple', label: 'Allow several files' },
        {
          kind: 'text',
          prop: 'accept',
          label: 'Accepted types (e.g. .pdf, image/*)',
          placeholder: config.type === 'imageupload' ? 'image/*' : 'any',
        },
        { kind: 'number', prop: 'maxSizeMb', label: 'Max size per file (MB)', min: 0 },
        { kind: 'number', prop: 'maxFiles', label: 'Max number of files', min: 0 },
      ],
      ['hideLabel', 'align', 'className'],
    ).map((section) => ({
      ...section,
      controls: section.controls.filter((c) => !('prop' in c && c.prop === 'placeholder')),
    })),
    export: {
      vue: (node, ctx) =>
        fieldWrap(
          [
            labelFor(node, ctx),
            `<input id="${ctx.id}" type="file" class="${ctx.css.classes('fileInput')}"${inputAttrs(node)} :aria-invalid="errors['${ctx.path}'] ? 'true' : undefined" @change="fgPickFiles('${ctx.path}', $event)">`,
            vueList(node, ctx),
            descriptionFor(node, ctx),
            vueError(ctx),
          ],
          ctx,
        ),
      html: (node, ctx) =>
        fieldWrap(
          [
            labelFor(node, ctx),
            `<input id="${ctx.id}" type="file" class="${ctx.css.classes('fileInput')}"${inputAttrs(node)} data-fg-path="${ctx.path}" data-fg-kind="files"${isImageUpload(node) ? ' data-fg-thumbs' : ''}>`,
            `<ul class="${ctx.css.classes('fileList')}" data-fg-file-list="${ctx.path}" hidden></ul>`,
            descriptionFor(node, ctx),
            htmlError(ctx),
          ],
          ctx,
        ),
      react: (node, ctx) =>
        reactFieldWrap(
          [
            reactLabelFor(node, ctx),
            `<input id="${ctx.id}" type="file" className="${ctx.css.classes('fileInput')}"${inputAttrs(node, true)} aria-invalid={errors['${ctx.path}'] ? true : undefined} onChange={(e: React.ChangeEvent<HTMLInputElement>) => fgPickFiles('${ctx.path}', e.target)} />`,
            reactList(node, ctx),
            reactDescription(node, ctx),
            reactError(ctx),
          ],
          ctx,
        ),
      blazor: (node, ctx) =>
        fieldWrap(
          [
            labelFor(node, ctx),
            blazorInput(node, ctx),
            blazorList(node, ctx),
            descriptionFor(node, ctx),
            blazorValidationMessage(ctx),
          ],
          ctx,
        ),
    },
  }
}

const icon = (path: string): string =>
  `<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="${path}"/></svg>`

export const fileElement = makeUpload({
  type: 'file',
  label: 'File upload',
  description: 'Attach one or more files',
  icon: icon('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm4 18H6V4h7v5h5zM8 15h3v3h2v-3h3l-4-4z'),
})

export const imageUploadElement = makeUpload({
  type: 'imageupload',
  label: 'Image upload',
  description: 'Attach pictures (with previews)',
  icon: icon('M19 5v9h-2V5H5v14h9v2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2zm-6.5 6-3 4-2-2.5L5 17h9zM20 16v3h3v2h-3v3h-2v-3h-3v-2h3v-3z'),
})
