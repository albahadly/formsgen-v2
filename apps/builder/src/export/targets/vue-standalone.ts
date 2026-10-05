// Zero-dependency Vue 3 SFC export: plain template markup, reactive data,
// compiled validation and conditions — compiles as-is in a fresh
// `npm create vue@latest` project (REBUILD_PROMPT §7 target 3).

import { resolveMessages } from '@formsgen/renderer'
import { errorsTextFunction, stepAnnouncementsLiteral, submittedText } from '../announce'
import { FILE_HELPERS_TS, RUNTIME_HELPERS_TS, pruneUnusedHelpers } from '../compile'
import { postsUploads, uploadFields, uploadStatusMarkup, uploadTextHelper, vueUploadRuntime } from '../uploadRuntime'
import { ADD_DATE_TS, DUAL_RANGE_HELPERS_TS, MATRIX_TOGGLE_TS, exportStylesheet, hasMultiMatrix, hasRangeSlider, phoneCountryFields, phoneDefaults, phoneHelpers } from '../composite'
import { compileConditions } from '../compile'
import { calcSteps, vueCalcBlock } from '../calc'
import { answerHelpers, usesAnswers } from '../answers'
import { dragHandle, dragTargetAttrs, vueItemDrag } from '../itemDrag'
import { draftBar, draftHelpers, usesDraft, vueDraftBlock } from '../draft'
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
import { ITEM_VARS, repeaterLegend, vueItemMarkup } from '../repeaterMarkup'
import {
  collectSectionHosts,
  collectTemplateFields,
  defaultsObject,
  formDataType,
  hasResetButton,
  resolveSubmitButton,
  toJsLiteral,
  repeaterRef,
  tplHelper,
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
    // Item fields too (by template path), for the per-type helpers.
    const typedFields = collectTemplateFields(schema)
    // Calculated fields, in computing order.
    const steps = calcSteps(schema)
    const hosts = collectSectionHosts(schema)
    const messages = resolveMessages(schema.meta.locale)
    const repeaters = collectExportRepeaters(schema)
    // Depth 1 items are `item` (of form.x); an inner repeater's are `item2` (of item.y).
    const items: ItemAccess = {
      map: (r, body) =>
        r.depth === 1
          ? `form.${r.path}.map((item) => ${body})`
          : `item.${r.path.slice(r.parent!.length + 1)}.map((item2) => ${body})`,
      read: (template, r) => `${ITEM_VARS[r.depth - 1]!.item}.${template.slice(r.path.length + 1)}`,
    }
    /** Validators and visibility take the item as a parameter named `item`. */
    const itemParam: ItemAccess = { ...items, read: (template, r) => `item[${JSON.stringify(template.slice(r.path.length + 1))}]` }

    // Submit button: configurable text/placement/style (meta.submitButton).
    // With exactly ONE gating wizard, the submit replaces Next on its last
    // step; otherwise the bottom button is shown/gated.
    const sb = resolveSubmitButton(schema, hosts)
    const embeddedHost = sb.gatingHosts.length === 1 ? sb.gatingHosts[0]! : null
    const submitClass = css.classes(sb.secondary ? 'buttonSecondary' : 'submitButton')
    // Upload forms that post show progress; submit waits for the upload.
    const progress = postsUploads(schema, typedFields)
    const submitDisabled = progress ? ` :disabled="fgUpload.state === 'uploading'"` : ''

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
          ? `\n    <button v-if="${state} === ${last}" type="submit" class="${submitClass}"${submitDisabled}>${sb.text}</button>`
          : ''
      return `<div>\n  <ol class="${css.classes('stepList')}">\n${items}\n  </ol>\n${panels}\n  <div class="${css.classes('stepActions')}">\n    <button v-if="${state} > 0" type="button" class="${css.classes('buttonSecondary')}" @click="fgGo_${host.key}(${state} - 1)">${labels.back}</button>\n    <button v-if="${state} < ${last}" type="button" class="${css.classes('submitButton')}" @click="fgNext_${host.key}()">${labels.next}</button>${embeddedSubmit}\n  </div>\n</div>`
    }

    // Repeating sections: v-for over the item array; the item template's
    // fields bind to `item`, their paths/ids carry the index `i`.
    const renderRepeater = (r: RenderedRepeater): string => {
      const list = `form.${r.path}`
      // Loop variables of this depth (an inner repeater nests item2/j in item/i).
      const { item, index: i } = ITEM_VARS[r.depth - 1]!
      // The actions row shows while any of its buttons can: remove above the
      // minimum, move whenever there are two items (sortable repeaters).
      const shownAbove = r.sortable ? Math.min(r.limits.min, 1) : r.limits.min
      const actions = shownAbove > 0 ? ` v-if="${list}.length > ${shownAbove}"` : ''
      const remove = r.sortable && r.limits.min > 0 ? ` v-if="${list}.length > ${r.limits.min}"` : ''
      const moves = r.sortable
        ? `
        ${dragHandle('vue', css, r.messages, { path: r.path, index: i, list })}
        <button v-if="${i} > 0" type="button" class="${css.classes('repeaterMove')}" data-fg-move="up" :aria-label="fgMoveLabel('${r.path}', ${i}, 'up')" @click="fgMoveItem('${r.path}', ${i}, -1)">↑</button>
        <button v-if="${i} < ${list}.length - 1" type="button" class="${css.classes('repeaterMove')}" data-fg-move="down" :aria-label="fgMoveLabel('${r.path}', ${i}, 'down')" @click="fgMoveItem('${r.path}', ${i}, 1)">↓</button>`
        : ''
      const add = Number.isFinite(r.limits.max) ? ` v-if="${list}.length < ${r.limits.max}"` : ''
      return `<fieldset class="${css.classes('group')}" data-fg-repeater="${r.path}">${repeaterLegend(css, r, 'class')}
  <div class="${css.classes('repeaterItems')}">
    <fieldset v-for="(${item}, ${i}) in ${list}" :key="fgKeyOf(${item})" class="${css.classes('repeaterItem')}" data-fg-item tabindex="-1"${r.sortable ? dragTargetAttrs('vue', { path: r.path, index: i, list }) : ''}>
      <legend class="${css.classes('repeaterItemLabel')}">{{ fgItemLabel('${r.path}', ${i}) }}</legend>
${indentBlock(vueItemMarkup(r.itemHtml, r.path, r.depth), 3)}
      <div${actions} class="${css.classes('repeaterItemActions')}">${moves}
        <button${remove} type="button" class="${css.classes('repeaterRemove')}" :aria-label="fgRemoveLabel('${r.path}', ${i})" @click="fgRemoveItem('${r.path}', ${i})">${r.messages.removeItem}</button>
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
      itemOptions: (path) => ({ accessor: scopedAccessor(accessor, items, repeaterRef(path)) }),
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

    // Tags fields: a draft per field path + shared add/remove handlers.
    const tagsFields = typedFields.filter((f) => f.node.type === 'tags')
    const tagsLogic =
      tagsFields.length > 0
        ? `const tagDrafts = reactive<Record<string, string>>({})
function fgAddTag(path: string): void {
  const draft = (tagDrafts[path] ?? '').trim()
  const tags = fgGet(path) as string[]
  if (draft !== '' && !tags.includes(draft)) fgSet(path, [...tags, draft])
  tagDrafts[path] = ''
  revalidate(path)
}
function fgRemoveTag(path: string, index: number): void {
  fgSet(path, (fgGet(path) as string[]).filter((_, i) => i !== index))
  revalidate(path)
}`
        : ''

    // Composite fields: slider handles, and the multiple-dates draft store.
    const datesFields = typedFields.filter((f) => f.node.type === 'dates')
    const phoneFields = phoneCountryFields(typedFields)
    const compositeLogic = [
      hasRangeSlider(schema)
        ? `${DUAL_RANGE_HELPERS_TS}
function fgDualSet(v: FgRangeValue, side: 'from' | 'to', event: Event): void {
  const input = event.target as HTMLInputElement
  const next = fgDualClamp(v, side, Number(input.value))
  v.from = next.from
  v.to = next.to
  input.value = String(next[side])
}`
        : '',
      datesFields.length > 0
        ? `${ADD_DATE_TS}
const fgDateDrafts = reactive<Record<string, string>>({})
function fgAddDate(path: string): void {
  fgSet(path, fgWithDate(fgGet(path) as string[], fgDateDrafts[path] ?? ''))
  fgDateDrafts[path] = ''
  touch(path)
}
function fgRemoveDate(path: string, index: number): void {
  fgSet(path, (fgGet(path) as string[]).filter((_, i) => i !== index))
  touch(path)
}`
        : '',
      phoneFields.length > 0
        ? `${phoneHelpers(typedFields, schema.meta.locale, true)}
// Starting country per field (template path); the chosen one per field path.
const FG_PHONE_DEFAULTS: Record<string, string> = ${JSON.stringify(phoneDefaults(typedFields, schema.meta.locale, (f) => f.path))}
const fgPhoneCountry = reactive<Record<string, string>>({})
function fgPhoneCountryOf(path: string): string {
  return fgPhoneCountry[path] ?? fgPhoneFrom(fgGet(path), FG_PHONE_DEFAULTS[fgTpl(path)]!)
}
function fgPhoneSetCountry(path: string, event: Event): void {
  const typed = fgPhoneNumber(fgGet(path) as string, fgPhoneCountryOf(path))
  fgPhoneCountry[path] = (event.target as HTMLSelectElement).value
  fgSet(path, fgComposePhone(fgPhoneCountry[path]!, typed))
  revalidate(path)
}
function fgPhoneInput(path: string, event: Event): void {
  fgSet(path, fgComposePhone(fgPhoneCountryOf(path), (event.target as HTMLInputElement).value))
  revalidate(path)
}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    // Repeating sections: item factories, limits, per-item validators, and
    // add/remove (focus the new item / the item that moved up; announce).
    // Per-item UI state keyed by field path, re-keyed when items move.
    const itemStores = [
      tagsFields.length > 0 ? 'tagDrafts' : '',
      datesFields.length > 0 ? 'fgDateDrafts' : '',
      phoneFields.length > 0 ? 'fgPhoneCountry' : '',
    ].filter(Boolean)
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
/** Is a repeater (concrete path) shown? An inner one also asks its outer item. */
const fgRepeaterVisible: Record<string, (path: string) => boolean> = {
${repeaters
  .map((r) => {
    if (r.depth === 1) {
      return `  '${r.path}': (_path) => ${r.conditionChain.length ? r.conditionChain.map((g) => `(${compileConditions(g, accessor)})`).join(' && ') : 'true'},`
    }
    const outer = scopedAccessor(accessor, itemParam, { path: r.parent!, depth: 1, parent: null })
    const cond = r.itemConditionChain.length ? r.itemConditionChain.map((g) => `(${compileConditions(g, outer)})`).join(' && ') : 'true'
    return `  '${r.path}': (path) => {\n    const item = fgOuterItem(path)\n    return !!item && ${cond}\n  },`
  })
  .join('\n')}
}
/** Names of each repeater's inner repeaters (one level). */
const fgInnerRepeaters: Record<string, string[]> = ${JSON.stringify(
            Object.fromEntries(repeaters.map((r) => [r.path, repeaters.filter((x) => x.parent === r.path).map((x) => x.path.slice(r.path.length + 1))])),
          )}
const fgItemValidators: Record<string, Record<string, (item: Record<string, unknown>) => string | null>> = ${itemValidatorsLiteral(
            repeaters,
            accessor,
            itemParam,
            () => 'item: Record<string, unknown>',
            messages,
          )}

function fgList(path: string): Record<string, unknown>[] {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], form) as Record<string, unknown>[]
}
/** The outer item an inner list (\`travellers.2.bags\`) belongs to. */
function fgOuterItem(path: string): Record<string, unknown> | undefined {
  const match = /^(.+)\\.(\\d+)\\.[^.]+$/.exec(path)
  return match ? fgList(match[1]!)[Number(match[2])] : undefined
}
function fgItemLabel(path: string, index: number): string {
  return (fgItemLabels[fgTpl(path)] ?? '').split('{n}').join(String(index + 1))
}
function fgRemoveLabel(path: string, index: number): string {
  return ${JSON.stringify(messages.removeItemLabel)}.split('{label}').join(fgItemLabel(path, index))
}
/** Validator for an item field path like "people.2.name". */
function fgItemValidator(path: string): (() => string | null) | undefined {
  const match = /^(.+)\\.(\\d+)\\.([^.]+)$/.exec(path)
  if (!match) return undefined
  const validate = fgItemValidators[fgTpl(match[1]!)]?.[match[3]!]
  const item = fgList(match[1]!)[Number(match[2])]
  return validate && item ? () => validate(item) : undefined
}
/** Every item field path of a repeater, inner items included (validation, step gates). */
function fgItemPaths(path: string): string[] {
  const template = fgTpl(path)
  if (!fgRepeaterVisible[template]?.(path)) return []
  const fields = Object.keys(fgItemValidators[template] ?? {})
  return fgList(path).flatMap((_, i) => [
    ...fields.map((field) => \`\${path}.\${i}.\${field}\`),
    ...(fgInnerRepeaters[template] ?? []).flatMap((name) => fgItemPaths(\`\${path}.\${i}.\${name}\`)),
  ])
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
/**
 * Re-keys per-item state (touched, errors, drafts, chosen countries) when
 * items move or go: \`to\` maps an old index to its new one (null = gone).
 */
function fgRemapItems(path: string, to: (index: number) => number | null): void {
  const pattern = new RegExp('^' + path.replace(/\\./g, '\\\\.') + '\\\\.(\\\\d+)(\\\\..*)$')
  const move = (key: string): string | null => {
    const match = pattern.exec(key)
    if (!match) return key
    const next = to(Number(match[1]))
    return next === null ? null : \`\${path}.\${next}\${match[2]}\`
  }
  const nextTouched = [...touched].map(move).filter((k): k is string => k !== null)
  touched.clear()
  nextTouched.forEach((k) => touched.add(k))
  for (const store of [errors${itemStores.map((name) => `, ${name}`).join('')}]) {
    const next: Record<string, string> = {}
    for (const [key, value] of Object.entries(store)) {
      const target = move(key)
      if (target !== null) next[target] = value
    }
    for (const key of Object.keys(store)) delete store[key]
    Object.assign(store, next)
  }
}
/** A removed item's state goes; later items' state moves up one. */
function fgShiftItems(path: string, removed: number): void {
  fgRemapItems(path, (i) => (i === removed ? null : i > removed ? i - 1 : i))
}
async function fgAddItem(path: string): Promise<void> {
  const list = fgList(path)
  if (list.length >= (fgItemLimits[fgTpl(path)]?.max ?? Number.POSITIVE_INFINITY)) return
  list.push(fgItemDefaults[fgTpl(path)]!())
  await nextTick()
  const item = fgItemElements(path)[list.length - 1]
  const control = item?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea')
  ;(control ?? item)?.focus()
  fgAnnounce(${JSON.stringify(messages.itemAdded)}.split('{label}').join(fgItemLabel(path, list.length - 1)))
}
${
  repeaters.some((r) => r.node.props['sortable'] === true)
    ? `function fgMoveLabel(path: string, index: number, direction: 'up' | 'down'): string {
  return (direction === 'up' ? ${JSON.stringify(messages.moveItemUp)} : ${JSON.stringify(messages.moveItemDown)}).split('{label}').join(fgItemLabel(path, index))
}
/** Swaps an item with its neighbour; focus stays on the moved item. */
async function fgMoveItem(path: string, index: number, delta: -1 | 1): Promise<void> {
  const list = fgList(path)
  const target = index + delta
  if (target < 0 || target >= list.length) return
  const label = fgItemLabel(path, index)
  fgRemapItems(path, (i) => (i === index ? target : i === target ? index : i))
  list.splice(target, 0, list.splice(index, 1)[0]!)
  await nextTick()
  const item = fgItemElements(path)[target]
  const buttons = Array.from(item?.querySelectorAll<HTMLElement>('[data-fg-move]') ?? [])
  ;(buttons.find((b) => b.dataset['fgMove'] === (delta < 0 ? 'up' : 'down')) ?? buttons[0] ?? item)?.focus()
  fgAnnounce(${JSON.stringify(messages.itemMoved)}.split('{label}').join(label).split('{n}').join(String(target + 1)))
}
${vueItemDrag(messages)}
`
    : ''
}async function fgRemoveItem(path: string, index: number): Promise<void> {
  const list = fgList(path)
  if (list.length <= (fgItemLimits[fgTpl(path)]?.min ?? 0)) return
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
    // Per-field UI state a reset (or clearing saved answers) also empties.
    const resetExtras = `${tagsFields.length > 0 ? `\n  for (const key of Object.keys(tagDrafts)) tagDrafts[key] = ''` : ''}${datesFields.length > 0 ? `\n  for (const key of Object.keys(fgDateDrafts)) fgDateDrafts[key] = ''` : ''}${phoneFields.length > 0 ? '\n  for (const key of Object.keys(fgPhoneCountry)) delete fgPhoneCountry[key]' : ''}`
    const resetLogic = hasResetButton(schema)
      ? `function fgReset(): void {
  Object.assign(form, ${indentBlock(toJsLiteral(defaultsObject(schema)), 1).trimStart()})
  for (const key of Object.keys(errors)) delete errors[key]
  touched.clear()
  result.value = null${resetExtras}
  fgAnnounce(${JSON.stringify(messages.formReset)})
}`
      : ''

    const hasUploads = uploadFields(typedFields).length > 0
    // Path helpers for the per-type handlers (unused ones are pruned).
    const pathHelpers =
      hasUploads || tagsFields.length > 0 || datesFields.length > 0 || phoneFields.length > 0 || repeaters.length > 0
        ? `${tplHelper(true)}
function fgGet(path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], form)
}
function fgSet(path: string, value: unknown): void {
  const keys = path.split('.')
  const last = keys.pop()!
  const parent = keys.reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], form) as Record<string, unknown>
  parent[last] = value
}
`
        : ''
    const submitUrl = schema.meta.submit?.url
    const draft = usesDraft(schema)
    const submitBlock = progress
      ? `    fgUpload.state = 'uploading'
    fgUpload.percent = 0
    // multipart: a JSON "data" part + one part per file; XMLHttpRequest reports upload progress
    fgSend(
      ${JSON.stringify(submitUrl)},
      ${JSON.stringify(schema.meta.submit?.method ?? 'POST')},
      fgMultipart(data),
      (percent) => {
        fgUpload.percent = percent
      },
      (ok) => {
        fgUpload.state = ok ? 'done' : 'failed'
        if (ok) fgUpload.percent = 100${draft ? '\n        if (ok) fgDraftForget()' : ''}
        fgAnnounce(ok ? ${submittedText(messages)} : ${JSON.stringify(messages.uploadFailed)})
      },
    )\n`
      : submitUrl
      ? `    try {
      ${draft ? 'const response = ' : ''}await fetch(${JSON.stringify(submitUrl)}, {
        method: ${JSON.stringify(schema.meta.submit?.method ?? 'POST')},
        ${hasUploads ? '// multipart: a JSON "data" part + one part per file\n        body: fgMultipart(data),' : "headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify(data),"}
      })${draft ? '\n      // Sent: the answers kept in this browser go.\n      if (response.ok) fgDraftForget()' : ''}
    } catch (error) {
      console.error('Submit failed', error)
    }\n`
      : draft
      ? '  fgDraftForget()\n'
      : ''

    const script = `<script setup lang="ts">
// Generated by FormsGen — no runtime dependencies beyond Vue.
import { nextTick, onBeforeUnmount, onMounted, reactive, ref${repeaters.length ? ', toRaw' : ''}${steps.length || draft ? ', watch' : ''} } from 'vue'

const emit = defineEmits<{ submit: [data: Record<string, unknown>] }>()

type FormData = ${formDataType(schema)}

const form = reactive<FormData>(${toJsLiteral(defaultsObject(schema))})

const errors = reactive<Record<string, string>>({})
const touched = new Set<string>()
const result = ref<Record<string, unknown> | null>(null)${progress ? `
// Upload progress of the submission being sent.
const fgUpload = reactive<{ state: '' | 'uploading' | 'done' | 'failed'; percent: number }>({ state: '', percent: 0 })
${uploadTextHelper(messages, true)}` : ''}

// Polite aria-live region; cleared first so repeated text re-announces.
const fgAnnouncement = ref('')
function fgAnnounce(message: string): void {
  fgAnnouncement.value = ''
  void nextTick(() => {
    fgAnnouncement.value = message
  })
}
${errorsTextFunction(messages, true)}

${RUNTIME_HELPERS_TS}${hasMultiMatrix(schema) ? `\n${MATRIX_TOGGLE_TS}` : ''}${steps.length ? `\n${vueCalcBlock(steps)}` : ''}${usesAnswers(schema.tree) ? `\n${answerHelpers(true)}` : ''}
${pathHelpers}${hasUploads ? `${FILE_HELPERS_TS}\n${vueUploadRuntime(typedFields, messages)}\n` : ''}${draft ? `${draftHelpers(schema, 'vue', true)}\n${vueDraftBlock(messages, resetExtras)}\n` : ''}
${visibilityFunctions(fields, accessor)}

const validators: Record<string, () => string | null> = ${validatorsLiteral(fields, accessor, '', undefined, messages)}

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
  for (const path of [...Object.keys(validators)${repeaters.length ? `, ...${JSON.stringify(repeaters.filter((r) => r.depth === 1).map((r) => r.path))}.flatMap(fgItemPaths)` : ''}]) {
    touched.add(path)
    runValidator(path)
    if (errors[path]) ok = false
  }
  return ok
}
${sectionState ? `\n${sectionState}\n` : ''}${sectionPaths ? `\n${sectionPaths}\n` : ''}${stepLogic ? `\n${stepLogic}\n` : ''}${jumpLogic ? `\n${jumpLogic}\n` : ''}${tagsLogic ? `\n${tagsLogic}\n` : ''}${compositeLogic ? `\n${compositeLogic}\n` : ''}${repeaterLogic ? `\n${repeaterLogic}\n` : ''}${resetLogic ? `\n${resetLogic}\n` : ''}
function buildPayload(): Record<string, unknown> {
  return ${indentBlock(payloadExpr(schema, accessor, undefined, items), 1).trimStart()}
}

async function onSubmit(): Promise<void> {${progress ? "\n  if (fgUpload.state === 'uploading') return" : ''}
  if (!validateAll()) {${hosts.length > 0 ? '\n    fgJumpToError()' : ''}
    fgAnnounce(fgErrorsText(Object.keys(errors).length))
    return
  }
  const data = buildPayload()
  result.value = data
  fgAnnounce(${progress ? JSON.stringify(messages.uploadStarted) : submittedText(messages)})
  emit('submit', data)
${submitBlock}}
</script>`

    const stylesheet = exportStylesheet(css, schema)
    const styleBlock = stylesheet ? `\n\n<style scoped>\n${stylesheet}</style>` : ''

    // Bottom actions row: omitted when the wizard embeds the submit.
    const submitGate =
      !embeddedHost && sb.gatingHosts.length
        ? ` v-if="${sb.gatingHosts.map((h) => `fgSec_${h.key} === ${h.sections.length - 1}`).join(' && ')}"`
        : ''
    const actionsBlock = embeddedHost
      ? ''
      : `\n    <div class="${css.classes('actions')}"${sb.actionsStyle ? ` style="${sb.actionsStyle}"` : ''}>
      <button${submitGate} class="${submitClass}"${sb.buttonStyle ? ` style="${sb.buttonStyle}"` : ''} type="submit"${submitDisabled}>${sb.text}</button>
    </div>`

    const template = `<template>
  <form${repeaters.length ? '\n    ref="fgRoot"' : ''}
    class="${formRootClass(css.classes('form'), schema.meta.theme)}"${pinnedSchemeAttr(schema.meta.theme).replace(' ', '\n    ')}
    dir="${schema.meta.dir}"
    novalidate
    @submit.prevent="onSubmit"
    @pointerdown.capture="fgPointerDown"
  >${draft ? `\n${indentBlock(draftBar('vue', schema, css, messages), 2)}` : ''}
    <div class="${css.classes('grid')}">
${indentBlock(markup, 3)}
    </div>${progress ? `
    ${uploadStatusMarkup('vue', css, messages)}` : ''}
    <div class="${css.classes('srOnly')}" role="status" aria-live="polite" aria-atomic="true">{{ fgAnnouncement }}</div>${actionsBlock}
    <pre v-if="result" class="${css.classes('payload')}">{{ JSON.stringify(result, ${hasUploads ? 'fgFileJson' : 'null'}, 2) }}</pre>
  </form>
</template>`

    return [
      {
        path: `${name}.vue`,
        language: 'xml',
        content: pruneUnusedHelpers(`${script}\n\n${template}${styleBlock}\n`),
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
