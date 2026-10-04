// Standalone React export: a zero-dependency .tsx function component
// (React 18+) with useState, compiled validation and conditions
// (REBUILD_PROMPT §7 target 5). Added as a plugin — no core changes.

import { resolveMessages } from '@formsgen/renderer'
import { errorsTextFunction, stepAnnouncementsLiteral, submittedText } from '../announce'
import { RUNTIME_HELPERS } from '../compile'
import {
  collectExportFields,
  payloadExpr,
  validatorsLiteral,
  visibilityFunctions,
} from '../logic'
import { renderTree, stepButtonLabels, type RenderedSectionHost } from '../markup'
import {
  collectSectionHosts,
  defaultsObject,
  resolveSubmitButton,
  toJsLiteral,
} from '../structure'
import { componentName, type ExportTarget } from './types'

function indentBlock(text: string, depth: number): string {
  const pad = '  '.repeat(depth)
  return text
    .split('\n')
    .map((line) => (line === '' ? line : pad + line))
    .join('\n')
}

/** TS type for one field's value, by element type. */
const FIELD_TS_TYPES: Record<string, string> = {
  number: 'number | null',
  select: 'string | null',
  radiogroup: 'string | null',
  checkbox: 'boolean',
  checkboxgroup: 'string[]',
  multiselect: 'string[]',
  tags: 'string[]',
  range: 'number',
}

/** TS type literal for the form data shape, derived from the SCHEMA. */
function dataType(schema: Parameters<ExportTarget['generate']>[0]['schema']): string {
  interface TypeTree {
    [key: string]: string | TypeTree
  }
  const root: TypeTree = {}
  for (const field of collectExportFields(schema)) {
    const segments = field.path.split('.')
    let target = root
    for (const segment of segments.slice(0, -1)) {
      target = (target[segment] ??= {}) as TypeTree
    }
    target[segments[segments.length - 1] as string] =
      FIELD_TS_TYPES[field.node.type] ?? 'string'
  }
  const render = (tree: TypeTree, indent: number): string => {
    const pad = '  '.repeat(indent)
    const padIn = '  '.repeat(indent + 1)
    const body = Object.entries(tree)
      .map(
        ([k, v]) =>
          `${padIn}${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${typeof v === 'string' ? v : render(v, indent + 1)}`,
      )
      .join('\n')
    return `{\n${body}\n${pad}}`
  }
  return render(root, 0)
}

export const reactTarget: ExportTarget = {
  id: 'react',
  label: 'React (standalone)',
  description: 'A single self-contained .tsx component with zero dependencies beyond React.',
  frameworkAware: true,
  generate: ({ schema, css }) => {
    const name = componentName(schema)
    // Module-scope pure functions take the data as a parameter…
    const dataAccessor = (path: string): string => `data.${path}`
    // …while JSX reads the component's state variable directly.
    const formAccessor = (path: string): string => `form.${path}`
    const fields = collectExportFields(schema)
    const defaults = defaultsObject(schema)
    const hosts = collectSectionHosts(schema)
    const messages = resolveMessages(schema.meta.locale)

    // Submit button: configurable text/placement/style (meta.submitButton).
    // With exactly ONE gating wizard, the submit replaces Next on its last
    // step; otherwise the bottom button is shown/gated.
    const sb = resolveSubmitButton(schema, hosts)
    const embeddedHost = sb.gatingHosts.length === 1 ? sb.gatingHosts[0]! : null
    const submitClass = css.classes(sb.secondary ? 'buttonSecondary' : 'submitButton')

    const renderSections = (host: RenderedSectionHost): string => {
      const state = `fgSec_${host.key}`
      const panels = host.sections
        .map(
          (s) =>
            `  <div style={{ display: ${state} === ${s.index} ? undefined : 'none' }}>\n${indentBlock(s.html, 2)}\n  </div>`,
        )
        .join('\n')
      if (host.kind === 'tabs') {
        const buttons = host.sections
          .map(
            (s) =>
              `    <button type="button" className={${state} === ${s.index} ? "${css.classes('tabButtonActive')}" : "${css.classes('tabButton')}"} onClick={() => setFgSec_${host.key}(${s.index})}>${s.label}</button>`,
          )
          .join('\n')
        return `<div>\n  <div className="${css.classes('tabList')}" role="tablist">\n${buttons}\n  </div>\n${panels}\n</div>`
      }
      const items = host.sections
        .map(
          (s) =>
            `    <li className={${state} === ${s.index} ? "${css.classes('stepItemActive')}" : "${css.classes('stepItem')}"}>${s.index + 1}. ${s.label}</li>`,
        )
        .join('\n')
      const last = host.sections.length - 1
      const labels = stepButtonLabels(host)
      const embeddedSubmit =
        embeddedHost?.key === host.key
          ? `\n    {${state} === ${last} && <button type="submit" className="${submitClass}">${sb.text}</button>}`
          : ''
      return `<div>\n  <ol className="${css.classes('stepList')}">\n${items}\n  </ol>\n${panels}\n  <div className="${css.classes('stepActions')}">\n    {${state} > 0 && <button type="button" className="${css.classes('buttonSecondary')}" onClick={() => fgGo_${host.key}(${state} - 1)}>${labels.back}</button>}\n    {${state} < ${last} && <button type="button" className="${css.classes('submitButton')}" onClick={fgNext_${host.key}}>${labels.next}</button>}${embeddedSubmit}\n  </div>\n</div>`
    }

    const markup = renderTree(schema, {
      lang: 'react',
      css,
      accessor: formAccessor,
      classAttr: 'className',
      comment: (text) => `{/* ${text} */}`,
      conditionAttr: () => '',
      wrapConditional: (expr, block) => `{(${expr}) && (\n${indentBlock(block, 1)}\n)}`,
      renderSections,
    })

    const sectionPathsConsts = hosts
      .map(
        (host) =>
          `const fgSecPaths_${host.key} = [${host.sections.map((s) => `[${s.paths.map((p) => JSON.stringify(p)).join(', ')}]`).join(', ')}]`,
      )
      .join('\n')

    const sectionHooks = hosts
      .map((host) => `  const [fgSec_${host.key}, setFgSec_${host.key}] = useState(0)`)
      .join('\n')

    const stepHandlers = hosts
      .filter((host) => host.kind === 'steps')
      .map(
        (host) => `  function fgGo_${host.key}(index: number): void {
    setFgSec_${host.key}(index)
    fgAnnounce(fgSecAnnounce_${host.key}[index] ?? '')
  }

  function fgNext_${host.key}(): void {
    let ok = true
    const next = { ...errors }
    for (const path of fgSecPaths_${host.key}[fgSec_${host.key}] ?? []) {
      touched.current.add(path)
      const validate = validators[path]
      const message = validate ? validate(form) : null
      if (message) { next[path] = message; ok = false } else { delete next[path] }
    }
    setErrors(next)
    if (ok && fgSec_${host.key} < ${host.sections.length - 1}) fgGo_${host.key}(fgSec_${host.key} + 1)
  }`,
      )
      .join('\n\n')
    const stepAnnounceConsts = hosts
      .filter((host) => host.kind === 'steps')
      .map((host) => `const fgSecAnnounce_${host.key} = ${stepAnnouncementsLiteral(host, messages)}`)
      .join('\n')

    // On a failed submit, move each tabs/steps host to its first section
    // holding an error (unless the current one already shows one).
    const jumpBlock =
      hosts.length > 0
        ? hosts
            .map(
              (host) => `      if (!(fgSecPaths_${host.key}[fgSec_${host.key}] ?? []).some((p) => nextErrors[p])) {
        const target = fgSecPaths_${host.key}.findIndex((paths) => paths.some((p) => nextErrors[p]))
        if (target !== -1) setFgSec_${host.key}(target)
      }`,
            )
            .join('\n')
        : ''

    // Tags fields: per-field draft state + shared add/remove handlers.
    const hasTags = fields.some((f) => f.node.type === 'tags')
    const tagsState = hasTags
      ? `  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({})`
      : ''
    const tagsHandlers = hasTags
      ? `  function fgAddTag(path: string, current: string[]): void {
    const draft = (tagDrafts[path] ?? '').trim()
    if (draft !== '' && !current.includes(draft)) setField(path, [...current, draft])
    setTagDrafts((d) => ({ ...d, [path]: '' }))
  }

  function fgRemoveTag(path: string, current: string[], index: number): void {
    setField(path, current.filter((_, i) => i !== index))
  }`
      : ''

    const submitUrl = schema.meta.submit?.url
    const submitBlock = submitUrl
      ? `    fetch(${JSON.stringify(submitUrl)}, {
      method: ${JSON.stringify(schema.meta.submit?.method ?? 'POST')},
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch((error) => console.error('Submit failed', error))\n`
      : ''

    const stylesheet = css.stylesheet?.(schema.meta.theme)
    const cssImport = stylesheet ? `import './${name}.css'\n` : ''

    // Bottom actions row: omitted when the wizard embeds the submit.
    const submitBtnEl = `<button className="${submitClass}"${sb.buttonStyle ? ` style={{ width: '100%' }}` : ''} type="submit">${sb.text}</button>`
    const actionsBlock = embeddedHost
      ? ''
      : `\n      <div className="${css.classes('actions')}"${sb.actionsStyle ? ` style={{ textAlign: '${sb.align}' }}` : ''}>
        ${
          sb.gatingHosts.length
            ? `{${sb.gatingHosts.map((h) => `fgSec_${h.key} === ${h.sections.length - 1}`).join(' && ')} && ${submitBtnEl}}`
            : submitBtnEl
        }
      </div>`

    const tsx = `// Generated by FormsGen — no runtime dependencies beyond React.
import React, { useRef, useState } from 'react'
${cssImport}
${RUNTIME_HELPERS}

type FormData = ${dataType(schema)}

const INITIAL: FormData = ${toJsLiteral(defaults)}

${visibilityFunctions(fields, dataAccessor, 'data: FormData')}

const validators: Record<string, (data: FormData) => string | null> = ${validatorsLiteral(
      fields,
      dataAccessor,
      'data: FormData',
      (key) => `fgVisible_${key}(data)`,
    )}

function buildPayload(data: FormData): Record<string, unknown> {
  return ${indentBlock(payloadExpr(schema, dataAccessor, (key) => `fgVisible_${key}(data)`), 1).trimStart()}
}
${sectionPathsConsts ? `\n${sectionPathsConsts}\n` : ''}${stepAnnounceConsts ? `${stepAnnounceConsts}\n` : ''}
${errorsTextFunction(messages, true)}

export default function ${name}({
  onSubmit,
}: {
  onSubmit?: (data: Record<string, unknown>) => void
}) {
  const [form, setForm] = useState<FormData>(INITIAL)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const touched = useRef(new Set<string>())
  const [fgAnnouncement, setFgAnnouncement] = useState('')
${sectionHooks ? `${sectionHooks}\n` : ''}${tagsState ? `${tagsState}\n` : ''}
  // Polite aria-live region; cleared first so repeated text re-announces.
  function fgAnnounce(message: string): void {
    setFgAnnouncement('')
    setTimeout(() => setFgAnnouncement(message), 50)
  }
${stepHandlers ? `\n${stepHandlers}\n` : ''}

  function applyError(path: string, message: string | null): void {
    setErrors((prev) => {
      const next = { ...prev }
      if (message) next[path] = message
      else delete next[path]
      return next
    })
  }

  function validateField(path: string, data: FormData): void {
    const validate = validators[path]
    if (validate) applyError(path, validate(data))
  }

  function setField(path: string, value: unknown): void {
    const next = structuredClone(form) as unknown as Record<string, unknown>
    const segments = path.split('.')
    let target = next
    for (const segment of segments.slice(0, -1)) {
      target = target[segment] as Record<string, unknown>
    }
    target[segments[segments.length - 1] as keyof typeof target] = value
    const typed = next as unknown as FormData
    setForm(typed)
    if (touched.current.has(path)) validateField(path, typed)
  }

  function touch(path: string): void {
    touched.current.add(path)
    validateField(path, form)
  }
${tagsHandlers ? `\n${tagsHandlers}\n` : ''}
  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    for (const path of Object.keys(validators)) {
      touched.current.add(path)
      const message = validators[path]!(form)
      if (message) nextErrors[path] = message
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
${jumpBlock ? `${jumpBlock}\n` : ''}      fgAnnounce(fgErrorsText(Object.keys(nextErrors).length))
      return
    }
    const data = buildPayload(form)
    setResult(data)
    fgAnnounce(${submittedText(messages)})
    onSubmit?.(data)
${submitBlock}  }

  return (
    <form className="${css.classes('form')}" dir="${schema.meta.dir}" noValidate onSubmit={handleSubmit}>
      <div className="${css.classes('grid')}">
${indentBlock(markup, 4)}
      </div>
      <div className="${css.classes('srOnly')}" role="status" aria-live="polite" aria-atomic="true">{fgAnnouncement}</div>${actionsBlock}
      {result && <pre className="${css.classes('payload')}">{JSON.stringify(result, null, 2)}</pre>}
    </form>
  )
}
`

    const files: { path: string; language: 'typescript' | 'css'; content: string }[] = [
      { path: `${name}.tsx`, language: 'typescript', content: tsx },
    ]
    if (stylesheet) {
      files.push({ path: `${name}.css`, language: 'css', content: stylesheet })
    }
    return files
  },
  readme: (ctx) => {
    const name = componentName(ctx.schema)
    return `# ${name} (standalone React component)

Zero dependencies beyond React 18+ — validation, conditional visibility
and the submit payload are compiled into the component.

## Install

1. Copy \`${name}.tsx\`${ctx.css.stylesheet ? ` and \`${name}.css\`` : ''} into any React + TypeScript project
   (e.g. \`npm create vite@latest -- --template react-ts\`).
2. Use it:

\`\`\`tsx
<${name} onSubmit={(payload) => console.log(payload)} />
\`\`\`

${ctx.css.readmeNote()}
${ctx.schema.meta.submit?.url ? `\nOn valid submit the component also POSTs the payload to \`${ctx.schema.meta.submit.url}\`.` : ''}
`
  },
}
