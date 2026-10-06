// Self-contained HTML + vanilla JS export: semantic markup, compiled
// validation/conditions/payload, no build step. Vanilla CSS embeds the
// stylesheet; Tailwind/Bootstrap reference their CDN assets in <head>
// (swappable for local builds, see the generated README).

import { servicesReadme } from '../readmeNotes'
import { fileLimits, resolveMessages, type ElementNode } from '@formsgen/renderer'
import { errorsTextFunction, jsTemplate, stepAnnouncements, submittedText, jsString } from '../announce'
import { FILE_HELPERS, RUNTIME_HELPERS, compileConditions } from '../compile'
import { calcSteps, htmlCalcBlock } from '../calc'
import { htmlAnswerPainter, usesAnswers } from '../answers'
import { dragHandle, htmlItemDrag } from '../itemDrag'
import { hasSignature, signatureRuntime } from '../signature'
import { hasRichText, richTextRuntime } from '../richAnswer'
import { hasLocation, locationRuntime } from '../location'
import { CAPTCHA_FIELD, captchaKeyOf, captchaMarkup, captchaRuntime } from '../captcha'
import { draftBar, draftHelpers, htmlDraftRuntime, usesDraft } from '../draft'
import { fieldsByPath, listSeparator } from '@formsgen/renderer'
import { dropFirstHelper, postsUploads, uploadFields, uploadStatusMarkup, uploadTextHelper } from '../uploadRuntime'
import { exportStylesheet, hasDateRange, hasDates, hasMatrix, hasRangeSlider, phoneCountryFields } from '../composite'
import {
  collectExportFields,
  collectExportRepeaters,
  itemValidatorsLiteral,
  scopedAccessor,
  type ItemAccess,
  payloadExpr,
  validatorsLiteral,
  visibilityFunctions,
} from '../logic'
import {
  renderTree,
  stepButtonLabels,
  type RenderedRepeater,
  type RenderedSectionHost,
} from '../markup'
import { repeaterLegend } from '../repeaterMarkup'
import { ITEM_TOKENS, collectSectionHosts, collectTemplateFields, hasResetButton, repeaterRef, resolveSubmitButton, tplHelper, type RepeaterRef } from '../structure'
import { esc } from '@/registry/emitters/shared'
import { formRootClass, pinnedSchemeAttr } from '../css/themeBridge'
import type { ExportTarget } from './types'

function indentBlock(text: string, depth: number): string {
  const pad = '  '.repeat(depth)
  return text
    .split('\n')
    .map((line) => (line === '' ? line : pad + line))
    .join('\n')
}

const indentHtml = (text: string, depth: number): string =>
  text.split('\n').map((line) => (line ? ' '.repeat(depth) + line : line)).join('\n')

export const htmlTarget: ExportTarget = {
  id: 'html',
  label: 'HTML + JS',
  description: 'One self-contained .html file — opens from disk, no build step.',
  frameworkAware: true,
  generate: ({ schema, css }) => {
    const accessor = (path: string): string => `fgGet(${JSON.stringify(path)})`
    const fields = collectExportFields(schema)
    const repeaters = collectExportRepeaters(schema)
    const hasRepeaters = repeaters.length > 0
    // Item fields are read from the DOM by their indexed path.
    // Item paths at run time: "travellers." + i + ".name", or for an inner
    // repeater "travellers." + i + ".bags." + j + ".weight".
    const listExpr = (r: RepeaterRef): string =>
      r.depth === 1
        ? JSON.stringify(r.path)
        : `${JSON.stringify(`${r.parent}.`)} + i + ${JSON.stringify(r.path.slice(r.parent!.length))}`
    const items: ItemAccess = {
      map: (r, body) => `fgItemIndexes(${listExpr(r)}).map(function (${r.depth === 1 ? 'i' : 'j'}) { return ${body} })`,
      read: (template, r) =>
        r.depth === 1
          ? `fgGet(${JSON.stringify(`${r.path}.`)} + i + ${JSON.stringify(template.slice(r.path.length))})`
          : `fgGet(${JSON.stringify(`${r.parent}.`)} + i + ${JSON.stringify(`${r.path.slice(r.parent!.length)}.`)} + j + ${JSON.stringify(template.slice(r.path.length))})`,
    }
    const hosts = collectSectionHosts(schema)
    const messages = resolveMessages(schema.meta.locale)

    // Submit button: configurable text/placement/style (meta.submitButton).
    // With exactly ONE gating wizard, the submit replaces Next on its last
    // step (shown/hidden by fgUpdateSubmit); otherwise it sits at the bottom.
    const sb = resolveSubmitButton(schema, hosts)
    const embeddedHost = sb.gatingHosts.length === 1 ? sb.gatingHosts[0]! : null
    const submitClass = css.classes(sb.secondary ? 'buttonSecondary' : 'submitButton')

    // Conditional wrappers register their test expressions by index.
    const conditionTests: string[] = []
    const conditionAttr = (_node: ElementNode, expr: string): string => {
      conditionTests.push(expr)
      return ` data-fg-cond="${conditionTests.length - 1}"`
    }

    const renderSections = (host: RenderedSectionHost): string => {
      const panels = host.sections
        .map(
          (s) =>
            `  <div data-fg-sec-panel="${host.key}:${s.index}"${host.kind === 'tabs' ? ' role="tabpanel"' : ''}${s.index > 0 ? ' hidden' : ''}>\n${indentBlock(s.html, 1)}\n  </div>`,
        )
        .join('\n')
      if (host.kind === 'tabs') {
        const buttons = host.sections
          .map(
            (s) =>
              `    <button type="button" role="tab" aria-selected="${s.index === 0 ? 'true' : 'false'}" class="${s.index === 0 ? css.classes('tabButtonActive') : css.classes('tabButton')}" data-fg-sec-btn="${host.key}:${s.index}">${s.label}</button>`,
          )
          .join('\n')
        return `<div>\n  <div class="${css.classes('tabList')}" role="tablist">\n${buttons}\n  </div>\n${panels}\n</div>`
      }
      const items = host.sections
        .map(
          (s) =>
            `    <li class="${s.index === 0 ? css.classes('stepItemActive') : css.classes('stepItem')}" data-fg-sec-item="${host.key}:${s.index}">${s.index + 1}. ${s.label}</li>`,
        )
        .join('\n')
      const labels = stepButtonLabels(host)
      const embeddedSubmit =
        embeddedHost?.key === host.key
          ? `\n    <button type="submit" class="${submitClass}" data-fg-submit hidden>${sb.text}</button>`
          : ''
      return `<div>\n  <ol class="${css.classes('stepList')}">\n${items}\n  </ol>\n${panels}\n  <div class="${css.classes('stepActions')}">\n    <button type="button" class="${css.classes('buttonSecondary')}" data-fg-step-back="${host.key}" hidden>${labels.back}</button>\n    <button type="button" class="${css.classes('submitButton')}" data-fg-step-next="${host.key}">${labels.next}</button>${embeddedSubmit}\n  </div>\n</div>`
    }

    // Conditional wrappers INSIDE repeater items: tested per item (index i).
    const itemConditionTests: string[] = []
    const renderRepeater = (r: RenderedRepeater): string =>
      `<fieldset class="${css.classes('group')}" data-fg-repeater="${r.path}">${repeaterLegend(css, r, 'class')}
  <div class="${css.classes('repeaterItems')}" data-fg-items="${r.path}"></div>
  <template data-fg-template="${r.path}">
    <fieldset class="${css.classes('repeaterItem')}" data-fg-item tabindex="-1">
      <legend class="${css.classes('repeaterItemLabel')}" data-fg-item-label></legend>
${indentBlock(r.itemHtml, 3)}
      <div class="${css.classes('repeaterItemActions')}">${
        r.sortable
          ? `
        ${dragHandle('html', css, r.messages, { path: r.path, index: '', list: '' })}
        <button type="button" class="${css.classes('repeaterMove')}" data-fg-move="up">↑</button>
        <button type="button" class="${css.classes('repeaterMove')}" data-fg-move="down">↓</button>`
          : ''
      }
        <button type="button" class="${css.classes('repeaterRemove')}" data-fg-remove>${r.messages.removeItem}</button>
      </div>
    </fieldset>
  </template>
  <button type="button" class="${css.classes('repeaterAdd')}" data-fg-add="${r.path}">${r.addText}</button>
</fieldset>`

    const markup = renderTree(schema, {
      lang: 'html',
      css,
      accessor,
      conditionAttr,
      renderSections,
      renderRepeater,
      itemOptions: (path) => ({
        accessor: scopedAccessor(accessor, items, repeaterRef(path)),
        conditionAttr: (_node, expr) => {
          itemConditionTests.push(expr)
          return ` data-fg-icond="${itemConditionTests.length - 1}"`
        },
      }),
    })

    const sectionsMeta = hosts.map((host) => ({
      key: host.key,
      kind: host.kind,
      count: host.sections.length,
      tabActive: css.classes('tabButtonActive'),
      tabBase: css.classes('tabButton'),
      stepActive: css.classes('stepItemActive'),
      stepBase: css.classes('stepItem'),
      stepPaths: host.sections.map((s) => s.paths),
      ...(hasRepeaters ? { stepRepeaters: host.sections.map((s) => s.repeaters) } : {}),
      announce:
        host.kind === 'steps'
          ? stepAnnouncements(host, messages)
          : [],
    }))

    const assets = css.assets(schema.meta.dir)
    const headAssets = [
      ...assets.links.map((href) => `  <link rel="stylesheet" href="${href}">`),
      ...assets.scripts.map((src) => `  <script src="${src}"></script>`),
    ].join('\n')

    // The runtime shows and hides parts with the hidden attribute; a class
    // setting display (flex rows, buttons) must not override it.
    const stylesheet = [exportStylesheet(css, schema), '[hidden] { display: none !important; }\n'].filter(Boolean).join('\n')
    const styleTag = stylesheet ? `  <style>\n${indentBlock(stylesheet, 1)}  </style>` : ''

    // Bottom actions row: omitted when the wizard embeds the submit.
    const actionsBlock = embeddedHost
      ? ''
      : `\n    <div class="${css.classes('actions')}"${sb.actionsStyle ? ` style="${sb.actionsStyle}"` : ''}>
      <button class="${submitClass}"${sb.buttonStyle ? ` style="${sb.buttonStyle}"` : ''} data-fg-submit type="submit"${sb.gatingHosts.length ? ' hidden' : ''}>${sb.text}</button>
    </div>`

    // Item fields too (by template path), for the per-type runtime.
    const typedFields = collectTemplateFields(schema)
    // Calculated fields: recomputed at the start of every updateConditions().
    const steps = calcSteps(schema)
    // Answers inside text: <span data-fg-answer> painted with every update.
    const answers = usesAnswers(schema.tree)
    // Save and continue later: answers kept in this browser until sent.
    const draft = usesDraft(schema)
    const hasUploads = uploadFields(typedFields).length > 0
    const signatures = hasSignature(schema.tree)
    const rich = hasRichText(schema.tree)
    const locations = hasLocation(schema.tree)
    // The spam check (meta.captcha): submit waits for a passed check.
    const captchaKey = captchaKeyOf(schema)
    const submitUrl = schema.meta.submit?.url
    // Upload forms that post show progress; submit waits for the upload.
    const progress = postsUploads(schema, typedFields)
    const submitBlock = progress
      ? `      fgUploadPaint('uploading', 0)
      // multipart: a JSON "data" part + one part per file; XMLHttpRequest reports upload progress
      fgSend(${jsString(submitUrl ?? '')}, ${jsString(schema.meta.submit?.method ?? 'POST')}, fgMultipart(data), function (percent) {
        fgUploadPaint('uploading', percent)
      }, function (ok) {
        fgUploadPaint(ok ? 'done' : 'failed', ok ? 100 : 0)${draft ? '\n        if (ok) fgDraftForget()' : ''}
        fgAnnounce(ok ? ${submittedText(messages)} : ${JSON.stringify(messages.uploadFailed)})
      })\n`
      : submitUrl
      ? `      fetch(${jsString(submitUrl)}, {
        method: ${jsString(schema.meta.submit?.method ?? 'POST')},
        ${hasUploads ? '// multipart: a JSON "data" part + one part per file\n        body: fgMultipart(data),' : "headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify(data),"}
      })${draft ? '\n        // Sent: the answers kept in this browser go.\n        .then(function (response) { if (response.ok) fgDraftForget() })' : ''}.catch(function (error) { console.error('Submit failed', error) })\n`
      : draft
      ? '      fgDraftForget()\n'
      : ''

    // Reset buttons: native form reset (restores the markup defaults) plus
    // chips, errors, touched state and conditional blocks.
    // Composite fields: slider handles can't cross (fill and value text
    // follow), a date range's end can't precede its start, and multiple
    // dates live in fgDates (painted as chips, in calendar order).
    const hasSlider = hasRangeSlider(schema)
    const hasRange = hasDateRange(schema)
    const hasDateList = hasDates(schema)
    const hasGrid = hasMatrix(schema)
    const hasPhone = phoneCountryFields(typedFields).length > 0
    // Wiring per root: the page at start, then each new repeater item.
    const wires: string[] = ['fgWireTags']
    const hasComposite = hasSlider || hasRange || hasDateList || hasPhone
    function htmlCompositeRuntime(): string {
      const parts: string[] = []
      if (hasSlider) {
        parts.push(`function fgDualPaint(wrap) {
  var from = wrap.querySelector('[data-fg-part="from"]')
  var to = wrap.querySelector('[data-fg-part="to"]')
  var min = Number(from.min)
  var max = Number(from.max)
  function pct(n) { return max > min ? ((n - min) / (max - min)) * 100 : 0 }
  var fill = wrap.querySelector('[data-fg-dual-fill]')
  fill.style.insetInlineStart = pct(Number(from.value)) + '%'
  fill.style.insetInlineEnd = (100 - pct(Number(to.value))) + '%'
  // With both handles together, the one that can still move is on top.
  from.style.zIndex = from.value === to.value && Number(from.value) > (min + max) / 2 ? '3' : '1'
  to.style.zIndex = '2'
  var text = document.querySelector('[data-fg-dual-text="' + wrap.getAttribute('data-fg-dual') + '"]')
  if (text) text.textContent = from.value + ' \\u2013 ' + to.value
}
function fgWireDual(root) {
  fgEach(root, '[data-fg-dual]', function (wrap) {
    var from = wrap.querySelector('[data-fg-part="from"]')
    var to = wrap.querySelector('[data-fg-part="to"]')
    from.addEventListener('input', function () {
      if (Number(from.value) > Number(to.value)) from.value = to.value
      fgDualPaint(wrap)
    })
    to.addEventListener('input', function () {
      if (Number(to.value) < Number(from.value)) to.value = from.value
      fgDualPaint(wrap)
    })
    fgDualPaint(wrap)
  })
}`)
        wires.push('fgWireDual')
      }
      if (hasRange) {
        parts.push(`function fgRangeMin(from) {
  var to = document.querySelector('[data-fg-path="' + from.getAttribute('data-fg-path') + '"][data-fg-part="to"]')
  if (to) to.min = from.value
}
function fgWireRange(root) {
  fgEach(root, '[data-fg-kind="daterange"][data-fg-part="from"]', function (from) {
    from.addEventListener('input', function () { fgRangeMin(from) })
    from.addEventListener('change', function () { fgRangeMin(from) })
  })
}`)
        wires.push('fgWireRange')
      }
      if (hasDateList) {
        parts.push(`var fgDates = {}
function fgPaintDates(path) {
  var chips = document.querySelector('[data-fg-dates-chips="' + path + '"]')
  chips.textContent = ''
  chips.hidden = fgDates[path].length === 0
  fgDates[path].forEach(function (date, index) {
    var chip = document.createElement('span')
    chip.className = ${JSON.stringify(css.classes('tag'))}
    chip.appendChild(document.createTextNode(date + ' '))
    var remove = document.createElement('button')
    remove.type = 'button'
    remove.className = ${JSON.stringify(css.classes('tagRemove'))}
    remove.setAttribute('aria-label', ${jsTemplate(messages.removeDate, { date: 'date' })})
    remove.textContent = '\\u00d7'
    remove.addEventListener('click', function () {
      // The current path (an item's index may have changed since painting).
      var current = chips.getAttribute('data-fg-dates-chips')
      fgDates[current].splice(index, 1)
      fgDatesChanged(current)
    })
    chip.appendChild(remove)
    chips.appendChild(chip)
  })
}
function fgDatesChanged(path) {
  fgPaintDates(path)
  touched[path] = true
  validateField(path)
  updateConditions()
}
function fgWireDates(root) {
  fgEach(root, '[data-fg-kind="dates"]', function (wrap) {
    var input = wrap.querySelector('[data-fg-dates-input]')
    fgDates[wrap.getAttribute('data-fg-path')] = []
    function addDraft() {
      var path = wrap.getAttribute('data-fg-path')
      var date = input.value
      if (/^\\d{4}-\\d{2}-\\d{2}$/.test(date) && fgDates[path].indexOf(date) === -1) {
        fgDates[path].push(date)
        fgDates[path].sort()
      }
      input.value = ''
      fgDatesChanged(path)
    }
    wrap.querySelector('[data-fg-dates-add]').addEventListener('click', addDraft)
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); addDraft() }
    })
  })
}`)
        wires.push('fgWireDates')
      }
      if (hasPhone) {
        parts.push(`// A new country re-validates the number (its value changes too).
function fgWirePhone(root) {
  fgEach(root, '[data-fg-phone-country]', function (select) {
    select.addEventListener('change', function () {
      var path = select.getAttribute('data-fg-phone-country')
      if (touched[path]) validateField(path)
    })
  })
}`)
        wires.push('fgWirePhone')
      }
      return parts.join('\n')
    }
    // After form.reset(): repaint what form.reset() can't restore.
    const compositeReset = [
      hasSlider ? "\n        Array.prototype.forEach.call(document.querySelectorAll('[data-fg-dual]'), fgDualPaint)" : '',
      hasRange ? "\n        Array.prototype.forEach.call(document.querySelectorAll('[data-fg-kind=\"daterange\"][data-fg-part=\"to\"]'), function (to) { to.min = '' })" : '',
      hasDateList ? "\n        Object.keys(fgDates).forEach(function (path) { fgDates[path] = []; fgPaintDates(path) })" : '',
    ].join('')

    // Reset buttons and "Clear saved answers": native form reset (restores
    // the markup defaults) plus chips, errors, touched state and items.
    const resetBody = `        form.reset()
        Object.keys(fgTags).forEach(function (path) { fgTags[path] = [] })
        fgEach(document, '[data-fg-kind="tags"]', function (wrap) { if (wrap.fgPaint) wrap.fgPaint() })${hasUploads ? `
        Object.keys(fgFiles).forEach(function (path) {
          fgFiles[path] = []
          fgPaintFiles(path)
        })` : ''}${compositeReset}
        Object.keys(touched).forEach(function (path) { delete touched[path] })
        Object.keys(FG_VALIDATORS).forEach(function (path) { setError(path, null) })${hasRepeaters ? `
        // Top-level repeaters; inner ones go with their outer items.
        ;${JSON.stringify(repeaters.filter((r) => r.depth === 1).map((r) => r.path))}.forEach(function (path) {
          fgItemElements(path).forEach(function (item) { item.remove() })
          for (var n = 0; n < FG_REPEATERS[path].initial; n++) fgAddItem(path, false)
        })` : ''}
        document.getElementById('fg-result').hidden = true${rich ? `
        fgEach(document, '[data-fg-kind="richtext"]', function (el) { el.innerHTML = '' })` : ''}
        updateConditions()
`
    const resetScript = draft
      ? `    function fgResetForm() {
${resetBody.replace(/^ {2}/gm, '')}    }
${hasResetButton(schema) ? `    Array.prototype.forEach.call(document.querySelectorAll('[data-fg-reset]'), function (button) {
      button.addEventListener('click', function () {
        fgResetForm()
        fgAnnounce(${JSON.stringify(messages.formReset)})
      })
    })
` : ''}
`
      : hasResetButton(schema)
      ? `    Array.prototype.forEach.call(document.querySelectorAll('[data-fg-reset]'), function (button) {
      button.addEventListener('click', function () {
${resetBody}        fgAnnounce(${JSON.stringify(messages.formReset)})
      })
    })

`
      : ''

    // Upload progress: bar and text while sending, then done / failed.
    function uploadProgressScript(): string {
      return `    var fgUploadState = ''
    ${uploadTextHelper(messages, false).split('\n').join('\n    ')}
    function fgUploadPaint(state, percent) {
      fgUploadState = state
      var box = form.querySelector('[data-fg-upload]')
      var track = box.querySelector('[data-fg-upload-track]')
      var text = box.querySelector('[data-fg-upload-text]')
      box.hidden = false
      track.hidden = text.hidden = state === 'failed'
      box.querySelector('[data-fg-upload-failed]').hidden = state !== 'failed'
      track.setAttribute('aria-valuenow', String(percent))
      box.querySelector('[data-fg-upload-bar]').style.width = percent + '%'
      text.textContent = fgUploadText(state, percent)
      Array.prototype.forEach.call(form.querySelectorAll('[data-fg-submit]'), function (button) {
        button.disabled = state === 'uploading'${captchaKey ? " || fgCaptchaToken === ''" : ''}
      })
    }`
    }

    // Upload fields: chosen files live in fgFiles (the input is cleared
    // after each pick so the same file can be chosen again).
    function htmlUploadRuntime(): string {
      return `var fgFiles = {}
// Keyed by template path (items: "crew.cv"); see fgTpl.
var FG_FILE_MULTIPLE = ${JSON.stringify(Object.fromEntries(uploadFields(typedFields).map((f) => [f.path, fileLimits(f.node).multiple])))}
${hasRepeaters ? '' : tplHelper(false)}
function fgFileSize(bytes) {
  return bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB'
}
${dropFirstHelper(messages, false)}
// "Only one file fits here, …" under a field ('' hides it); cleared by the next change.
function fgFileNote(path, text) {
  var note = document.querySelector('[data-fg-file-note="' + path + '"]')
  if (!note) return
  note.textContent = text
  note.hidden = text === ''
}
function fgPaintFiles(path) {
  fgFileNote(path, '')
  var list = document.querySelector('[data-fg-file-list="' + path + '"]')
  var input = fgControl(path)
  if (!list || !input) return
  Array.prototype.forEach.call(list.querySelectorAll('img'), function (img) { URL.revokeObjectURL(img.src) })
  list.textContent = ''
  list.hidden = fgFiles[path].length === 0
  fgFiles[path].forEach(function (file, index) {
    var item = document.createElement('li')
    item.className = ${JSON.stringify(css.classes('fileItem'))}
    if (input.hasAttribute('data-fg-thumbs') && file.type.indexOf('image/') === 0) {
      var img = document.createElement('img')
      img.className = ${JSON.stringify(css.classes('fileThumb'))}
      img.src = URL.createObjectURL(file)
      img.alt = ''
      img.width = 40
      img.height = 40
      item.appendChild(img)
    }
    var name = document.createElement('span')
    name.className = ${JSON.stringify(css.classes('fileName'))}
    name.textContent = file.name
    var size = document.createElement('span')
    size.className = ${JSON.stringify(css.classes('fileSize'))}
    size.textContent = fgFileSize(file.size)
    var remove = document.createElement('button')
    remove.type = 'button'
    remove.className = ${JSON.stringify(css.classes('fileRemove'))}
    remove.textContent = '\\u00d7'
    remove.setAttribute('aria-label', ${JSON.stringify(messages.removeFile)}.split('{name}').join(file.name))
    remove.addEventListener('click', function () {
      // The current path (an item's index may have changed since painting).
      var current = list.getAttribute('data-fg-file-list')
      fgFiles[current].splice(index, 1)
      fgPaintFiles(current)
      touched[current] = true
      validateField(current)
      updateConditions()
    })
    item.appendChild(name)
    item.appendChild(size)
    item.appendChild(remove)
    list.appendChild(item)
  })
}
function fgWireFiles(root) {
  // Signature pads hold their PNG in fgFiles too (see fgWireSignatures).
  fgEach(root, '[data-fg-kind="signature"]', function (canvas) {
    fgFiles[canvas.getAttribute('data-fg-path')] = []
  })
  fgEach(root, '[data-fg-kind="files"]', function (input) {
    fgFiles[input.getAttribute('data-fg-path')] = []
    // The input covers its drop zone; mark the zone while files are over it.
    var drag = function (on) {
      return function () { input.parentElement.toggleAttribute('data-fg-dragging', on) }
    }
    input.addEventListener('dragenter', drag(true))
    input.addEventListener('dragleave', drag(false))
    input.addEventListener('drop', function (event) {
      input.parentElement.removeAttribute('data-fg-dragging')
      var note = fgDropFirst(input, event)
      if (!note) return
      fgFileNote(input.getAttribute('data-fg-path'), note)
      fgAnnounce(note)
    })
    input.addEventListener('change', function () {
      var path = input.getAttribute('data-fg-path')
      var picked = Array.prototype.slice.call(input.files || [])
      input.value = ''
      if (picked.length === 0) return
      fgFiles[path] = FG_FILE_MULTIPLE[fgTpl(path)] ? fgFiles[path].concat(picked) : picked.slice(0, 1)
      fgPaintFiles(path)
      touched[path] = true
      validateField(path)
    })
  })
}`
    }

    // Per-path stores re-keyed when items move (see fgRemapItems).
    const itemStores = ['touched', 'fgTags', ...(hasDateList ? ['fgDates'] : []), ...(hasUploads ? ['fgFiles'] : [])]
    function repeaterRuntime(): string {
      const repeaterMeta = Object.fromEntries(
        repeaters.map((r) => [
          r.path,
          {
            key: r.key,
            min: r.limits.min,
            max: Number.isFinite(r.limits.max) ? r.limits.max : null,
            initial: r.limits.initial,
            label: r.itemLabel,
          },
        ]),
      )
      return `// Repeating sections: items are clones of a <template>; the index in
// ids and data paths is stamped on add and rewritten when an item above
// is removed (errors and touched state move with their item).
var FG_REPEATERS = ${JSON.stringify(repeaterMeta).replace(/</g, '\\u003c')}
var ITEM_TOKENS = ${JSON.stringify(ITEM_TOKENS)}
/** Initial items and add buttons of the repeaters under root (a new item's inner ones). */
function fgInitRepeaters(root) {
  Array.prototype.forEach.call(root.querySelectorAll('[data-fg-add]'), function (button) {
    var path = button.getAttribute('data-fg-add')
    for (var n = 0; n < FG_REPEATERS[fgTpl(path)].initial; n++) fgAddItem(path, false)
    button.addEventListener('click', function () { fgAddItem(button.getAttribute('data-fg-add'), true) })
  })
}
// Is a repeater (concrete path) shown? An inner one asks its outer item (i).
var FG_REPEATER_VISIBLE = {
${repeaters
  .map((r) => {
    if (r.depth === 1) {
      return `  ${JSON.stringify(r.path)}: function () { return ${r.conditionChain.length ? r.conditionChain.map((g) => `(${compileConditions(g, accessor)})`).join(' && ') : 'true'} },`
    }
    const outer = scopedAccessor(accessor, items, { path: r.parent!, depth: 1, parent: null })
    const cond = r.itemConditionChain.length ? r.itemConditionChain.map((g) => `(${compileConditions(g, outer)})`).join(' && ') : 'true'
    return `  ${JSON.stringify(r.path)}: function (path) { var i = fgPathIndexes(path)[0]; return ${cond} },`
  })
  .join('\n')}
}
// Names of each repeater's inner repeaters (one level).
var FG_INNER_REPEATERS = ${JSON.stringify(
        Object.fromEntries(repeaters.map((r) => [r.path, repeaters.filter((x) => x.parent === r.path).map((x) => x.path.slice(r.path.length + 1))])),
      )}
// Item validators take the item indexes (an inner item: i, j).
var FG_ITEM_VALIDATORS = ${itemValidatorsLiteral(repeaters, accessor, items, (r) => (r.depth === 1 ? 'i' : 'i, j'), messages)}
var FG_ITEM_CONDITIONS = [
${itemConditionTests.map((expr) => `  function (i, j) { return ${expr} },`).join('\n')}
]
${tplHelper(false)}
function fgPathIndexes(path) {
  return path.split('.').filter(function (s) { return /^\\d+$/.test(s) }).map(Number)
}
function fgItemElements(path) {
  var list = document.querySelector('[data-fg-items="' + path + '"]')
  return list ? Array.prototype.slice.call(list.children) : []
}
function fgItemIndexes(path) {
  return fgItemElements(path).map(function (_, i) { return i })
}
function fgItemLabel(path, index) {
  return FG_REPEATERS[fgTpl(path)].label.split('{n}').join(String(index + 1))
}
// Every item field path of a shown repeater, inner items included.
function fgItemPaths(path) {
  var template = fgTpl(path)
  if (!FG_REPEATER_VISIBLE[template](path)) return []
  var fields = Object.keys(FG_ITEM_VALIDATORS[template] || {})
  var out = []
  fgItemElements(path).forEach(function (_, i) {
    fields.forEach(function (field) { out.push(path + '.' + i + '.' + field) })
    ;(FG_INNER_REPEATERS[template] || []).forEach(function (name) { out = out.concat(fgItemPaths(path + '.' + i + '.' + name)) })
  })
  return out
}
function fgAllPaths() {
  var out = Object.keys(FG_VALIDATORS)
  ;${JSON.stringify(repeaters.filter((r) => r.depth === 1).map((r) => r.path))}.forEach(function (path) { out = out.concat(fgItemPaths(path)) })
  return out
}
function fgStepPaths(meta, index) {
  var out = (meta.stepPaths[index] || []).slice()
  ;(meta.stepRepeaters[index] || []).forEach(function (path) { out = out.concat(fgItemPaths(path)) })
  return out
}
function fgValidatorFor(path) {
  if (FG_VALIDATORS[path]) return FG_VALIDATORS[path]
  var match = /^(.+)\\.(\\d+)\\.([^.]+)$/.exec(path)
  var validate = match && FG_ITEM_VALIDATORS[fgTpl(match[1])] && FG_ITEM_VALIDATORS[fgTpl(match[1])][match[3]]
  if (!validate) return null
  var indexes = fgPathIndexes(path)
  return function () { return validate.apply(null, indexes) }
}
/** Elements below root, including inner repeaters' <template> contents. */
function fgStampNodes(root) {
  var nodes = (root.nodeType === 1 ? [root] : []).concat(Array.prototype.slice.call(root.querySelectorAll('*')))
  nodes.filter(function (el) { return el.tagName === 'TEMPLATE' }).forEach(function (t) { nodes = nodes.concat(fgStampNodes(t.content)) })
  return nodes
}
/** Rewrites one item's index in every attribute below it. */
function fgStampIndex(root, path, from, to) {
  var key = path.replace(/\\./g, '_')
  var swaps = [[path + '.' + from + '.', path + '.' + to + '.'], [key + '_' + from + '_', key + '_' + to + '_']]
  var nodes = fgStampNodes(root)
  nodes.forEach(function (el) {
    Array.prototype.forEach.call(el.attributes, function (attr) {
      var value = attr.value
      swaps.forEach(function (s) { value = value.split(s[0]).join(s[1]) })
      if (value !== attr.value) el.setAttribute(attr.name, value)
    })
  })
}
function fgRefreshItems(path) {
  var list = fgItemElements(path)
  var meta = FG_REPEATERS[fgTpl(path)]
  // Re-index in two passes (via a unique temporary index), so two items
  // never share radio group names on the way: that would uncheck an answer.
  ;['t', ''].forEach(function (pass) {
    list.forEach(function (item, index) {
      var current = item.getAttribute('data-fg-index')
      if (current === String(index)) return
      fgStampIndex(item, path, current, pass + index)
      item.setAttribute('data-fg-index', pass + index)
    })
  })
  list.forEach(function (item, index) {
    // The item's own label and buttons (an inner item has its own too).
    item.querySelector(':scope > [data-fg-item-label]').textContent = fgItemLabel(path, index)
    var remove = item.querySelector(':scope > div > [data-fg-remove]')
    remove.setAttribute('aria-label', ${JSON.stringify(messages.removeItemLabel)}.split('{label}').join(fgItemLabel(path, index)))
    remove.hidden = list.length <= meta.min${
      repeaters.some((r) => r.node.props['sortable'] === true)
        ? `
    var handle = item.querySelector(':scope > div > [data-fg-handle]')
    if (handle) handle.hidden = list.length < 2
    var up = item.querySelector(':scope > div > [data-fg-move="up"]')
    var down = item.querySelector(':scope > div > [data-fg-move="down"]')
    if (up) {
      up.hidden = index === 0
      up.setAttribute('aria-label', ${JSON.stringify(messages.moveItemUp)}.split('{label}').join(fgItemLabel(path, index)))
    }
    if (down) {
      down.hidden = index === list.length - 1
      down.setAttribute('aria-label', ${JSON.stringify(messages.moveItemDown)}.split('{label}').join(fgItemLabel(path, index)))
    }`
        : ''
    }
    // The actions row shows while any of its buttons does.
    remove.parentNode.hidden = !Array.prototype.some.call(remove.parentNode.children, function (b) { return !b.hidden })
  })
  var add = document.querySelector('[data-fg-add="' + path + '"]')
  if (add) add.hidden = meta.max !== null && list.length >= meta.max
}
/** Re-keys item paths in a per-path store: to(old index) → new index, or null (gone). */
function fgRemapKeys(store, path, to) {
  var prefix = path + '.'
  var next = {}
  Object.keys(store).forEach(function (key) {
    if (key.indexOf(prefix) !== 0) { next[key] = store[key]; return }
    var rest = key.slice(prefix.length)
    var n = Number(rest.split('.')[0])
    var target = to(n)
    if (target !== null) next[prefix + target + rest.slice(String(n).length)] = store[key]
  })
  Object.keys(store).forEach(function (key) { delete store[key] })
  Object.keys(next).forEach(function (key) { store[key] = next[key] })
}
/** Touched state and field values kept outside the DOM follow their item. */
function fgRemapItems(path, to) {
  [${itemStores.join(', ')}].forEach(function (store) { fgRemapKeys(store, path, to) })
}
function fgAddItem(path, focus) {
  var meta = FG_REPEATERS[fgTpl(path)]
  var list = document.querySelector('[data-fg-items="' + path + '"]')
  var template = document.querySelector('[data-fg-template="' + path + '"]')
  var index = list.children.length
  if (meta.max !== null && index >= meta.max) return
  var item = template.content.firstElementChild.cloneNode(true)
  fgStampIndex(item, path, ITEM_TOKENS[fgPathIndexes(path).length], index)
  item.setAttribute('data-fg-index', String(index))
  // Paths are read on click: an outer item's index may have changed since.
  function listPath() { return item.parentNode.getAttribute('data-fg-items') }
  item.querySelector(':scope > div > [data-fg-remove]').addEventListener('click', function () {
    fgRemoveItem(listPath(), Number(item.getAttribute('data-fg-index')))
  })
${
  repeaters.some((r) => r.node.props['sortable'] === true)
    ? `  Array.prototype.forEach.call(item.querySelectorAll(':scope > div > [data-fg-move]'), function (button) {
    button.addEventListener('click', function () {
      fgMoveItem(listPath(), Number(item.getAttribute('data-fg-index')), button.getAttribute('data-fg-move') === 'up' ? -1 : 1)
    })
  })
  fgWireItemDrag(item, listPath)`
    : ''
}
  list.appendChild(item)
  fgWire(item)
  fgInitRepeaters(item)
  fgRefreshItems(path)
  updateConditions()
  if (focus) {
    var control = item.querySelector('input:not([type=hidden]), select, textarea')
    ;(control || item).focus()
    fgAnnounce(${JSON.stringify(messages.itemAdded)}.split('{label}').join(fgItemLabel(path, index)))
  }
}
${
  repeaters.some((r) => r.node.props['sortable'] === true)
    ? `/** Swaps an item with its neighbour; focus stays on the moved item. */
function fgMoveItem(path, index, delta) {
  var items = fgItemElements(path)
  var target = index + delta
  if (target < 0 || target >= items.length) return
  var label = fgItemLabel(path, index)
  fgRemapItems(path, function (n) { return n === index ? target : n === target ? index : n })
  var list = items[index].parentNode
  if (delta < 0) list.insertBefore(items[index], items[target])
  else list.insertBefore(items[target], items[index])
  fgRefreshItems(path)
  updateConditions()
  var moved = fgItemElements(path)[target]
  var same = moved.querySelector(':scope > div > [data-fg-move="' + (delta < 0 ? 'up' : 'down') + '"]')
  var other = moved.querySelector(':scope > div > [data-fg-move="' + (delta < 0 ? 'down' : 'up') + '"]')
  ;(same && !same.hidden ? same : other && !other.hidden ? other : moved).focus()
  fgAnnounce(${JSON.stringify(messages.itemMoved)}.split('{label}').join(label).split('{n}').join(String(target + 1)))
}
${htmlItemDrag(messages)}
`
    : ''
}function fgRemoveItem(path, index) {
  var items = fgItemElements(path)
  if (items.length <= FG_REPEATERS[fgTpl(path)].min) return
  var label = fgItemLabel(path, index)
  fgRemapItems(path, function (n) { return n === index ? null : n > index ? n - 1 : n })
  items[index].remove()
  fgRefreshItems(path)
  updateConditions()
  fgItemPaths(path).forEach(function (p) { if (touched[p]) validateField(p); else setError(p, null) })
  var remaining = fgItemElements(path)
  var target = remaining[Math.min(index, remaining.length - 1)] || document.querySelector('[data-fg-add="' + path + '"]')
  if (target) target.focus()
  fgAnnounce(${JSON.stringify(messages.itemRemoved)}.split('{label}').join(label))
}`
    }
    // Initial items, created once everything they wire into is defined.
    const repeaterInit = hasRepeaters ? `    fgInitRepeaters(document)\n` : ''

    const uploadRuntime = hasUploads ? htmlUploadRuntime() : ''
    if (hasUploads) wires.push('fgWireFiles')
    const compositeRuntime = hasComposite ? htmlCompositeRuntime() : ''
    const script = `  <script>
  (function () {
    'use strict'
    ${RUNTIME_HELPERS.split('\n').join('\n    ')}${hasUploads ? `\n    ${FILE_HELPERS.split('\n').join('\n    ')}` : ''}

    var fgTags = {}
    /** Each element under root (root included) matching selector. */
    function fgEach(root, selector, fn) {
      if (root.matches && root.matches(selector)) fn(root)
      Array.prototype.forEach.call(root.querySelectorAll(selector), fn)
    }
    function fgControl(path) {
      return document.querySelector('[data-fg-path="' + path + '"]')
    }
    function fgGet(path) {
      var el = fgControl(path)
      if (!el) return undefined
      var kind = el.getAttribute('data-fg-kind')
      if (kind === 'checkbox') return el.checked
      if (kind === 'select') return el.value === '' ? null : el.value
      if (kind === 'number') return el.value === '' ? null : Number(el.value)${steps.length ? `
      if (kind === 'calculated') {
        var stored = el.getAttribute('data-fg-value')
        return stored === null || stored === '' ? null : Number(stored)
      }` : ''}
      if (kind === 'radio') {
        var checked = document.querySelector('[data-fg-path="' + path + '"]:checked')
        return checked ? checked.value : null
      }
      if (kind === 'multiselect') {
        return Array.prototype.map.call(el.selectedOptions, function (option) { return option.value })
      }
      if (kind === 'range2' || kind === 'daterange') {
        var parts = {}
        Array.prototype.forEach.call(document.querySelectorAll('[data-fg-path="' + path + '"][data-fg-part]'), function (input) {
          parts[input.getAttribute('data-fg-part')] = kind === 'range2' ? Number(input.value) : input.value
        })
        return { from: parts.from, to: parts.to }
      }
      if (kind === 'dates') return (fgDates[path] || []).slice()${hasGrid ? `
      if (kind === 'matrix') {
        var answers = {}
        // Radios: the chosen column per row; checkboxes: the chosen columns.
        Array.prototype.forEach.call(document.querySelectorAll('[data-fg-path="' + path + '"]'), function (cell) {
          var row = cell.getAttribute('data-fg-row')
          var several = cell.type === 'checkbox'
          if (!(row in answers)) answers[row] = several ? [] : null
          if (cell.checked) {
            if (several) answers[row].push(cell.value)
            else answers[row] = cell.value
          }
        })
        return answers
      }` : ''}${hasPhone ? `
      if (kind === 'phone') {
        var country = document.querySelector('[data-fg-phone-country="' + path + '"]')
        var dial = country && country.selectedOptions[0] ? country.selectedOptions[0].getAttribute('data-dial') : ''
        return el.value.trim() === '' ? '' : '+' + dial + ' ' + el.value
      }` : ''}
      if (kind === 'tags') return (fgTags[path] || []).slice()${rich ? `
      if (kind === 'richtext') return fgRichClean(el.innerHTML)` : ''}${locations ? `
      if (kind === 'location') return fgLocTyped(el.closest('[data-fg-loc]'))` : ''}${hasUploads ? `
      if (kind === 'files' || kind === 'signature') return (fgFiles[path] || []).slice()` : ''}
      if (kind === 'checks') {
        return Array.prototype.map.call(
          document.querySelectorAll('[data-fg-path="' + path + '"]:checked'),
          function (box) { return box.value },
        )
      }
      return el.value
    }

    ${visibilityFunctions(fields, accessor).split('\n').join('\n    ')}

    var FG_CONDITIONS = [
${conditionTests.map((expr, i) => `      { index: ${i}, test: function () { return ${expr} } },`).join('\n')}
    ]

    var FG_VALIDATORS = ${validatorsLiteral(fields, accessor, '', undefined, messages).split('\n').join('\n    ')}

    var touched = {}

    function fgKey(path) { return path.replace(/\\./g, '_') }

    function setError(path, message) {
      var el = document.getElementById('fg_err_' + fgKey(path))
      var control = fgControl(path)
      var invalid = ${JSON.stringify('INVALID_CLASS_PLACEHOLDER')}.split(' ').filter(Boolean)
      if (el) {
        el.textContent = message || ''
        el.hidden = !message
      }
      Array.prototype.forEach.call(control ? document.querySelectorAll('[data-fg-path="' + path + '"]') : [], function (box) {
        invalid.forEach(function (cls) { box.classList.toggle(cls, Boolean(message)) })
        if (message) box.setAttribute('aria-invalid', 'true')
        else box.removeAttribute('aria-invalid')
      })
    }

    function validateField(path) {
      var validate = ${hasRepeaters ? 'fgValidatorFor(path)' : 'FG_VALIDATORS[path]'}
      if (!validate) return true
      var message = validate()
      setError(path, message)
      return !message
    }

    function fgHasError(path) {
      var validate = ${hasRepeaters ? 'fgValidatorFor(path)' : 'FG_VALIDATORS[path]'}
      return validate ? Boolean(validate()) : false
    }

${steps.length ? `    ${htmlCalcBlock(steps).split('\n').join('\n    ')}\n` : ''}${answers ? `    ${htmlAnswerPainter(fieldsByPath(schema.tree), messages, listSeparator(schema.meta.locale)).split('\n').join('\n    ')}\n` : ''}    function updateConditions() {${steps.length ? '\n      fgCalcAll()' : ''}${answers ? '\n      fgPaintAnswers()' : ''}${signatures ? "\n      fgSignSync(form, function (canvas) { return (fgFiles[canvas.getAttribute('data-fg-path')] || [])[0] || null })" : ''}${locations ? '\n      fgLocPins(form)' : ''}
      FG_CONDITIONS.forEach(function (c) {
        var el = document.querySelector('[data-fg-cond="' + c.index + '"]')
        if (el) el.hidden = !c.test()
      })${draft ? '\n      fgDraftSave()' : ''}${hasRepeaters ? `
      // Item conditions get the enclosing items' indexes (outer i, inner j).
      Array.prototype.forEach.call(document.querySelectorAll('[data-fg-icond]'), function (el) {
        var indexes = []
        for (var p = el.parentElement; p; p = p.parentElement) {
          if (p.hasAttribute('data-fg-item')) indexes.unshift(Number(p.getAttribute('data-fg-index')))
        }
        el.hidden = !FG_ITEM_CONDITIONS[Number(el.getAttribute('data-fg-icond'))](indexes[0], indexes[1])
      })` : ''}
    }
${hasRepeaters ? `
${indentBlock(repeaterRuntime(), 2)}
` : ''}

    // Tags (chips) fields: value lives in fgTags, chips are painted into
    // the [data-fg-tags-chips] span, Enter/comma/blur adds the draft. The
    // path is read when used: an item's index changes when items move.
    function fgWireTags(root) {
      fgEach(root, '[data-fg-kind="tags"]', fgWireTagsField)
    }
    function fgWireTagsField(wrap) {
      function fieldPath() { return wrap.getAttribute('data-fg-path') }
      fgTags[fieldPath()] = []
      var chips = wrap.querySelector('[data-fg-tags-chips]')
      var input = wrap.querySelector('[data-fg-tags-input]')
      if (!chips || !input) return
      function paint() {
        var path = fieldPath()
        chips.textContent = ''
        fgTags[path].forEach(function (tag, index) {
          var chip = document.createElement('span')
          chip.className = ${JSON.stringify(css.classes('tag'))}
          chip.appendChild(document.createTextNode(tag + ' '))
          var remove = document.createElement('button')
          remove.type = 'button'
          remove.className = ${JSON.stringify(css.classes('tagRemove'))}
          remove.setAttribute('aria-label', ${jsTemplate(messages.removeTag, { tag: 'tag' })})
          remove.textContent = '\\u00d7'
          remove.addEventListener('click', function () {
            var current = fieldPath()
            fgTags[current].splice(index, 1)
            paint()
            if (touched[current]) validateField(current)
            updateConditions()
          })
          chip.appendChild(remove)
          chips.appendChild(chip)
        })
      }
      function addDraft() {
        var path = fieldPath()
        var draft = input.value.trim()
        if (draft !== '' && fgTags[path].indexOf(draft) === -1) {
          fgTags[path].push(draft)
          paint()
        }
        input.value = ''
        if (touched[path]) validateField(path)
        updateConditions()
      }
      wrap.fgPaint = paint
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addDraft() }
      })
      input.addEventListener('blur', function () {
        addDraft()
        fgBlurValidate(fieldPath())
      })
    }

${uploadRuntime ? indentBlock(uploadRuntime, 2) + '\n\n' : ''}${compositeRuntime ? indentBlock(compositeRuntime, 2) + '\n\n' : ''}    function fgWire(root) {
${wires.map((w) => `      ${w}(root)`).join('\n')}
    }
    fgWire(document)

    // Polite aria-live region; cleared first so repeated text re-announces.
    function fgAnnounce(message) {
      var live = document.getElementById('fg-live')
      if (!live) return
      live.textContent = ''
      setTimeout(function () { live.textContent = message }, 50)
    }
    ${errorsTextFunction(messages, false).split('\n').join('\n    ')}

    var FG_SECTIONS = ${JSON.stringify(sectionsMeta).replace(/</g, '\\u003c')}
    var FG_SUBMIT_GATE = ${JSON.stringify(sb.gatingHosts.map((h) => h.key))}
    var fgSecState = {}
    function fgUpdateSubmit() {
      var btn = document.querySelector('[data-fg-submit]')
      if (!btn || FG_SUBMIT_GATE.length === 0) return
      var ready = FG_SUBMIT_GATE.every(function (key) {
        var meta = null
        FG_SECTIONS.forEach(function (m) { if (m.key === key) meta = m })
        return !meta || (fgSecState[key] || 0) >= meta.count - 1
      })
      btn.hidden = !ready
    }
    function fgSetSec(meta, index, speak) {
      fgSecState[meta.key] = index
      if (speak && meta.announce[index]) fgAnnounce(meta.announce[index])
      var panels = document.querySelectorAll('[data-fg-sec-panel]')
      Array.prototype.forEach.call(panels, function (panel) {
        var value = panel.getAttribute('data-fg-sec-panel')
        if (value.indexOf(meta.key + ':') === 0) panel.hidden = value !== meta.key + ':' + index
      })
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-fg-sec-btn^="' + meta.key + ':"]'),
        function (btn) {
          var active = btn.getAttribute('data-fg-sec-btn') === meta.key + ':' + index
          btn.className = active ? meta.tabActive : meta.tabBase
          btn.setAttribute('aria-selected', active ? 'true' : 'false')
        },
      )
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-fg-sec-item^="' + meta.key + ':"]'),
        function (item) {
          var active = item.getAttribute('data-fg-sec-item') === meta.key + ':' + index
          item.className = active ? meta.stepActive : meta.stepBase
        },
      )
      var back = document.querySelector('[data-fg-step-back="' + meta.key + '"]')
      var nextBtn = document.querySelector('[data-fg-step-next="' + meta.key + '"]')
      if (back) back.hidden = index === 0
      if (nextBtn) nextBtn.hidden = index >= meta.count - 1
      fgUpdateSubmit()
    }
    FG_SECTIONS.forEach(function (meta) {
      fgSecState[meta.key] = 0
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-fg-sec-btn^="' + meta.key + ':"]'),
        function (btn) {
          btn.addEventListener('click', function () {
            fgSetSec(meta, Number(btn.getAttribute('data-fg-sec-btn').split(':')[1]))
          })
        },
      )
      var back = document.querySelector('[data-fg-step-back="' + meta.key + '"]')
      var nextBtn = document.querySelector('[data-fg-step-next="' + meta.key + '"]')
      if (back) back.addEventListener('click', function () {
        fgSetSec(meta, Math.max(0, fgSecState[meta.key] - 1), true)
      })
      if (nextBtn) nextBtn.addEventListener('click', function () {
        var ok = true
        var paths = ${hasRepeaters ? 'fgStepPaths(meta, fgSecState[meta.key])' : 'meta.stepPaths[fgSecState[meta.key]] || []'}
        paths.forEach(function (path) {
          touched[path] = true
          if (!validateField(path)) ok = false
        })
        if (ok) fgSetSec(meta, Math.min(meta.count - 1, fgSecState[meta.key] + 1), true)
      })
      fgSetSec(meta, 0)
    })

    function buildPayload() {
      return ${payloadExpr(schema, accessor, undefined, items).split('\n').join('\n      ')}
    }

    var form = document.getElementById('fg-form')
    // A blur error appearing while a pointer is held reflows the form and
    // the release misses its target; defer blur validation until the press
    // ends (after the click has been dispatched).
    var fgPressing = false
    var fgDeferred = []
    function fgBlurValidate(path) {
      touched[path] = true
      if (fgPressing) {
        if (fgDeferred.indexOf(path) === -1) fgDeferred.push(path)
        return
      }
      validateField(path)
    }
    function fgFlushDeferred() {
      var paths = fgDeferred
      fgDeferred = []
      paths.forEach(function (path) { validateField(path) })
    }
    function fgPointerEnd() {
      if (!fgPressing) return
      fgPressing = false
      setTimeout(fgFlushDeferred, 0)
    }
    form.addEventListener('pointerdown', function () {
      fgFlushDeferred()
      fgPressing = true
    }, true)
    window.addEventListener('pointerup', fgPointerEnd)
    window.addEventListener('pointercancel', fgPointerEnd)
    form.addEventListener('focusout', function (event) {
      var path = event.target.getAttribute && event.target.getAttribute('data-fg-path')
      if (path) fgBlurValidate(path)
    })
    form.addEventListener('input', onFieldEvent)
    form.addEventListener('change', onFieldEvent)${rich ? `
    ${richTextRuntime(messages.richLinkPrompt, false).split('\n').join('\n    ')}
    // Editor changes also fire input events (validation, conditions run there).
    fgWireRichText(form, function () { updateConditions() })` : ''}${locations ? `
    ${locationRuntime(messages, false).split('\n').join('\n    ')}
    // Typing fires input events (validation, conditions run there); map
    // picks, "Use my location" and Clear report here.
    fgWireLocations(form, function (group, point, touch) {
      var path = fgLocParts(group).lat.getAttribute('data-fg-path')
      if (touch) {
        touched[path] = true
        validateField(path)
      }
      updateConditions()
    })` : ''}${signatures ? `
    ${signatureRuntime(false).split('\n').join('\n    ')}
    fgWireSignatures(form, function (canvas, file) {
      var path = canvas.getAttribute('data-fg-path')
      fgFiles[path] = file ? [file] : []
      touched[path] = true
      validateField(path)
      updateConditions()
    })` : ''}${captchaKey ? `
    ${captchaRuntime(false).split('\n').join('\n    ')}
    // The submit button waits for a passed check.
    var fgCaptchaToken = ''
    var fgCaptchaEl = form.querySelector('[data-fg-captcha]')
    function fgCaptchaPaint(failed) {
      var waiting = fgCaptchaToken === ''
      Array.prototype.forEach.call(form.querySelectorAll('[data-fg-submit]'), function (button) {
        button.disabled = waiting${progress ? " || fgUploadState === 'uploading'" : ''}
        if (waiting && !failed) button.setAttribute('aria-describedby', 'fg_captcha_hint')
        else button.removeAttribute('aria-describedby')
      })
      form.querySelector('[data-fg-captcha-hint]').hidden = !waiting || failed
      form.querySelector('[data-fg-captcha-failed]').hidden = !failed
    }
    fgCaptchaPaint(false)
    fgCaptcha(fgCaptchaEl, ${jsString(captchaKey)}, ${jsString(schema.meta.locale)}, function (token, failed) {
      fgCaptchaToken = token
      fgCaptchaPaint(failed)
    })` : ''}
    function onFieldEvent(event) {
      updateConditions()
      var path = event.target.getAttribute && event.target.getAttribute('data-fg-path')
      if (path && touched[path]) validateField(path)
    }

${progress ? `${uploadProgressScript()}\n` : ''}${resetScript}${draft ? `    ${draftHelpers(schema, 'html', false).split('\n').join('\n    ')}\n    ${htmlDraftRuntime(messages, { dates: hasDateList, repeaters: hasRepeaters }).split('\n').join('\n    ')}\n\n` : ''}    form.addEventListener('submit', function (event) {
      event.preventDefault()${progress ? "\n      if (fgUploadState === 'uploading') return" : ''}
      var failed = 0
      ${hasRepeaters ? 'fgAllPaths()' : 'Object.keys(FG_VALIDATORS)'}.forEach(function (path) {
        touched[path] = true
        if (!validateField(path)) failed++
      })
      if (failed > 0) {
        fgAnnounce(fgErrorsText(failed))
        // Move each tabs/steps host to its first section holding an error
        // (unless the visible one already shows one).
        FG_SECTIONS.forEach(function (meta) {
          var current = ${hasRepeaters ? 'fgStepPaths(meta, fgSecState[meta.key])' : 'meta.stepPaths[fgSecState[meta.key]] || []'}
          if (current.some(fgHasError)) return
          for (var i = 0; i < meta.stepPaths.length; i++) {
            if ((${hasRepeaters ? 'fgStepPaths(meta, i)' : 'meta.stepPaths[i] || []'}).some(fgHasError)) { fgSetSec(meta, i); break }
          }
        })
        return
      }
${captchaKey ? `      if (fgCaptchaToken === '') {
        fgAnnounce(${JSON.stringify(messages.captchaWait)})
        return
      }
` : ''}      var data = buildPayload()${captchaKey ? `
      data[${JSON.stringify(CAPTCHA_FIELD)}] = fgCaptchaToken
      // A token works once: a new check for the next submission.
      fgCaptchaToken = ''
      fgCaptchaReset(fgCaptchaEl)
      fgCaptchaPaint(false)` : ''}
      var out = document.getElementById('fg-result')
      out.textContent = JSON.stringify(data, ${hasUploads ? 'fgFileJson' : 'null'}, 2)
      out.hidden = false
      fgAnnounce(${progress ? JSON.stringify(messages.uploadStarted) : submittedText(messages)})
      console.log('Form submitted', data)
${submitBlock}    })

${repeaterInit}    updateConditions()${draft ? '\n    fgDraftStart()' : ''}
  })()
  </script>`

    const html = `<!doctype html>
<html lang="${esc(schema.meta.locale)}" dir="${schema.meta.dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(schema.meta.title ?? schema.meta.name)}</title>
${headAssets}${headAssets && styleTag ? '\n' : ''}${styleTag}
</head>
<body>
  <form id="fg-form" class="${formRootClass(css.classes('form'), schema.meta.theme)}"${pinnedSchemeAttr(schema.meta.theme)} novalidate>${draft ? `\n${indentBlock(draftBar('html', schema, css, messages), 2)}` : ''}
    <div class="${css.classes('grid')}">
${indentBlock(markup, 3)}
    </div>
${progress ? `    ${uploadStatusMarkup('html', css, messages)}\n` : ''}${captchaKey ? `${indentHtml(captchaMarkup('html', css, messages), 4)}\n` : ''}    <div id="fg-live" class="${css.classes('srOnly')}" role="status" aria-live="polite" aria-atomic="true"></div>${actionsBlock}
    <pre id="fg-result" class="${css.classes('payload')}" hidden></pre>
  </form>
${script}
</body>
</html>
`

    return [
      {
        path: `${schema.meta.name}.html`,
        language: 'xml',
        content: html.replace('INVALID_CLASS_PLACEHOLDER', css.invalidClass()),
      },
    ]
  },
  readme: (ctx) => `# ${ctx.schema.meta.title ?? ctx.schema.meta.name} (HTML + vanilla JS)

Open \`${ctx.schema.meta.name}.html\` in any browser — no build step.
Validation, conditional visibility and the submit payload are compiled in;
a valid submit prints the payload below the form and to the console${ctx.schema.meta.submit?.url ? `, and POSTs it to \`${ctx.schema.meta.submit.url}\`` : ''}.

${ctx.css.readmeNote()}
${ctx.css.assets().links.length + ctx.css.assets().scripts.length > 0 ? '\nThe framework is referenced from a CDN in `<head>` — swap those tags for your local build when embedding in a real project.' : ''}
${servicesReadme(ctx.schema, 'html')}`,
}
