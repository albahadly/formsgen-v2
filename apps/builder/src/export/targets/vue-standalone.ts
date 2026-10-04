// Zero-dependency Vue 3 SFC export: plain template markup, reactive data,
// compiled validation and conditions — compiles as-is in a fresh
// `npm create vue@latest` project (REBUILD_PROMPT §7 target 3).

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

    const markup = renderTree(schema, {
      lang: 'vue',
      css,
      accessor,
      // Single-quoted so JSON string literals inside stay intact.
      conditionAttr: (_node, expr) => ` v-if='${expr.replace(/'/g, '&#39;')}'`,
      renderSections,
    })

    // Section state + per-step validation gates + submit error jump.
    const sectionState = hosts
      .map((host) => `const fgSec_${host.key} = ref(0)`)
      .join('\n')
    const sectionPaths = hosts
      .map(
        (host) =>
          `const fgSecPaths_${host.key} = [${host.sections.map((s) => `[${s.paths.map((p) => JSON.stringify(p)).join(', ')}]`).join(', ')}]`,
      )
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
  for (const path of fgSecPaths_${host.key}[fgSec_${host.key}.value] ?? []) {
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
    (host) => `  if (!(fgSecPaths_${host.key}[fgSec_${host.key}.value] ?? []).some((p) => errors[p])) {
    const target = fgSecPaths_${host.key}.findIndex((paths) => paths.some((p) => errors[p]))
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
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const emit = defineEmits<{ submit: [data: Record<string, unknown>] }>()

const form = reactive(${toJsLiteral(defaultsObject(schema))})

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

${RUNTIME_HELPERS}

${visibilityFunctions(fields, accessor)}

const validators: Record<string, () => string | null> = ${validatorsLiteral(fields, accessor)}

function runValidator(path: string): void {
  const validate = validators[path]
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
  for (const path of Object.keys(validators)) {
    touched.add(path)
    runValidator(path)
    if (errors[path]) ok = false
  }
  return ok
}
${sectionState ? `\n${sectionState}\n` : ''}${sectionPaths ? `\n${sectionPaths}\n` : ''}${stepLogic ? `\n${stepLogic}\n` : ''}${jumpLogic ? `\n${jumpLogic}\n` : ''}${tagsLogic ? `\n${tagsLogic}\n` : ''}
function buildPayload(): Record<string, unknown> {
  return ${indentBlock(payloadExpr(schema, accessor), 1).trimStart()}
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
  <form
    class="${css.classes('form')}"
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
