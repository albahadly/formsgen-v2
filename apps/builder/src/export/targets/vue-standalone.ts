// Zero-dependency Vue 3 SFC export: plain template markup, reactive data,
// compiled validation and conditions — compiles as-is in a fresh
// `npm create vue@latest` project (REBUILD_PROMPT §7 target 3).

import { resolveMessages } from '@formsgen/renderer'
import { errorsTextFunction, stepAnnouncementsLiteral, submittedText } from '../announce'
import { RUNTIME_HELPERS_TS } from '../compile'
import { compileConditions } from '../compile'
import {
  collectExportFields,
  collectExportRepeaters,
  itemValidatorsLiteral,
  payloadExpr,
  scopedAccessor,
  validatorsLiteral,
  visibilityFunctions,
  type ItemAccess,
} from '../logic'
import {
  renderTree,
  stepButtonLabels,
  type RenderedRepeater,
  type RenderedSectionHost,
} from '../markup'
import { repeaterLegend, vueItemMarkup } from '../repeaterMarkup'
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

export const vueStandaloneTarget: ExportTarget = {
  id: 'vue-standalone',
  label: 'Vue (standalone)',
  description: 'A single self-contained SFC with zero dependencies beyond Vue.',
  frameworkAware: true,
  generate: ({ schema, css }) => {
    const name = componentName(schema)
    const accessor = (path: string): string => `form.${path}`
    const fields = collectExportFields(schema)
    const hosts = collectSectionHosts(schema)
    const messages = resolveMessages(schema.meta.locale)
    const repeaters = collectExportRepeaters(schema)
    const items: ItemAccess = {
      map: (path, body) => `form.${path}.map((item) => ${body})`,
      read: (template, path) => `item.${template.slice(path.length + 1)}`,
    }

    // Submit button: configurable text/placement/style (meta.submitButton).
    // With exactly ONE gating wizard, the submit replaces Next on its last
    // step; otherwise the bottom button is shown/gated.
    const sb = resolveSubmitButton(schema, hosts)
    const embeddedHost = sb.gatingHosts.length === 1 ? sb.gatingHosts[0]! : null
    const submitClass = css.classes(sb.secondary ? 'buttonSecondary' : 'submitButton')

    const renderSections = (host: RenderedSectionHost): string => {
      const state = `fgSec_${host.key}`
      if (host.kind === 'tabs') {
        const buttons = host.sections
          .map(
            (s) =>
              `    <button type="button" :class="${state} === ${s.index} ? '${css.classes('tabButtonActive')}' : '${css.classes('tabButton')}'" @click="${state} = ${s.index}">${s.label}</button>`,
          )
          .join('\n')
        const panels = host.sections
          .map((s) => `  <div v-show="${state} === ${s.index}">\n${indentBlock(s.html, 2)}\n  </div>`)
          .join('\n')
        return `<div>\n  <div class="${css.classes('tabList')}" role="tablist">\n${buttons}\n  </div>\n${panels}\n</div>`
      }
      const items = host.sections
        .map(
          (s) =>
            `    <li :class="${state} === ${s.index} ? '${css.classes('stepItemActive')}' : '${css.classes('stepItem')}'">${s.index + 1}. ${s.label}</li>`,
        )
        .join('\n')
      const panels = host.sections
        .map((s) => `  <div v-show="${state} === ${s.index}">\n${indentBlock(s.html, 2)}\n  </div>`)
        .join('\n')
      const last = host.sections.length - 1
      const labels = stepButtonLabels(host)
      const embeddedSubmit =
        embeddedHost?.key === host.key
          ? `\n    <button v-if="${state} === ${last}" type="submit" class="${submitClass}">${sb.text}</button>`
          : ''
      return `<div>\n  <ol class="${css.classes('stepList')}">\n${items}\n  </ol>\n${panels}\n  <div class="${css.classes('stepActions')}">\n    <button v-if="${state} > 0" type="button" class="${css.classes('buttonSecondary')}" @click="fgGo_${host.key}(${state} - 1)">${labels.back}</button>\n    <button v-if="${state} < ${last}" type="button" class="${css.classes('submitButton')}" @click="fgNext_${host.key}()">${labels.next}</button>${embeddedSubmit}\n  </div>\n</div>`
    }

    // Repeating sections: v-for over the item array; the item template's
    // fields bind to `item`, their paths/ids carry the index `i`.
    const renderRepeater = (r: RenderedRepeater): string => {
      const list = `form.${r.path}`
      const remove = r.limits.min > 0 ? ` v-if="${list}.length > ${r.limits.min}"` : ''
      const add = Number.isFinite(r.limits.max) ? ` v-if="${list}.length < ${r.limits.max}"` : ''
      return `<fieldset class="${css.classes('group')}" data-fg-repeater="${r.path}">${repeaterLegend(css, r, 'class')}
  <div class="${css.classes('repeaterItems')}">
    <fieldset v-for="(item, i) in ${list}" :key="fgKeyOf(item)" class="${css.classes('repeaterItem')}" data-fg-item tabindex="-1">
      <legend class="${css.classes('repeaterItemLabel')}">{{ fgItemLabel('${r.path}', i) }}</legend>
${indentBlock(vueItemMarkup(r.itemHtml, r.path), 3)}
      <div${remove} class="${css.classes('repeaterItemActions')}">
        <button type="button" class="${css.classes('repeaterRemove')}" :aria-label="fgRemoveLabel('${r.path}', i)" @click="fgRemoveItem('${r.path}', i)">${r.messages.removeItem}</button>
      </div>
    </fieldset>
  </div>
  <button${add} type="button" class="${css.classes('repeaterAdd')}" data-fg-add="${r.path}" @click="fgAddItem('${r.path}')">${r.addText}</button>
</fieldset>`
    }

    const markup = renderTree(schema, {
      lang: 'vue',
      css,
      accessor,
      // Single-quoted so JSON string literals inside stay intact.
      conditionAttr: (_node, expr) => ` v-if='${expr.replace(/'/g, '&#39;')}'`,
      renderSections,
      renderRepeater,
      itemOptions: (path) => ({ accessor: scopedAccessor(accessor, items, path) }),
    })

    // Section state + per-step validation gates + submit error jump.
    const sectionState = hosts
      .map((host) => `const fgSec_${host.key} = ref(0)`)
      .join('\n')
    // A section holding a repeater also gates on its items' fields (dynamic).
    const dynamicHost = (host: (typeof hosts)[number]): boolean => host.sections.some((s) => s.repeaters.length > 0)
    const secPaths = (host: (typeof hosts)[number]): string =>
      dynamicHost(host) ? `fgSecPaths_${host.key}()` : `fgSecPaths_${host.key}`
    const sectionPaths = hosts
      .map((host) => {
        const lists = host.sections
          .map(
            (s) =>
              `[${[...s.paths.map((p) => JSON.stringify(p)), ...s.repeaters.map((r) => `...fgItemPaths('${r}')`)].join(', ')}]`,
          )
          .join(', ')
        return dynamicHost(host)
          ? `const fgSecPaths_${host.key} = (): string[][] => [${lists}]`
          : `const fgSecPaths_${host.key} = [${lists}]`
      })
      .join('\n')
    const stepLogic = hosts
      .filter((host) => host.kind === 'steps')
      .map(
        (host) => `const fgSecAnnounce_${host.key} = ${stepAnnouncementsLiteral(host, messages)}
function fgGo_${host.key}(index: number): void {
  fgSec_${host.key}.value = index
  fgAnnounce(fgSecAnnounce_${host.key}[index] ?? '')
}
function fgNext_${host.key}(): void {
  let ok = true
  for (const path of ${secPaths(host)}[fgSec_${host.key}.value] ?? []) {
    touch(path)
    if (errors[path]) ok = false
  }
  if (ok && fgSec_${host.key}.value < ${host.sections.length - 1}) fgGo_${host.key}(fgSec_${host.key}.value + 1)
}`,
      )
      .join('\n\n')
    const jumpLogic =
      hosts.length > 0
        ? `function fgJumpToError(): void {
${hosts
  .map(
    (host) => `  if (!(${secPaths(host)}[fgSec_${host.key}.value] ?? []).some((p) => errors[p])) {
    const target = ${secPaths(host)}.findIndex((paths) => paths.some((p) => errors[p]))
    if (target !== -1) fgSec_${host.key}.value = target
  }`,
  )
  .join('\n')}
}`
        : ''

    // Tags fields: per-field draft store + shared add/remove handlers.
    const tagsFields = fields.filter((f) => f.node.type === 'tags')
    const tagsLogic =
      tagsFields.length > 0
        ? `const tagDrafts = reactive<Record<string, string>>({ ${tagsFields
            .map((f) => `'${f.path}': ''`)
            .join(', ')} })
const tagFields: Record<string, { get: () => string[]; set: (v: string[]) => void }> = {
${tagsFields
  .map(
    (f) =>
      `  '${f.path}': { get: () => form.${f.path}, set: (v) => { form.${f.path} = v } },`,
  )
  .join('\n')}
}
function fgAddTag(path: string): void {
  const draft = (tagDrafts[path] ?? '').trim()
  const field = tagFields[path]!
  if (draft !== '' && !field.get().includes(draft)) field.set([...field.get(), draft])
  tagDrafts[path] = ''
  revalidate(path)
}
function fgRemoveTag(path: string, index: number): void {
  const field = tagFields[path]!
  field.set(field.get().filter((_, i) => i !== index))
  revalidate(path)
}`
        : ''

    // Repeating sections: item factories, limits, per-item validators, and
    // add/remove (focus the new item / the item that moved up; announce).
    const fmtMax = (max: number): string => (Number.isFinite(max) ? String(max) : 'Number.POSITIVE_INFINITY')
    const repeaterLogic =
      repeaters.length > 0
        ? `const fgRoot = ref<HTMLElement | null>(null)
const fgItemDefaults: Record<string, () => Record<string, unknown>> = {
${repeaters.map((r) => `  '${r.path}': () => (${indentBlock(toJsLiteral(r.itemDefaults), 1).trimStart()}),`).join('\n')}
}
const fgItemLimits: Record<string, { min: number; max: number }> = {
${repeaters.map((r) => `  '${r.path}': { min: ${r.limits.min}, max: ${fmtMax(r.limits.max)} },`).join('\n')}
}
const fgItemLabels: Record<string, string> = {
${repeaters.map((r) => `  '${r.path}': ${JSON.stringify(r.itemLabel)},`).join('\n')}
}
const fgRepeaterVisible: Record<string, () => boolean> = {
${repeaters
  .map(
    (r) =>
      `  '${r.path}': () => ${r.conditionChain.length ? r.conditionChain.map((g) => `(${compileConditions(g, accessor)})`).join(' && ') : 'true'},`,
  )
  .join('\n')}
}
const fgItemValidators: Record<string, Record<string, (item: Record<string, unknown>) => string | null>> = ${itemValidatorsLiteral(
            repeaters,
            accessor,
            { ...items, read: (template, path) => `item[${JSON.stringify(template.slice(path.length + 1))}]` },
            () => 'item: Record<string, unknown>',
          )}

function fgList(path: string): Record<string, unknown>[] {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], form) as Record<string, unknown>[]
}
function fgItemLabel(path: string, index: number): string {
  return (fgItemLabels[path] ?? '').split('{n}').join(String(index + 1))
}
function fgRemoveLabel(path: string, index: number): string {
  return ${JSON.stringify(messages.removeItemLabel)}.split('{label}').join(fgItemLabel(path, index))
}
/** Validator for an item field path like "people.2.name". */
function fgItemValidator(path: string): (() => string | null) | undefined {
  const match = /^(.+)\\.(\\d+)\\.([^.]+)$/.exec(path)
  if (!match) return undefined
  const validate = fgItemValidators[match[1]!]?.[match[3]!]
  const item = fgList(match[1]!)[Number(match[2])]
  return validate && item ? () => validate(item) : undefined
}
/** Every item field path of a repeater (for validation and step gates). */
function fgItemPaths(path: string): string[] {
  if (!fgRepeaterVisible[path]?.()) return []
  const fields = Object.keys(fgItemValidators[path] ?? {})
  return fgList(path).flatMap((_, i) => fields.map((field) => \`\${path}.\${i}.\${field}\`))
}
const fgItemKeys = new WeakMap<object, number>()
let fgNextItemKey = 0
function fgKeyOf(item: object): number {
  const raw = toRaw(item)
  let key = fgItemKeys.get(raw)
  if (key === undefined) {
    key = fgNextItemKey++
    fgItemKeys.set(raw, key)
  }
  return key
}
function fgItemElements(path: string): HTMLElement[] {
  const repeater = fgRoot.value?.querySelector(\`[data-fg-repeater="\${path}"]\`)
  return Array.from(repeater?.querySelectorAll<HTMLElement>(':scope > div > [data-fg-item]') ?? [])
}
/** A removed item's errors/touched state go; later items' move up one. */
function fgShiftItems(path: string, removed: number): void {
  const pattern = new RegExp('^' + path.replace(/\\./g, '\\\\.') + '\\\\.(\\\\d+)(\\\\..*)$')
  const move = (key: string): string | null => {
    const match = pattern.exec(key)
    if (!match) return key
    const index = Number(match[1])
    if (index === removed) return null
    return index > removed ? \`\${path}.\${index - 1}\${match[2]}\` : key
  }
  const nextTouched = [...touched].map(move).filter((k): k is string => k !== null)
  touched.clear()
  nextTouched.forEach((k) => touched.add(k))
  const nextErrors: Record<string, string> = {}
  for (const [key, message] of Object.entries(errors)) {
    const target = move(key)
    if (target !== null) nextErrors[target] = message
  }
  for (const key of Object.keys(errors)) delete errors[key]
  Object.assign(errors, nextErrors)
}
async function fgAddItem(path: string): Promise<void> {
  const list = fgList(path)
  if (list.length >= (fgItemLimits[path]?.max ?? Number.POSITIVE_INFINITY)) return
  list.push(fgItemDefaults[path]!())
  await nextTick()
  const item = fgItemElements(path)[list.length - 1]
  const control = item?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea')
  ;(control ?? item)?.focus()
  fgAnnounce(${JSON.stringify(messages.itemAdded)}.split('{label}').join(fgItemLabel(path, list.length - 1)))
}
async function fgRemoveItem(path: string, index: number): Promise<void> {
  const list = fgList(path)
  if (list.length <= (fgItemLimits[path]?.min ?? 0)) return
  const label = fgItemLabel(path, index)
  fgShiftItems(path, index)
  list.splice(index, 1)
  await nextTick()
  const remaining = fgItemElements(path)
  const target = remaining[Math.min(index, remaining.length - 1)]
  ;(target ?? fgRoot.value?.querySelector<HTMLElement>(\`[data-fg-add="\${path}"]\`))?.focus()
  fgAnnounce(${JSON.stringify(messages.itemRemoved)}.split('{label}').join(label))
}`
        : ''

    // Reset buttons: back to the defaults, no errors, announced.
    const resetLogic = hasResetButton(schema)
      ? `function fgReset(): void {
  Object.assign(form, ${indentBlock(toJsLiteral(defaultsObject(schema)), 1).trimStart()})
  for (const key of Object.keys(errors)) delete errors[key]
  touched.clear()
  result.value = null${tagsFields.length > 0 ? `\n  for (const key of Object.keys(tagDrafts)) tagDrafts[key] = ''` : ''}
  fgAnnounce(${JSON.stringify(messages.formReset)})
}`
      : ''

    const submitUrl = schema.meta.submit?.url
    const submitBlock = submitUrl
      ? `    try {
      await fetch(${JSON.stringify(submitUrl)}, {
        method: ${JSON.stringify(schema.meta.submit?.method ?? 'POST')},
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } catch (error) {
      console.error('Submit failed', error)
    }\n`
      : ''

    const script = `<script setup lang="ts">
// Generated by FormsGen — no runtime dependencies beyond Vue.
import { nextTick, onBeforeUnmount, onMounted, reactive, ref${repeaters.length ? ', toRaw' : ''} } from 'vue'

const emit = defineEmits<{ submit: [data: Record<string, unknown>] }>()

type FormData = ${formDataType(schema)}

const form = reactive<FormData>(${toJsLiteral(defaultsObject(schema))})

const errors = reactive<Record<string, string>>({})
const touched = new Set<string>()
const result = ref<Record<string, unknown> | null>(null)

// Polite aria-live region; cleared first so repeated text re-announces.
const fgAnnouncement = ref('')
function fgAnnounce(message: string): void {
  fgAnnouncement.value = ''
  void nextTick(() => {
    fgAnnouncement.value = message
  })
}
${errorsTextFunction(messages, true)}

${RUNTIME_HELPERS_TS}

${visibilityFunctions(fields, accessor)}

const validators: Record<string, () => string | null> = ${validatorsLiteral(fields, accessor)}

function runValidator(path: string): void {
  const validate = validators[path]${repeaters.length ? ' ?? fgItemValidator(path)' : ''}
  if (!validate) return
  const message = validate()
  if (message) errors[path] = message
  else delete errors[path]
}

// A blur error appearing while a pointer is held reflows the form and the
// release misses its target; defer blur validation until the press ends.
let fgPressing = false
const fgDeferred = new Set<string>()
function fgFlushDeferred(): void {
  const paths = [...fgDeferred]
  fgDeferred.clear()
  for (const path of paths) touch(path)
}
function fgPointerDown(): void {
  fgFlushDeferred()
  fgPressing = true
}
function fgPointerEnd(): void {
  if (!fgPressing) return
  fgPressing = false
  setTimeout(fgFlushDeferred, 0)
}
onMounted(() => {
  window.addEventListener('pointerup', fgPointerEnd)
  window.addEventListener('pointercancel', fgPointerEnd)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerup', fgPointerEnd)
  window.removeEventListener('pointercancel', fgPointerEnd)
})

function touch(path: string): void {
  if (fgPressing) {
    fgDeferred.add(path)
    return
  }
  touched.add(path)
  runValidator(path)
}

function revalidate(path: string): void {
  if (touched.has(path)) runValidator(path)
}

function validateAll(): boolean {
  let ok = true
  for (const path of [...Object.keys(validators)${repeaters.length ? ', ...Object.keys(fgItemValidators).flatMap(fgItemPaths)' : ''}]) {
    touched.add(path)
    runValidator(path)
    if (errors[path]) ok = false
  }
  return ok
}
${sectionState ? `\n${sectionState}\n` : ''}${sectionPaths ? `\n${sectionPaths}\n` : ''}${stepLogic ? `\n${stepLogic}\n` : ''}${jumpLogic ? `\n${jumpLogic}\n` : ''}${tagsLogic ? `\n${tagsLogic}\n` : ''}${repeaterLogic ? `\n${repeaterLogic}\n` : ''}${resetLogic ? `\n${resetLogic}\n` : ''}
function buildPayload(): Record<string, unknown> {
  return ${indentBlock(payloadExpr(schema, accessor, undefined, items), 1).trimStart()}
}

async function onSubmit(): Promise<void> {
  if (!validateAll()) {${hosts.length > 0 ? '\n    fgJumpToError()' : ''}
    fgAnnounce(fgErrorsText(Object.keys(errors).length))
    return
  }
  const data = buildPayload()
  result.value = data
  fgAnnounce(${submittedText(messages)})
  emit('submit', data)
${submitBlock}}
</script>`

    const stylesheet = css.stylesheet?.(schema.meta.theme)
    const styleBlock = stylesheet ? `\n\n<style scoped>\n${stylesheet}</style>` : ''

    // Bottom actions row: omitted when the wizard embeds the submit.
    const submitGate =
      !embeddedHost && sb.gatingHosts.length
        ? ` v-if="${sb.gatingHosts.map((h) => `fgSec_${h.key} === ${h.sections.length - 1}`).join(' && ')}"`
        : ''
    const actionsBlock = embeddedHost
      ? ''
      : `\n    <div class="${css.classes('actions')}"${sb.actionsStyle ? ` style="${sb.actionsStyle}"` : ''}>
      <button${submitGate} class="${submitClass}"${sb.buttonStyle ? ` style="${sb.buttonStyle}"` : ''} type="submit">${sb.text}</button>
    </div>`

    const template = `<template>
  <form${repeaters.length ? '\n    ref="fgRoot"' : ''}
    class="${formRootClass(css.classes('form'), schema.meta.theme)}"${pinnedSchemeAttr(schema.meta.theme).replace(' ', '\n    ')}
    dir="${schema.meta.dir}"
    novalidate
    @submit.prevent="onSubmit"
    @pointerdown.capture="fgPointerDown"
  >
    <div class="${css.classes('grid')}">
${indentBlock(markup, 3)}
    </div>
    <div class="${css.classes('srOnly')}" role="status" aria-live="polite" aria-atomic="true">{{ fgAnnouncement }}</div>${actionsBlock}
    <pre v-if="result" class="${css.classes('payload')}">{{ JSON.stringify(result, null, 2) }}</pre>
  </form>
</template>`

    return [
      {
        path: `${name}.vue`,
        language: 'xml',
        content: `${script}\n\n${template}${styleBlock}\n`,
      },
    ]
  },
  readme: (ctx) => {
    const name = componentName(ctx.schema)
    return `# ${name} (standalone Vue 3 component)

Zero dependencies beyond Vue itself — validation, conditional visibility
and the submit payload are compiled into the component.

## Install

1. Copy \`${name}.vue\` into any Vue 3 project (e.g. one created with
   \`npm create vue@latest\`).
2. Use it:

\`\`\`html
<${name} @submit="payload => console.log(payload)" />
\`\`\`

${ctx.css.readmeNote()}
${ctx.schema.meta.submit?.url ? `\nOn valid submit the component also POSTs the payload to \`${ctx.schema.meta.submit.url}\`.` : ''}
`
  },
}
