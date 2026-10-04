// Standalone React export: a zero-dependency .tsx function component
// (React 18+) with useState, compiled validation and conditions
// (REBUILD_PROMPT §7 target 5). Added as a plugin — no core changes.

import { resolveMessages } from '@formsgen/renderer'
import { errorsTextFunction, stepAnnouncementsLiteral, submittedText } from '../announce'
import { FILE_HELPERS_TS, RUNTIME_HELPERS_TS } from '../compile'
import { reactUploadHandlers, reactUploadModule, uploadFields } from '../uploadRuntime'
import {
  collectExportRepeaters,
  itemValidatorsLiteral,
  scopedAccessor,
  type ItemAccess,
  collectExportFields,
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
import { reactItemMarkup, repeaterLegend } from '../repeaterMarkup'
import { compileConditions } from '../compile'
import {
  collectSectionHosts,
  defaultsObject,
  formDataType,
  hasResetButton,
  resolveSubmitButton,
  toJsLiteral,
} from '../structure'
import { formRootClass, pinnedSchemeAttr } from '../css/themeBridge'
import { componentName, type ExportTarget } from './types'

function indentBlock(text: string, depth: number): string {
  const pad = '  '.repeat(depth)
  return text
    .split('\n')
    .map((line) => (line === '' ? line : pad + line))
    .join('\n')
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
    const repeaters = collectExportRepeaters(schema)
    const hasRepeaters = repeaters.length > 0
    // JSX maps `form.<path>`; module functions map `data.<path>`.
    const jsxItems: ItemAccess = {
      map: (path, body) => `form.${path}.map((item, i) => ${body})`,
      read: (template, path) => `item.${template.slice(path.length + 1)}`,
    }
    const dataItems: ItemAccess = {
      map: (path, body) => `data.${path}.map((item) => ${body})`,
      read: (template, path) => `item.${template.slice(path.length + 1)}`,
    }
    const validatorFor = hasRepeaters ? 'fgValidatorFor(path)' : 'validators[path]'

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

    const renderRepeater = (r: RenderedRepeater): string => {
      const list = `form.${r.path}`
      const removeBtn = `<div className="${css.classes('repeaterItemActions')}">
          <button type="button" className="${css.classes('repeaterRemove')}" aria-label={fgRemoveLabel('${r.path}', i)} onClick={() => fgRemoveItem('${r.path}', i)}>${r.messages.removeItem}</button>
        </div>`
      const addBtn = `<button type="button" className="${css.classes('repeaterAdd')}" data-fg-add="${r.path}" onClick={() => fgAddItem('${r.path}')}>${r.addText}</button>`
      return `<fieldset className="${css.classes('group')}" data-fg-repeater="${r.path}">${repeaterLegend(css, r, 'className')}
  <div className="${css.classes('repeaterItems')}">
    {${list}.map((item, i) => (
      <fieldset key={fgKeyAt('${r.path}', i)} className="${css.classes('repeaterItem')}" data-fg-item tabIndex={-1}>
        <legend className="${css.classes('repeaterItemLabel')}">{fgItemLabel('${r.path}', i)}</legend>
${indentBlock(reactItemMarkup(r.itemHtml, r.path), 4)}
        ${r.limits.min > 0 ? `{${list}.length > ${r.limits.min} && (
        ${removeBtn}
        )}` : removeBtn}
      </fieldset>
    ))}
  </div>
  ${Number.isFinite(r.limits.max) ? `{${list}.length < ${r.limits.max} && ${addBtn}}` : addBtn}
</fieldset>`
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
      renderRepeater,
      itemOptions: (path) => ({ accessor: scopedAccessor(formAccessor, jsxItems, path) }),
    })

    // A section holding a repeater also gates on its items' fields (dynamic).
    const dynamicHost = (host: (typeof hosts)[number]): boolean => host.sections.some((s) => s.repeaters.length > 0)
    const secPaths = (host: (typeof hosts)[number]): string =>
      dynamicHost(host) ? `fgSecPaths_${host.key}(form)` : `fgSecPaths_${host.key}`
    const sectionPathsConsts = hosts
      .map((host) => {
        const lists = host.sections
          .map(
            (s) =>
              `[${[...s.paths.map((p) => JSON.stringify(p)), ...s.repeaters.map((r) => `...fgItemPaths(data, '${r}')`)].join(', ')}]`,
          )
          .join(', ')
        return dynamicHost(host)
          ? `const fgSecPaths_${host.key} = (data: FormData): string[][] => [${lists}]`
          : `const fgSecPaths_${host.key} = [${lists}]`
      })
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
    for (const path of ${secPaths(host)}[fgSec_${host.key}] ?? []) {
      touched.current.add(path)
      const validate = ${validatorFor}
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
              (host) => `      if (!(${secPaths(host)}[fgSec_${host.key}] ?? []).some((p) => nextErrors[p])) {
        const target = ${secPaths(host)}.findIndex((paths) => paths.some((p) => nextErrors[p]))
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

    const fmtMax = (max: number): string => (Number.isFinite(max) ? String(max) : 'Number.POSITIVE_INFINITY')
    const repeaterModule = hasRepeaters
      ? `const FG_ITEM_DEFAULTS: Record<string, () => Record<string, unknown>> = {
${repeaters.map((r) => `  '${r.path}': () => (${indentBlock(toJsLiteral(r.itemDefaults), 1).trimStart()}),`).join('\n')}
}

const FG_ITEM_LIMITS: Record<string, { min: number; max: number }> = {
${repeaters.map((r) => `  '${r.path}': { min: ${r.limits.min}, max: ${fmtMax(r.limits.max)} },`).join('\n')}
}

const FG_ITEM_LABELS: Record<string, string> = {
${repeaters.map((r) => `  '${r.path}': ${JSON.stringify(r.itemLabel)},`).join('\n')}
}

const FG_REPEATER_VISIBLE: Record<string, (data: FormData) => boolean> = {
${repeaters
  .map(
    (r) =>
      `  '${r.path}': (${r.conditionChain.length ? 'data' : '_data'}: FormData) => ${r.conditionChain.length ? r.conditionChain.map((g) => `(${compileConditions(g, dataAccessor)})`).join(' && ') : 'true'},`,
  )
  .join('\n')}
}

const itemValidators: Record<string, Record<string, (item: Record<string, unknown>, data: FormData) => string | null>> = ${itemValidatorsLiteral(
          repeaters,
          dataAccessor,
          { ...dataItems, read: (template, path) => `item[${JSON.stringify(template.slice(path.length + 1))}]` },
          (_r, body) => `item: Record<string, unknown>, ${/\bdata\./.test(body) ? 'data' : '_data'}: FormData`,
        )}

function fgList(data: FormData, path: string): Record<string, unknown>[] {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], data) as Record<string, unknown>[]
}

function fgItemLabel(path: string, index: number): string {
  return (FG_ITEM_LABELS[path] ?? '').split('{n}').join(String(index + 1))
}

function fgRemoveLabel(path: string, index: number): string {
  return ${JSON.stringify(messages.removeItemLabel)}.split('{label}').join(fgItemLabel(path, index))
}

/** Every item field path of a visible repeater (validation, step gates). */
function fgItemPaths(data: FormData, path: string): string[] {
  if (!FG_REPEATER_VISIBLE[path]?.(data)) return []
  const fields = Object.keys(itemValidators[path] ?? {})
  return fgList(data, path).flatMap((_, i) => fields.map((field) => \`\${path}.\${i}.\${field}\`))
}

/** Validator for a field path, including item paths like "people.2.name". */
function fgValidatorFor(path: string): ((data: FormData) => string | null) | undefined {
  const direct = validators[path]
  if (direct) return direct
  const match = /^(.+)\\.(\\d+)\\.([^.]+)$/.exec(path)
  if (!match) return undefined
  const validate = itemValidators[match[1]!]?.[match[3]!]
  if (!validate) return undefined
  return (data) => {
    const item = fgList(data, match[1]!)[Number(match[2])]
    return item ? validate(item, data) : null
  }
}

/** All field paths to validate on submit (items included). */
function fgAllPaths(data: FormData): string[] {
  return [...Object.keys(validators), ...Object.keys(itemValidators).flatMap((path) => fgItemPaths(data, path))]
}

/** Moves item keys/paths after a removal: "people.3.x" → "people.2.x". */
function fgShiftKey(key: string, path: string, removed: number): string | null {
  if (!key.startsWith(path + '.')) return key
  const rest = key.slice(path.length + 1)
  const dot = rest.indexOf('.')
  const index = Number(dot === -1 ? rest : rest.slice(0, dot))
  if (!Number.isInteger(index)) return key
  if (index === removed) return null
  return index > removed ? \`\${path}.\${index - 1}\${dot === -1 ? '' : rest.slice(dot)}\` : key
}`
      : ''
    const repeaterHooks = hasRepeaters
      ? `  const fgRoot = useRef<HTMLFormElement>(null)
  // Stable React keys per item (the form object is cloned on every edit).
  const fgKeys = useRef<Record<string, number[]>>({})
  const fgNextKey = useRef(0)
  const fgPendingFocus = useRef<{ path: string; index: number } | null>(null)`
      : ''
    const repeaterHandlers = hasRepeaters
      ? `  function fgKeyAt(path: string, index: number): number {
    const keys = (fgKeys.current[path] ??= [])
    while (keys.length <= index) keys.push(fgNextKey.current++)
    return keys[index]!
  }

  function fgAddItem(path: string): void {
    const list = fgList(form, path)
    if (list.length >= (FG_ITEM_LIMITS[path]?.max ?? Number.POSITIVE_INFINITY)) return
    setField(path, [...list, FG_ITEM_DEFAULTS[path]!()])
    fgPendingFocus.current = { path, index: list.length }
    fgAnnounce(${JSON.stringify(messages.itemAdded)}.split('{label}').join(fgItemLabel(path, list.length)))
  }

  function fgRemoveItem(path: string, index: number): void {
    const list = fgList(form, path)
    if (list.length <= (FG_ITEM_LIMITS[path]?.min ?? 0)) return
    const label = fgItemLabel(path, index)
    fgKeyAt(path, list.length - 1)
    fgKeys.current[path]!.splice(index, 1)
    const nextTouched = [...touched.current].map((k) => fgShiftKey(k, path, index)).filter((k): k is string => k !== null)
    touched.current = new Set(nextTouched)
    setErrors((prev) => {
      const next: Record<string, string> = {}
      for (const [key, message] of Object.entries(prev)) {
        const target = fgShiftKey(key, path, index)
        if (target !== null) next[target] = message
      }
      return next
    })
    setField(path, list.filter((_, i) => i !== index))
    fgPendingFocus.current = { path, index: -1 - index }
    fgAnnounce(${JSON.stringify(messages.itemRemoved)}.split('{label}').join(label))
  }

  // After an add: focus the new item's first control. After a remove
  // (negative index): focus the item that took its place, or the add button.
  useEffect(() => {
    const pending = fgPendingFocus.current
    if (!pending) return
    fgPendingFocus.current = null
    const repeater = fgRoot.current?.querySelector(\`[data-fg-repeater="\${pending.path}"]\`)
    const items = Array.from(repeater?.querySelectorAll<HTMLElement>(':scope > div > [data-fg-item]') ?? [])
    if (pending.index >= 0) {
      const item = items[pending.index]
      const control = item?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea')
      ;(control ?? item)?.focus()
    } else {
      const removed = -1 - pending.index
      const target = items[Math.min(removed, items.length - 1)]
      ;(target ?? repeater?.querySelector<HTMLElement>('[data-fg-add]'))?.focus()
    }
  })`
      : ''

    // Reset buttons: back to INITIAL, no errors, announced.
    const resetHandler = hasResetButton(schema)
      ? `  function fgReset(): void {
    setForm(INITIAL)
    setErrors({})
    touched.current.clear()${hasRepeaters ? '\n    fgKeys.current = {}' : ''}
    setResult(null)${hasTags ? '\n    setTagDrafts({})' : ''}
    fgAnnounce(${JSON.stringify(messages.formReset)})
  }`
      : ''

    const hasUploads = uploadFields(fields).length > 0
    const submitUrl = schema.meta.submit?.url
    const submitBlock = submitUrl
      ? `    fetch(${JSON.stringify(submitUrl)}, {
      method: ${JSON.stringify(schema.meta.submit?.method ?? 'POST')},
      ${hasUploads ? '// multipart: a JSON "data" part + one part per file\n      body: fgMultipart(data),' : "headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify(data),"}
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
import React, { useEffect, useRef, useState } from 'react'
${cssImport}
${RUNTIME_HELPERS_TS}
${hasUploads ? `${FILE_HELPERS_TS}\n` : ''}
type FormData = ${formDataType(schema)}

const INITIAL: FormData = ${toJsLiteral(defaults)}

${visibilityFunctions(fields, dataAccessor, 'data: FormData')}

const validators: Record<string, (data: FormData) => string | null> = ${validatorsLiteral(
      fields,
      dataAccessor,
      'data: FormData',
      (key) => `fgVisible_${key}(data)`,
      messages,
    )}

function buildPayload(data: FormData): Record<string, unknown> {
  return ${indentBlock(payloadExpr(schema, dataAccessor, (key) => `fgVisible_${key}(data)`, dataItems), 1).trimStart()}
}
${repeaterModule ? `\n${repeaterModule}\n` : ''}${hasUploads ? `\n${reactUploadModule(fields, messages)}\n` : ''}${sectionPathsConsts ? `\n${sectionPathsConsts}\n` : ''}${stepAnnounceConsts ? `${stepAnnounceConsts}\n` : ''}
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
${sectionHooks ? `${sectionHooks}\n` : ''}${tagsState ? `${tagsState}\n` : ''}${repeaterHooks ? `${repeaterHooks}\n` : ''}
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
    const validate = ${validatorFor}
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

  // A blur error appearing while a pointer is held reflows the form and the
  // release misses its target; defer blur validation until the press ends.
  // Deferred work reads the latest state through refs, not this closure.
  const formRef = useRef(form)
  formRef.current = form
  const fgPressing = useRef(false)
  const fgDeferred = useRef(new Set<string>())
  const fgFlush = useRef(() => {})
  fgFlush.current = () => {
    const paths = [...fgDeferred.current]
    fgDeferred.current.clear()
    for (const path of paths) {
      touched.current.add(path)
      validateField(path, formRef.current)
    }
  }
  useEffect(() => {
    function end(): void {
      if (!fgPressing.current) return
      fgPressing.current = false
      setTimeout(() => fgFlush.current(), 0)
    }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [])

  function touch(path: string): void {
    if (fgPressing.current) {
      fgDeferred.current.add(path)
      return
    }
    touched.current.add(path)
    validateField(path, form)
  }
${tagsHandlers ? `\n${tagsHandlers}\n` : ''}${hasUploads ? `\n${reactUploadHandlers(fields)}\n` : ''}${repeaterHandlers ? `\n${repeaterHandlers}\n` : ''}${resetHandler ? `\n${resetHandler}\n` : ''}
  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    for (const path of ${hasRepeaters ? 'fgAllPaths(form)' : 'Object.keys(validators)'}) {
      touched.current.add(path)
      const message = ${hasRepeaters ? 'fgValidatorFor(path)?.(form) ?? null' : 'validators[path]!(form)'}
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
    <form${hasRepeaters ? ' ref={fgRoot}' : ''} className="${formRootClass(css.classes('form'), schema.meta.theme)}"${pinnedSchemeAttr(schema.meta.theme)} dir="${schema.meta.dir}" noValidate onSubmit={handleSubmit} onPointerDownCapture={() => { fgFlush.current(); fgPressing.current = true }}>
      <div className="${css.classes('grid')}">
${indentBlock(markup, 4)}
      </div>
      <div className="${css.classes('srOnly')}" role="status" aria-live="polite" aria-atomic="true">{fgAnnouncement}</div>${actionsBlock}
      {result && <pre className="${css.classes('payload')}">{JSON.stringify(result, ${hasUploads ? 'fgFileJson' : 'null'}, 2)}</pre>}
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

1. Copy \`${name}.tsx\`${ctx.css.stylesheet?.(ctx.schema.meta.theme) ? ` and \`${name}.css\`` : ''} into any React + TypeScript project
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
