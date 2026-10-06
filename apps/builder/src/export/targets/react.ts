// Standalone React export: a zero-dependency .tsx function component
// (React 18+) with useState, compiled validation and conditions
// (REBUILD_PROMPT §7 target 5). Added as a plugin — no core changes.

import { servicesReadme } from '../readmeNotes'
import { resolveMessages } from '@formsgen/renderer'
import { errorsTextFunction, stepAnnouncementsLiteral, submittedText } from '../announce'
import { FILE_HELPERS_TS, RUNTIME_HELPERS_TS, pruneUnusedHelpers } from '../compile'
import { calcSteps, reactCalcBlock } from '../calc'
import { answerHelpers, usesAnswers } from '../answers'
import { dragHandle, dragTargetAttrs, movedIndexJs, reactItemDrag } from '../itemDrag'
import { hasSignature, reactSignatureHooks, reactSignatureModule } from '../signature'
import { hasRichText, reactRichTextHooks, richTextRuntime } from '../richAnswer'
import { hasLocation, locationRuntime, reactLocationHooks } from '../location'
import { CAPTCHA_FIELD, captchaKeyOf, captchaMarkup, captchaRuntime, reactCaptchaHooks } from '../captcha'
import { draftBar, draftHelpers, reactDraftHandlers, reactDraftHooks, usesDraft } from '../draft'
import { postsUploads, reactUploadHandlers, reactUploadModule, uploadFields, uploadStatusMarkup, uploadTextHelper } from '../uploadRuntime'
import {
  MATRIX_TOGGLE_TS,
  ADD_DATE_TS,
  DUAL_RANGE_HELPERS_TS,
  exportStylesheet,
  hasDates,
  hasMultiMatrix,
  hasRangeSlider,
  phoneCountryFields,
  phoneDefaults,
  phoneHelpers,
} from '../composite'
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
import { ITEM_VARS, reactItemMarkup, repeaterLegend } from '../repeaterMarkup'
import { compileConditions } from '../compile'
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
    // Item fields too (by template path), for the per-type helpers.
    const typedFields = collectTemplateFields(schema)
    // Calculated fields, in computing order (fgCalc runs on every new state).
    const steps = calcSteps(schema)
    const defaults = defaultsObject(schema)
    const hosts = collectSectionHosts(schema)
    const messages = resolveMessages(schema.meta.locale)
    const repeaters = collectExportRepeaters(schema)
    const hasRepeaters = repeaters.length > 0
    // JSX maps `form.<path>`; module functions map `data.<path>`.
    // Depth 1 items are `item`/`i`; an inner repeater's are `item2`/`j` (of item.y).
    const jsxItems: ItemAccess = {
      map: (r, body) =>
        r.depth === 1
          ? `form.${r.path}.map((item, i) => ${body})`
          : `item.${r.path.slice(r.parent!.length + 1)}.map((item2, j) => ${body})`,
      read: (template, r) => `${ITEM_VARS[r.depth - 1]!.item}.${template.slice(r.path.length + 1)}`,
    }
    const dataItems: ItemAccess = {
      map: (r, body) =>
        r.depth === 1
          ? `data.${r.path}.map((item) => ${body})`
          : `item.${r.path.slice(r.parent!.length + 1)}.map((item2) => ${body})`,
      read: (template, r) => `${ITEM_VARS[r.depth - 1]!.item}.${template.slice(r.path.length + 1)}`,
    }
    /** Validators and visibility take the item as a parameter named `item`. */
    const itemParam: ItemAccess = { ...dataItems, read: (template, r) => `item[${JSON.stringify(template.slice(r.path.length + 1))}]` }
    const validatorFor = hasRepeaters ? 'fgValidatorFor(path)' : 'validators[path]'

    // Submit button: configurable text/placement/style (meta.submitButton).
    // With exactly ONE gating wizard, the submit replaces Next on its last
    // step; otherwise the bottom button is shown/gated.
    const sb = resolveSubmitButton(schema, hosts)
    const embeddedHost = sb.gatingHosts.length === 1 ? sb.gatingHosts[0]! : null
    const submitClass = css.classes(sb.secondary ? 'buttonSecondary' : 'submitButton')
    // Upload forms that post show progress; submit waits for the upload.
    const progress = postsUploads(schema, typedFields)
    // The spam check (meta.captcha): submit waits for a passed check.
    const captchaKey = captchaKeyOf(schema)
    const disabledWhen = [progress ? "fgUpload.state === 'uploading'" : '', captchaKey ? "fgCaptchaToken === ''" : ''].filter(Boolean)
    const submitDisabled = disabledWhen.length
      ? ` disabled={${disabledWhen.join(' || ')}}${captchaKey ? ` aria-describedby={fgCaptchaToken === '' && !fgCaptchaFailed ? 'fg_captcha_hint' : undefined}` : ''}`
      : ''

    const renderSections = (host: RenderedSectionHost): string => {
      const state = `fgSec_${host.key}`
      const panels = host.sections
        .map(
          (s) =>
            `  <div${host.kind === 'tabs' ? ' role="tabpanel"' : ''} style={{ display: ${state} === ${s.index} ? undefined : 'none' }}>\n${indentBlock(s.html, 2)}\n  </div>`,
        )
        .join('\n')
      if (host.kind === 'tabs') {
        const buttons = host.sections
          .map(
            (s) =>
              `    <button type="button" role="tab" aria-selected={${state} === ${s.index}} className={${state} === ${s.index} ? "${css.classes('tabButtonActive')}" : "${css.classes('tabButton')}"} onClick={() => setFgSec_${host.key}(${s.index})}>${s.label}</button>`,
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
          ? `\n    {${state} === ${last} && <button type="submit" className="${submitClass}"${submitDisabled}>${sb.text}</button>}`
          : ''
      return `<div>\n  <ol className="${css.classes('stepList')}">\n${items}\n  </ol>\n${panels}\n  <div className="${css.classes('stepActions')}">\n    {${state} > 0 && <button type="button" className="${css.classes('buttonSecondary')}" onClick={() => fgGo_${host.key}(${state} - 1)}>${labels.back}</button>}\n    {${state} < ${last} && <button type="button" className="${css.classes('submitButton')}" onClick={fgNext_${host.key}}>${labels.next}</button>}${embeddedSubmit}\n  </div>\n</div>`
    }

    const renderRepeater = (r: RenderedRepeater): string => {
      const list = `form.${r.path}`
      // Loop variables of this depth (an inner repeater nests item2/j in item/i).
      const { item, index: i } = ITEM_VARS[r.depth - 1]!
      const removeButton = `<button type="button" className="${css.classes('repeaterRemove')}" aria-label={fgRemoveLabel('${r.path}', ${i})} onClick={() => fgRemoveItem('${r.path}', ${i})}>${r.messages.removeItem}</button>`
      // Sortable: move buttons (up from the 2nd item, down until the last);
      // the row shows while any button can, remove only above the minimum.
      const shownAbove = r.sortable ? Math.min(r.limits.min, 1) : r.limits.min
      const removeBtn = `<div className="${css.classes('repeaterItemActions')}">${
        r.sortable
          ? `
          ${dragHandle('react', css, r.messages, { path: r.path, index: i, list })}
          {${i} > 0 && <button type="button" className="${css.classes('repeaterMove')}" data-fg-move="up" aria-label={fgMoveLabel('${r.path}', ${i}, 'up')} onClick={() => fgMoveItem('${r.path}', ${i}, -1)}>↑</button>}
          {${i} < ${list}.length - 1 && <button type="button" className="${css.classes('repeaterMove')}" data-fg-move="down" aria-label={fgMoveLabel('${r.path}', ${i}, 'down')} onClick={() => fgMoveItem('${r.path}', ${i}, 1)}>↓</button>}`
          : ''
      }
          ${r.sortable && r.limits.min > 0 ? `{${list}.length > ${r.limits.min} && ${removeButton}}` : removeButton}
        </div>`
      const addBtn = `<button type="button" className="${css.classes('repeaterAdd')}" data-fg-add="${r.path}" onClick={() => fgAddItem('${r.path}')}>${r.addText}</button>`
      const itemMarkup = reactItemMarkup(r.itemHtml, r.path, r.depth)
      // Fields run by a script on the form (signatures, rich text, maps)
      // don't read the item: name it _item then (strict unused checks).
      const itemParam = new RegExp(`\\b${item}\\b`).test(itemMarkup) ? item : `_${item}`
      return `<fieldset className="${css.classes('group')}" data-fg-repeater="${r.path}">${repeaterLegend(css, r, 'className')}
  <div className="${css.classes('repeaterItems')}">
    {${list}.map((${itemParam}, ${i}) => (
      <fieldset key={fgKeyAt('${r.path}', ${i})} className="${css.classes('repeaterItem')}" data-fg-item tabIndex={-1}${r.sortable ? dragTargetAttrs('react', { path: r.path, index: i, list }) : ''}>
        <legend className="${css.classes('repeaterItemLabel')}">{fgItemLabel('${r.path}', ${i})}</legend>
${indentBlock(itemMarkup, 4)}
        ${shownAbove > 0 ? `{${list}.length > ${shownAbove} && (
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
      itemOptions: (path) => ({ accessor: scopedAccessor(formAccessor, jsxItems, repeaterRef(path)) }),
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
    const hasTags = typedFields.some((f) => f.node.type === 'tags')
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

    // Composite fields: handlers mark the field touched first, so setField
    // validates the NEW value (touch() would read the previous render's).
    const hasSlider = hasRangeSlider(schema)
    const hasDateList = hasDates(schema)
    const hasPhone = phoneCountryFields(typedFields).length > 0
    const compositeModule = [
      hasSlider ? DUAL_RANGE_HELPERS_TS : '',
      hasDateList ? ADD_DATE_TS : '',
      hasPhone
        ? `${phoneHelpers(typedFields, schema.meta.locale, true)}\n// Starting country per field (template path).\nconst FG_PHONE_DEFAULTS: Record<string, string> = ${JSON.stringify(phoneDefaults(typedFields, schema.meta.locale, (f) => f.path))}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')
    const compositeState = [
      hasDateList ? `  const [dateDrafts, setDateDrafts] = useState<Record<string, string>>({})` : '',
      hasPhone ? `  // The chosen country per field path (else the field's default).\n  const [phoneCountry, setPhoneCountry] = useState<Record<string, string>>({})` : '',
    ]
      .filter(Boolean)
      .join('\n')
    const compositeHandlers = [
      hasSlider
        ? `  function fgDualChange(path: string, current: FgRangeValue, side: 'from' | 'to', n: number): void {
    touched.current.add(path)
    setField(path, fgDualClamp(current, side, n))
  }`
        : '',
      hasDateList
        ? `  function fgAddDate(path: string, current: string[]): void {
    touched.current.add(path)
    setField(path, fgWithDate(current, dateDrafts[path] ?? ''))
    setDateDrafts((d) => ({ ...d, [path]: '' }))
  }

  function fgRemoveDate(path: string, current: string[], index: number): void {
    touched.current.add(path)
    setField(path, current.filter((_, i) => i !== index))
  }`
        : '',
      hasPhone
        ? `  function fgPhoneCountryOf(path: string): string {
    const value = path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], form)
    return phoneCountry[path] ?? fgPhoneFrom(value, FG_PHONE_DEFAULTS[fgTpl(path)]!)
  }

  function fgPhoneSetCountry(path: string, current: string, next: string): void {
    const typed = fgPhoneNumber(current, fgPhoneCountryOf(path))
    setPhoneCountry((c) => ({ ...c, [path]: next }))
    setField(path, fgComposePhone(next, typed))
  }

  function fgPhoneInput(path: string, number: string): void {
    setField(path, fgComposePhone(fgPhoneCountryOf(path), number))
  }`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    // Per-item UI state keyed by field path, re-keyed when items move.
    const itemStoreSetters = [hasTags ? 'setTagDrafts' : '', hasDateList ? 'setDateDrafts' : '', hasPhone ? 'setPhoneCountry' : ''].filter(Boolean)
    const fmtMax = (max: number): string => (Number.isFinite(max) ? String(max) : 'Number.POSITIVE_INFINITY')
    const repeaterModule = hasRepeaters
      ? `${repeaters.some((r) => r.node.props['sortable'] === true) ? `${movedIndexJs(true)}\n\n` : ''}const FG_ITEM_DEFAULTS: Record<string, () => Record<string, unknown>> = {
${repeaters.map((r) => `  '${r.path}': () => (${indentBlock(toJsLiteral(r.itemDefaults), 1).trimStart()}),`).join('\n')}
}

const FG_ITEM_LIMITS: Record<string, { min: number; max: number }> = {
${repeaters.map((r) => `  '${r.path}': { min: ${r.limits.min}, max: ${fmtMax(r.limits.max)} },`).join('\n')}
}

const FG_ITEM_LABELS: Record<string, string> = {
${repeaters.map((r) => `  '${r.path}': ${JSON.stringify(r.itemLabel)},`).join('\n')}
}

/** Is a repeater (concrete path) shown? An inner one also asks its outer item. */
const FG_REPEATER_VISIBLE: Record<string, (data: FormData, path: string) => boolean> = {
${repeaters
  .map((r) => {
    if (r.depth === 1) {
      return `  '${r.path}': (${r.conditionChain.length ? 'data' : '_data'}: FormData) => ${r.conditionChain.length ? r.conditionChain.map((g) => `(${compileConditions(g, dataAccessor)})`).join(' && ') : 'true'},`
    }
    const outer = scopedAccessor(dataAccessor, itemParam, { path: r.parent!, depth: 1, parent: null })
    const cond = r.itemConditionChain.length ? r.itemConditionChain.map((g) => `(${compileConditions(g, outer)})`).join(' && ') : 'true'
    return `  '${r.path}': (data: FormData, path: string) => {\n    const item = fgOuterItem(data, path)\n    return !!item && ${cond}\n  },`
  })
  .join('\n')}
}

/** Names of each repeater's inner repeaters (one level). */
const FG_INNER_REPEATERS: Record<string, string[]> = ${JSON.stringify(
          Object.fromEntries(repeaters.map((r) => [r.path, repeaters.filter((x) => x.parent === r.path).map((x) => x.path.slice(r.path.length + 1))])),
        )}

/** The outer item an inner list (\`travellers.2.bags\`) belongs to. */
function fgOuterItem(data: FormData, path: string): Record<string, unknown> | undefined {
  const match = /^(.+)\\.(\\d+)\\.[^.]+$/.exec(path)
  return match ? fgList(data, match[1]!)[Number(match[2])] : undefined
}

const itemValidators: Record<string, Record<string, (item: Record<string, unknown>, data: FormData) => string | null>> = ${itemValidatorsLiteral(
          repeaters,
          dataAccessor,
          itemParam,
          (_r, body) => `item: Record<string, unknown>, ${/\bdata\./.test(body) ? 'data' : '_data'}: FormData`,
          messages,
        )}

function fgList(data: FormData, path: string): Record<string, unknown>[] {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], data) as Record<string, unknown>[]
}

function fgItemLabel(path: string, index: number): string {
  return (FG_ITEM_LABELS[fgTpl(path)] ?? '').split('{n}').join(String(index + 1))
}

function fgRemoveLabel(path: string, index: number): string {
  return ${JSON.stringify(messages.removeItemLabel)}.split('{label}').join(fgItemLabel(path, index))
}

/** Every item field path of a visible repeater, inner items included (validation, step gates). */
function fgItemPaths(data: FormData, path: string): string[] {
  const template = fgTpl(path)
  if (!FG_REPEATER_VISIBLE[template]?.(data, path)) return []
  const fields = Object.keys(itemValidators[template] ?? {})
  return fgList(data, path).flatMap((_, i) => [
    ...fields.map((field) => \`\${path}.\${i}.\${field}\`),
    ...(FG_INNER_REPEATERS[template] ?? []).flatMap((name) => fgItemPaths(data, \`\${path}.\${i}.\${name}\`)),
  ])
}

/** Validator for a field path, including item paths like "people.2.name". */
function fgValidatorFor(path: string): ((data: FormData) => string | null) | undefined {
  const direct = validators[path]
  if (direct) return direct
  const match = /^(.+)\\.(\\d+)\\.([^.]+)$/.exec(path)
  if (!match) return undefined
  const validate = itemValidators[fgTpl(match[1]!)]?.[match[3]!]
  if (!validate) return undefined
  return (data) => {
    const item = fgList(data, match[1]!)[Number(match[2])]
    return item ? validate(item, data) : null
  }
}

/** All field paths to validate on submit (items included). */
function fgAllPaths(data: FormData): string[] {
  return [...Object.keys(validators), ...${JSON.stringify(repeaters.filter((r) => r.depth === 1).map((r) => r.path))}.flatMap((path) => fgItemPaths(data, path))]
}

/**
 * Re-keys an item path when items move or go: \`to\` maps an old index to
 * its new one (null = gone), e.g. "people.3.x" → "people.2.x".
 */
function fgRemapKey(key: string, path: string, to: (index: number) => number | null): string | null {
  if (!key.startsWith(path + '.')) return key
  const rest = key.slice(path.length + 1)
  const dot = rest.indexOf('.')
  const index = Number(dot === -1 ? rest : rest.slice(0, dot))
  if (!Number.isInteger(index)) return key
  const next = to(index)
  return next === null ? null : \`\${path}.\${next}\${dot === -1 ? '' : rest.slice(dot)}\`
}

/** A per-path store (errors, drafts…) with its item keys re-keyed. */
function fgRemapStore<T>(store: Record<string, T>, path: string, to: (index: number) => number | null): Record<string, T> {
  const next: Record<string, T> = {}
  for (const [key, value] of Object.entries(store)) {
    const target = fgRemapKey(key, path, to)
    if (target !== null) next[target] = value
  }
  return next
}`
      : ''
    const repeaterHooks = hasRepeaters
      ? `  const fgRoot = useRef<HTMLFormElement>(null)
  // Stable React keys per item (the form object is cloned on every edit).
  const fgKeys = useRef<Record<string, number[]>>({})
  const fgNextKey = useRef(0)
  const fgPendingFocus = useRef<{ path: string; index: number; move?: 'up' | 'down' | 'item' } | null>(null)`
      : ''
    const repeaterHandlers = hasRepeaters
      ? `  function fgKeyAt(path: string, index: number): number {
    const keys = (fgKeys.current[path] ??= [])
    while (keys.length <= index) keys.push(fgNextKey.current++)
    return keys[index]!
  }

  /** Re-keys per-item state (touched, errors, drafts, countries). */
  function fgRemapItems(path: string, to: (index: number) => number | null): void {
    touched.current = new Set([...touched.current].map((k) => fgRemapKey(k, path, to)).filter((k): k is string => k !== null))
    setErrors((prev) => fgRemapStore(prev, path, to))${itemStoreSetters.map((setter) => `\n    ${setter}((prev) => fgRemapStore(prev, path, to))`).join('')}${
      repeaters.some((r) => r.depth === 2)
        ? `
    // Inner lists' item keys are stored by list path ("travellers.2.bags").
    fgKeys.current = fgRemapStore(fgKeys.current, path, to)`
        : ''
    }
  }

  function fgAddItem(path: string): void {
    const list = fgList(form, path)
    if (list.length >= (FG_ITEM_LIMITS[fgTpl(path)]?.max ?? Number.POSITIVE_INFINITY)) return
    setField(path, [...list, FG_ITEM_DEFAULTS[fgTpl(path)]!()])
    fgPendingFocus.current = { path, index: list.length }
    fgAnnounce(${JSON.stringify(messages.itemAdded)}.split('{label}').join(fgItemLabel(path, list.length)))
  }

${
  repeaters.some((r) => r.node.props['sortable'] === true)
    ? `  function fgMoveLabel(path: string, index: number, direction: 'up' | 'down'): string {
    return (direction === 'up' ? ${JSON.stringify(messages.moveItemUp)} : ${JSON.stringify(messages.moveItemDown)}).split('{label}').join(fgItemLabel(path, index))
  }

  /** Swaps an item with its neighbour; focus stays on the moved item. */
  function fgMoveItem(path: string, index: number, delta: -1 | 1): void {
    const list = fgList(form, path)
    const target = index + delta
    if (target < 0 || target >= list.length) return
    const label = fgItemLabel(path, index)
    fgKeyAt(path, list.length - 1)
    const keys = fgKeys.current[path]!
    ;[keys[index], keys[target]] = [keys[target]!, keys[index]!]
    fgRemapItems(path, (i) => (i === index ? target : i === target ? index : i))
    const next = [...list]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    setField(path, next)
    fgPendingFocus.current = { path, index: target, move: delta < 0 ? 'up' : 'down' }
    fgAnnounce(${JSON.stringify(messages.itemMoved)}.split('{label}').join(label).split('{n}').join(String(target + 1)))
  }

${reactItemDrag(messages)}

`
    : ''
}  function fgRemoveItem(path: string, index: number): void {
    const list = fgList(form, path)
    if (list.length <= (FG_ITEM_LIMITS[fgTpl(path)]?.min ?? 0)) return
    const label = fgItemLabel(path, index)
    fgKeyAt(path, list.length - 1)
    fgKeys.current[path]!.splice(index, 1)
    fgRemapItems(path, (i) => (i === index ? null : i > index ? i - 1 : i))
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
    ${
      repeaters.some((r) => r.node.props['sortable'] === true)
        ? `if (pending.move === 'item') {
      // After a drop: the moved item itself.
      items[pending.index]?.focus()
    } else if (pending.move) {
      // After a move: the same button on the moved item, else its other one.
      const buttons = Array.from(items[pending.index]?.querySelectorAll<HTMLElement>('[data-fg-move]') ?? [])
      ;(buttons.find((b) => b.dataset['fgMove'] === pending.move) ?? buttons[0] ?? items[pending.index])?.focus()
    } else `
        : ''
    }if (pending.index >= 0) {
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
    // Back to INITIAL (reset buttons, clearing saved answers).
    const resetLines = `    setForm(${steps.length ? 'fgCalc(INITIAL)' : 'INITIAL'})
    setErrors({})
    touched.current.clear()${hasRepeaters ? '\n    fgKeys.current = {}' : ''}
    setResult(null)${hasTags ? '\n    setTagDrafts({})' : ''}${hasDateList ? '\n    setDateDrafts({})' : ''}${hasPhone ? '\n    setPhoneCountry({})' : ''}`
    const resetHandler = hasResetButton(schema)
      ? `  function fgReset(): void {
${resetLines}
    fgAnnounce(${JSON.stringify(messages.formReset)})
  }`
      : ''

    const hasUploads = uploadFields(typedFields).length > 0
    const submitUrl = schema.meta.submit?.url
    const draft = usesDraft(schema)
    const signatures = hasSignature(schema.tree)
    const rich = hasRichText(schema.tree)
    const locations = hasLocation(schema.tree)
    const submitBlock = progress
      ? `    setFgUpload({ state: 'uploading', percent: 0 })
    // multipart: a JSON "data" part + one part per file; XMLHttpRequest reports upload progress
    fgSend(
      ${JSON.stringify(submitUrl)},
      ${JSON.stringify(schema.meta.submit?.method ?? 'POST')},
      fgMultipart(data),
      (percent) => setFgUpload({ state: 'uploading', percent }),
      (ok) => {
        setFgUpload(ok ? { state: 'done', percent: 100 } : { state: 'failed', percent: 0 })${draft ? '\n        if (ok) fgDraftForget(form)' : ''}
        fgAnnounce(ok ? ${submittedText(messages)} : ${JSON.stringify(messages.uploadFailed)})
      },
    )\n`
      : submitUrl
      ? `    fetch(${JSON.stringify(submitUrl)}, {
      method: ${JSON.stringify(schema.meta.submit?.method ?? 'POST')},
      ${hasUploads ? '// multipart: a JSON "data" part + one part per file\n      body: fgMultipart(data),' : "headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify(data),"}
    })${draft ? '\n      // Sent: the answers kept in this browser go.\n      .then((response) => { if (response.ok) fgDraftForget(form) })' : ''}.catch((error) => console.error('Submit failed', error))\n`
      : draft
      ? '    fgDraftForget(form)\n'
      : ''

    const stylesheet = exportStylesheet(css, schema)
    const cssImport = stylesheet ? `import './${name}.css'\n` : ''

    // Bottom actions row: omitted when the wizard embeds the submit.
    const submitBtnEl = `<button className="${submitClass}"${sb.buttonStyle ? ` style={{ width: '100%' }}` : ''} type="submit"${submitDisabled}>${sb.text}</button>`
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
${RUNTIME_HELPERS_TS}${hasMultiMatrix(schema) ? `\n${MATRIX_TOGGLE_TS}` : ''}${steps.length ? `\n${reactCalcBlock(steps)}` : ''}${usesAnswers(schema.tree) ? `\n${answerHelpers(true)}` : ''}
${hasUploads ? `${FILE_HELPERS_TS}\n` : ''}${draft ? `${draftHelpers(schema, 'react', true)}\n` : ''}${signatures ? `${reactSignatureModule()}\n` : ''}${rich ? `${richTextRuntime(messages.richLinkPrompt, true)}\n` : ''}${locations ? `${locationRuntime(messages, true)}\n` : ''}${captchaKey ? `${captchaRuntime(true)}\n` : ''}
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
${repeaterModule ? `\n${repeaterModule}\n` : ''}${compositeModule ? `\n${compositeModule}\n` : ''}${hasUploads || hasPhone || hasRepeaters ? `\n${tplHelper(true)}\n` : ''}${hasUploads ? `\n${reactUploadModule(typedFields, messages)}\n` : ''}${progress ? `${uploadTextHelper(messages, true)}\n` : ''}${sectionPathsConsts ? `\n${sectionPathsConsts}\n` : ''}${stepAnnounceConsts ? `${stepAnnounceConsts}\n` : ''}
${errorsTextFunction(messages, true)}

export default function ${name}({
  onSubmit,
}: {
  onSubmit?: (data: Record<string, unknown>) => void
}) {
  const [form, setForm] = useState<FormData>(${steps.length ? '() => fgCalc(INITIAL)' : 'INITIAL'})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [result, setResult] = useState<Record<string, unknown> | null>(null)${progress ? `
  // Upload progress of the submission being sent.
  const [fgUpload, setFgUpload] = useState<{ state: '' | 'uploading' | 'done' | 'failed'; percent: number }>({ state: '', percent: 0 })` : ''}
  const touched = useRef(new Set<string>())
  const [fgAnnouncement, setFgAnnouncement] = useState('')
${draft ? `${reactDraftHooks(steps.length > 0)}\n` : ''}${sectionHooks ? `${sectionHooks}\n` : ''}${tagsState ? `${tagsState}\n` : ''}${compositeState ? `${compositeState}\n` : ''}${repeaterHooks ? `${repeaterHooks}\n` : ''}
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
    const typed = ${steps.length ? 'fgCalc(next as unknown as FormData)' : 'next as unknown as FormData'}
    setForm(typed)
    if (touched.current.has(path)) validateField(path, typed)${steps.length ? `
    // Calculated fields: after a submit attempt their errors follow new values.
    for (const p of fgCalcPaths(typed)) if (p !== path && touched.current.has(p)) validateField(p, typed)` : ''}
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
${tagsHandlers ? `\n${tagsHandlers}\n` : ''}${!hasRepeaters && (signatures || rich || locations) ? '\n  const fgRoot = useRef<HTMLFormElement>(null)\n' : ''}${signatures ? `\n${reactSignatureHooks()}\n` : ''}${rich ? `\n${reactRichTextHooks()}\n` : ''}${locations ? `\n${reactLocationHooks()}\n` : ''}${captchaKey ? `\n${reactCaptchaHooks(captchaKey, schema.meta.locale)}\n` : ''}${compositeHandlers ? `\n${compositeHandlers}\n` : ''}${hasUploads ? `\n${reactUploadHandlers(typedFields)}\n` : ''}${repeaterHandlers ? `\n${repeaterHandlers}\n` : ''}${resetHandler ? `\n${resetHandler}\n` : ''}${draft ? `\n${reactDraftHandlers(messages, resetLines)}\n` : ''}
  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault()${progress ? "\n    if (fgUpload.state === 'uploading') return" : ''}
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
    const data = buildPayload(form)${captchaKey ? `
    if (fgCaptchaToken === '') {
      fgAnnounce(${JSON.stringify(messages.captchaWait)})
      return
    }
    data[${JSON.stringify(CAPTCHA_FIELD)}] = fgCaptchaToken
    // A token works once: a new check for the next submission.
    setFgCaptchaToken('')
    fgCaptchaReset(fgCaptchaEl.current)` : ''}
    setResult(data)
    fgAnnounce(${progress ? JSON.stringify(messages.uploadStarted) : submittedText(messages)})
    onSubmit?.(data)
${submitBlock}  }

  return (
    <form${hasRepeaters || signatures || rich || locations ? ' ref={fgRoot}' : ''} className="${formRootClass(css.classes('form'), schema.meta.theme)}"${pinnedSchemeAttr(schema.meta.theme)} dir="${schema.meta.dir}" noValidate onSubmit={handleSubmit} onPointerDownCapture={() => { fgFlush.current(); fgPressing.current = true }}>${draft ? `\n${indentBlock(draftBar('react', schema, css, messages), 3)}` : ''}
      <div className="${css.classes('grid')}">
${indentBlock(markup, 4)}
      </div>
${progress ? `      ${uploadStatusMarkup('react', css, messages)}
` : ''}${captchaKey ? `${indentBlock(captchaMarkup('react', css, messages), 3)}\n` : ''}      <div className="${css.classes('srOnly')}" role="status" aria-live="polite" aria-atomic="true">{fgAnnouncement}</div>${actionsBlock}
      {result && <pre className="${css.classes('payload')}">{JSON.stringify(result, ${hasUploads ? 'fgFileJson' : 'null'}, 2)}</pre>}
    </form>
  )
}
`

    const files: { path: string; language: 'typescript' | 'css'; content: string }[] = [
      { path: `${name}.tsx`, language: 'typescript', content: pruneUnusedHelpers(tsx) },
    ]
    if (stylesheet) {
      files.push({ path: `${name}.css`, language: 'css', content: stylesheet })
    }
    return files
  },
  readme: (ctx) => {
    const name = componentName(ctx.schema)
    const services = servicesReadme(ctx.schema, 'react')
    return `# ${name} (standalone React component)

No npm dependencies beyond React 18+ — validation, conditional visibility
and the submit payload are compiled into the component.${services ? ' At run time it loads the services listed below.' : ''}

## Install

1. Copy \`${name}.tsx\`${exportStylesheet(ctx.css, ctx.schema) ? ` and \`${name}.css\`` : ''} into any React + TypeScript project
   (e.g. \`npm create vite@latest -- --template react-ts\`).
2. Use it:

\`\`\`tsx
<${name} onSubmit={(payload) => console.log(payload)} />
\`\`\`

${ctx.css.readmeNote()}
${ctx.schema.meta.submit?.url ? `\nOn valid submit the component also POSTs the payload to \`${ctx.schema.meta.submit.url}\`.` : ''}
${services}`
  },
}
