// Self-contained HTML + vanilla JS export: semantic markup, compiled
// validation/conditions/payload, no build step. Vanilla CSS embeds the
// stylesheet; Tailwind/Bootstrap reference their CDN assets in <head>
// (swappable for local builds, see the generated README).

import type { ElementNode } from '@formsgen/renderer'
import { RUNTIME_HELPERS } from '../compile'
import {
  collectExportFields,
  payloadExpr,
  validatorsLiteral,
  visibilityFunctions,
} from '../logic'
import { renderTree, stepButtonLabels, type RenderedSectionHost } from '../markup'
import { collectSectionHosts, resolveSubmitButton } from '../structure'
import { esc } from '@/registry/emitters/shared'
import type { ExportTarget } from './types'

function indentBlock(text: string, depth: number): string {
  const pad = '  '.repeat(depth)
  return text
    .split('\n')
    .map((line) => (line === '' ? line : pad + line))
    .join('\n')
}

export const htmlTarget: ExportTarget = {
  id: 'html',
  label: 'HTML + JS',
  description: 'One self-contained .html file — opens from disk, no build step.',
  frameworkAware: true,
  generate: ({ schema, css }) => {
    const accessor = (path: string): string => `fgGet(${JSON.stringify(path)})`
    const fields = collectExportFields(schema)
    const hosts = collectSectionHosts(schema)

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
            `  <div data-fg-sec-panel="${host.key}:${s.index}"${s.index > 0 ? ' hidden' : ''}>\n${indentBlock(s.html, 1)}\n  </div>`,
        )
        .join('\n')
      if (host.kind === 'tabs') {
        const buttons = host.sections
          .map(
            (s) =>
              `    <button type="button" class="${s.index === 0 ? css.classes('tabButtonActive') : css.classes('tabButton')}" data-fg-sec-btn="${host.key}:${s.index}">${s.label}</button>`,
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

    const markup = renderTree(schema, { lang: 'html', css, accessor, conditionAttr, renderSections })

    const sectionsMeta = hosts.map((host) => ({
      key: host.key,
      kind: host.kind,
      count: host.sections.length,
      tabActive: css.classes('tabButtonActive'),
      tabBase: css.classes('tabButton'),
      stepActive: css.classes('stepItemActive'),
      stepBase: css.classes('stepItem'),
      stepPaths: host.sections.map((s) => s.paths),
    }))

    const assets = css.assets()
    const headAssets = [
      ...assets.links.map((href) => `  <link rel="stylesheet" href="${href}">`),
      ...assets.scripts.map((src) => `  <script src="${src}"></script>`),
    ].join('\n')

    const stylesheet = css.stylesheet?.(schema.meta.theme)
    const styleTag = stylesheet ? `  <style>\n${indentBlock(stylesheet, 1)}  </style>` : ''

    // Bottom actions row: omitted when the wizard embeds the submit.
    const actionsBlock = embeddedHost
      ? ''
      : `\n    <div class="${css.classes('actions')}"${sb.actionsStyle ? ` style="${sb.actionsStyle}"` : ''}>
      <button class="${submitClass}"${sb.buttonStyle ? ` style="${sb.buttonStyle}"` : ''} data-fg-submit type="submit"${sb.gatingHosts.length ? ' hidden' : ''}>${sb.text}</button>
    </div>`

    const submitUrl = schema.meta.submit?.url
    const submitBlock = submitUrl
      ? `      fetch(${JSON.stringify(submitUrl)}, {
        method: ${JSON.stringify(schema.meta.submit?.method ?? 'POST')},
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(function (error) { console.error('Submit failed', error) })\n`
      : ''

    const script = `  <script>
  (function () {
    'use strict'
    ${RUNTIME_HELPERS.split('\n').join('\n    ')}

    var fgTags = {}
    function fgControl(path) {
      return document.querySelector('[data-fg-path="' + path + '"]')
    }
    function fgGet(path) {
      var el = fgControl(path)
      if (!el) return undefined
      var kind = el.getAttribute('data-fg-kind')
      if (kind === 'checkbox') return el.checked
      if (kind === 'select') return el.value === '' ? null : el.value
      if (kind === 'number') return el.value === '' ? null : Number(el.value)
      if (kind === 'radio') {
        var checked = document.querySelector('[data-fg-path="' + path + '"]:checked')
        return checked ? checked.value : null
      }
      if (kind === 'multiselect') {
        return Array.prototype.map.call(el.selectedOptions, function (option) { return option.value })
      }
      if (kind === 'tags') return (fgTags[path] || []).slice()
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

    var FG_VALIDATORS = ${validatorsLiteral(fields, accessor).split('\n').join('\n    ')}

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
      if (control) {
        invalid.forEach(function (cls) { control.classList.toggle(cls, Boolean(message)) })
      }
    }

    function validateField(path) {
      var validate = FG_VALIDATORS[path]
      if (!validate) return true
      var message = validate()
      setError(path, message)
      return !message
    }

    function fgHasError(path) {
      var validate = FG_VALIDATORS[path]
      return validate ? Boolean(validate()) : false
    }

    function updateConditions() {
      FG_CONDITIONS.forEach(function (c) {
        var el = document.querySelector('[data-fg-cond="' + c.index + '"]')
        if (el) el.hidden = !c.test()
      })
    }

    // Tags (chips) fields: value lives in fgTags, chips are painted into
    // the [data-fg-tags-chips] span, Enter/comma/blur adds the draft.
    Array.prototype.forEach.call(document.querySelectorAll('[data-fg-kind="tags"]'), function (wrap) {
      var path = wrap.getAttribute('data-fg-path')
      fgTags[path] = []
      var chips = wrap.querySelector('[data-fg-tags-chips="' + path + '"]')
      var input = wrap.querySelector('[data-fg-tags-input="' + path + '"]')
      if (!chips || !input) return
      function paint() {
        chips.textContent = ''
        fgTags[path].forEach(function (tag, index) {
          var chip = document.createElement('span')
          chip.className = ${JSON.stringify(css.classes('tag'))}
          chip.appendChild(document.createTextNode(tag + ' '))
          var remove = document.createElement('button')
          remove.type = 'button'
          remove.className = ${JSON.stringify(css.classes('tagRemove'))}
          remove.setAttribute('aria-label', 'Remove ' + tag)
          remove.textContent = '\\u00d7'
          remove.addEventListener('click', function () {
            fgTags[path].splice(index, 1)
            paint()
            if (touched[path]) validateField(path)
            updateConditions()
          })
          chip.appendChild(remove)
          chips.appendChild(chip)
        })
      }
      function addDraft() {
        var draft = input.value.trim()
        if (draft !== '' && fgTags[path].indexOf(draft) === -1) {
          fgTags[path].push(draft)
          paint()
        }
        input.value = ''
        if (touched[path]) validateField(path)
        updateConditions()
      }
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addDraft() }
      })
      input.addEventListener('blur', function () {
        addDraft()
        touched[path] = true
        validateField(path)
      })
    })

    var FG_SECTIONS = ${JSON.stringify(sectionsMeta)}
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
    function fgSetSec(meta, index) {
      fgSecState[meta.key] = index
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
        fgSetSec(meta, Math.max(0, fgSecState[meta.key] - 1))
      })
      if (nextBtn) nextBtn.addEventListener('click', function () {
        var ok = true
        var paths = meta.stepPaths[fgSecState[meta.key]] || []
        paths.forEach(function (path) {
          touched[path] = true
          if (!validateField(path)) ok = false
        })
        if (ok) fgSetSec(meta, Math.min(meta.count - 1, fgSecState[meta.key] + 1))
      })
      fgSetSec(meta, 0)
    })

    function buildPayload() {
      return ${payloadExpr(schema, accessor).split('\n').join('\n      ')}
    }

    var form = document.getElementById('fg-form')
    form.addEventListener('focusout', function (event) {
      var path = event.target.getAttribute && event.target.getAttribute('data-fg-path')
      if (path) { touched[path] = true; validateField(path) }
    })
    form.addEventListener('input', onFieldEvent)
    form.addEventListener('change', onFieldEvent)
    function onFieldEvent(event) {
      updateConditions()
      var path = event.target.getAttribute && event.target.getAttribute('data-fg-path')
      if (path && touched[path]) validateField(path)
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault()
      var ok = true
      Object.keys(FG_VALIDATORS).forEach(function (path) {
        touched[path] = true
        if (!validateField(path)) ok = false
      })
      if (!ok) {
        // Move each tabs/steps host to its first section holding an error
        // (unless the visible one already shows one).
        FG_SECTIONS.forEach(function (meta) {
          var current = meta.stepPaths[fgSecState[meta.key]] || []
          if (current.some(fgHasError)) return
          for (var i = 0; i < meta.stepPaths.length; i++) {
            if ((meta.stepPaths[i] || []).some(fgHasError)) { fgSetSec(meta, i); break }
          }
        })
        return
      }
      var data = buildPayload()
      var out = document.getElementById('fg-result')
      out.textContent = JSON.stringify(data, null, 2)
      out.hidden = false
      console.log('Form submitted', data)
${submitBlock}    })

    updateConditions()
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
  <form id="fg-form" class="${css.classes('form')}" novalidate>
    <div class="${css.classes('grid')}">
${indentBlock(markup, 3)}
    </div>${actionsBlock}
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
`,
}
