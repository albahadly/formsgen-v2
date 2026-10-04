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
import { renderTree } from '../markup'
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

    // Conditional wrappers register their test expressions by index.
    const conditionTests: string[] = []
    const conditionAttr = (_node: ElementNode, expr: string): string => {
      conditionTests.push(expr)
      return ` data-fg-cond="${conditionTests.length - 1}"`
    }

    const markup = renderTree(schema, { lang: 'html', css, accessor, conditionAttr })

    const assets = css.assets()
    const headAssets = [
      ...assets.links.map((href) => `  <link rel="stylesheet" href="${href}">`),
      ...assets.scripts.map((src) => `  <script src="${src}"></script>`),
    ].join('\n')

    const stylesheet = css.stylesheet?.(schema.meta.theme)
    const styleTag = stylesheet ? `  <style>\n${indentBlock(stylesheet, 1)}  </style>` : ''

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

    function fgControl(path) {
      return document.querySelector('[data-fg-path="' + path + '"]')
    }
    function fgGet(path) {
      var el = fgControl(path)
      if (!el) return undefined
      var kind = el.getAttribute('data-fg-kind')
      if (kind === 'checkbox') return el.checked
      if (kind === 'select') return el.value === '' ? null : el.value
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

    function updateConditions() {
      FG_CONDITIONS.forEach(function (c) {
        var el = document.querySelector('[data-fg-cond="' + c.index + '"]')
        if (el) el.hidden = !c.test()
      })
    }

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
      if (!ok) return
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
    </div>
    <div class="${css.classes('actions')}">
      <button class="${css.classes('submitButton')}" type="submit">Submit</button>
    </div>
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
