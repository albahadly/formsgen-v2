// The form's rules for a server: a zod schema (Node, TypeScript) and a JSON
// Schema (any language), mirroring the renderer's rules.ts — a rule other
// than `required` is skipped while the value is empty; a size is a string's
// length, a list's item count or the number itself; a required checkbox must
// be true. Fields hidden by conditions may be absent from a submission
// (pickVisibleData leaves them out): they are optional, and zod re-checks
// `required` when the condition holds. What JSON Schema cannot say (that,
// same-as, a date range's order, rich text judged as text) the README
// lists. Value shapes follow the renderer's defaults and toSubmission.

import {
  MATRIX_TYPE,
  defaultRuleMessage,
  fileLimits,
  fill,
  getCoreElement,
  joinPath,
  matrixColumns,
  matrixMultiple,
  matrixRows,
  repeaterLimits,
  resolveMessages,
  type ConditionGroups,
  type ElementNode,
  type FormSchema,
  type MessageCatalog,
  type Rule,
} from '@albahadly/formsgen-renderer'
import { CAPTCHA_FIELD, captchaKeyOf } from './captcha'
import { RUNTIME_HELPERS_TS, compileConditions, pruneUnusedHelpers } from './compile'
import { isRequired, selectItems } from './structure'
import { componentName } from './targets/types'

export type Shape =
  | { kind: 'string'; format?: 'date' }
  | { kind: 'number'; nullable: boolean }
  | { kind: 'boolean' }
  | { kind: 'choice'; options: string[] | null }
  | { kind: 'list'; options: string[] | null; format?: 'date' }
  | { kind: 'files'; maxFiles: number; maxBytes: number; maxMb: number }
  | { kind: 'range2' }
  | { kind: 'daterange' }
  | { kind: 'location' }
  | { kind: 'matrix'; rows: string[]; columns: string[]; multiple: boolean }
  | { kind: 'object'; props: Prop[] }
  | { kind: 'array'; props: Prop[]; min: number; max: number }

export interface Prop {
  name: string
  /** Data path from the root (dots); inside a repeater item, from the item. */
  path: string
  shape: Shape
  node: ElementNode
  required: boolean
  /** Under a condition (its own or an ancestor's): may be absent from a submission. */
  conditional: boolean
  /** The condition groups that must all hold for the field to be shown (root scope). */
  conditions: ConditionGroups[]
  /** The rules with their messages for the form's locale. */
  rules: { rule: Rule; message: string }[]
  /** Inside a repeater item: conditions there are item-scoped and not re-checked. */
  inItem: boolean
}

function optionValues(node: ElementNode): string[] | null {
  const values = selectItems(node).map((item) => item.value)
  return values.length > 0 ? values : null
}

function leafShape(node: ElementNode): Shape {
  switch (node.type) {
    case 'number':
    case 'calculated':
    case 'rating':
    case 'nps':
    case 'currency':
      return { kind: 'number', nullable: true }
    case 'range':
      return { kind: 'number', nullable: false }
    case 'checkbox':
    case 'toggle':
      return { kind: 'boolean' }
    case 'select':
    case 'radiogroup':
      return { kind: 'choice', options: optionValues(node) }
    case 'checkboxgroup':
    case 'multiselect':
      return { kind: 'list', options: optionValues(node) }
    case 'tags':
      return { kind: 'list', options: null }
    case 'dates':
      return { kind: 'list', options: null, format: 'date' }
    case 'file':
    case 'imageupload':
    case 'signature': {
      const limits = fileLimits(node)
      return {
        kind: 'files',
        maxFiles: limits.multiple ? limits.maxFiles : 1,
        maxBytes: Math.round(limits.maxSizeMb * 1024 * 1024),
        maxMb: limits.maxSizeMb,
      }
    }
    case 'rangeslider':
      return { kind: 'range2' }
    case 'daterange':
      return { kind: 'daterange' }
    case 'location':
      return { kind: 'location' }
    case MATRIX_TYPE:
      return {
        kind: 'matrix',
        rows: matrixRows(node).map((r) => String(r.value)),
        columns: matrixColumns(node).map((c) => String(c.value)),
        multiple: matrixMultiple(node),
      }
    case 'date':
      return { kind: 'string', format: 'date' }
    default:
      return { kind: 'string' }
  }
}

/** The form as a tree of typed properties with their rules. */
export function validationModel(schema: FormSchema): { props: Prop[]; messages: MessageCatalog } {
  const messages = resolveMessages(schema.meta.locale)
  const prop = (node: ElementNode, parentPath: string, conditions: ConditionGroups[], inItem: boolean, shape: Shape): Prop => ({
    name: node.name as string,
    path: joinPath(parentPath, node.name as string),
    shape,
    node,
    required: isRequired(node),
    conditional: conditions.length > 0,
    conditions,
    rules: (node.validation ?? []).map((rule) => ({ rule, message: rule.message ?? defaultRuleMessage(rule, messages) })),
    inItem,
  })
  const walk = (nodes: ElementNode[], parentPath: string, chain: ConditionGroups[], inItem: boolean): Prop[] => {
    const out: Prop[] = []
    for (const node of nodes) {
      const core = getCoreElement(node.type)
      if (!core) continue
      const conditions = node.conditions?.length ? [...chain, node.conditions] : chain
      if (node.type === 'repeater') {
        if (!node.name) continue
        const limits = repeaterLimits(node)
        out.push(prop(node, parentPath, conditions, inItem, { kind: 'array', props: walk(node.children ?? [], '', [], true), min: limits.min, max: limits.max }))
        continue
      }
      if (core.isContainer) {
        if (node.name) out.push(prop(node, parentPath, conditions, inItem, { kind: 'object', props: walk(node.children ?? [], joinPath(parentPath, node.name), conditions, inItem) }))
        else out.push(...walk(node.children ?? [], parentPath, conditions, inItem))
        continue
      }
      if (!core.hasValue || !node.name) continue
      out.push(prop(node, parentPath, conditions, inItem, leafShape(node)))
    }
    return out
  }
  return { props: walk(schema.tree, '', [], false), messages }
}

// ---- zod ----

const q = (s: string): string => JSON.stringify(s)
const ident = (name: string): string => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : q(name))
const enumList = (values: string[]): string => `[${values.map(q).join(', ')}]`
const EMAIL_SOURCE = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'

const ZOD_HELPERS = `// A size rule's measure: a string's length, a list's item count, the number itself.
function fgAtLeast(v: unknown, n: number): boolean {
  const s = fgSize(v)
  return s !== null && s >= n
}
function fgAtMost(v: unknown, n: number): boolean {
  const s = fgSize(v)
  return s !== null && s <= n
}
function fgUrl(v: unknown): boolean {
  if (typeof v !== 'string') return false
  try {
    new URL(v)
    return true
  } catch {
    return false
  }
}
function fgMatches(v: unknown, pattern: string): boolean {
  if (typeof v !== 'string') return false
  try {
    return new RegExp(pattern).test(v)
  } catch {
    return false
  }
}
// Rich text: the rules judge the visible text, not the markup.
function fgPlain(v: unknown): string {
  return typeof v === 'string' ? v.replace(/<[^>]*>/g, '') : ''
}`

function fileMessages(shape: Extract<Shape, { kind: 'files' }>, messages: MessageCatalog): { size: string; count: string } {
  return {
    size: fill(messages.fileTooLarge, { name: 'A file', size: shape.maxMb }),
    count: shape.maxFiles === 1 ? messages.tooManyFilesOne : fill(messages.tooManyFiles, { n: shape.maxFiles }),
  }
}

function zodObject(props: Prop[], indent: string, messages: MessageCatalog): string {
  const inner = `${indent}  `
  const lines = props.map((p) => `${inner}${ident(p.name)}: ${zodProp(p, inner, messages)},`)
  return `z.object({\n${lines.join('\n')}\n${indent}})`
}

function zodBase(shape: Shape, indent: string, messages: MessageCatalog): string {
  switch (shape.kind) {
    case 'string':
      return 'z.string()'
    case 'number':
      return shape.nullable ? 'z.number().nullable()' : 'z.number()'
    case 'boolean':
      return 'z.boolean()'
    case 'choice':
      return shape.options ? `z.union([z.enum(${enumList(shape.options)}), z.literal(''), z.null()])` : 'z.string().nullable()'
    case 'list':
      return `z.array(${shape.options ? `z.enum(${enumList(shape.options)})` : 'z.string()'})`
    case 'files': {
      const m = fileMessages(shape, messages)
      const size = shape.maxBytes > 0 ? `.max(${shape.maxBytes}, ${q(m.size)})` : ''
      const count = shape.maxFiles > 0 ? `.max(${shape.maxFiles}, ${q(m.count)})` : ''
      return `z.array(z.object({ name: z.string(), size: z.number()${size}, type: z.string() }))${count}`
    }
    case 'range2':
      return 'z.object({ from: z.number(), to: z.number() })'
    case 'daterange':
      return `z.object({ from: z.string(), to: z.string() }).refine((v) => !fgDateOrder(v), ${q(messages.dateOrder)})`
    case 'location':
      return 'z.object({ lat: z.number(), lng: z.number() }).nullable()'
    case 'matrix': {
      const column = shape.columns.length > 0 ? `z.enum(${enumList(shape.columns)})` : 'z.string()'
      const answer = shape.multiple ? `z.array(${column})` : `z.union([${column}, z.null()])`
      if (shape.rows.length === 0) return `z.record(z.string(), ${answer})`
      return `z.object({\n${shape.rows.map((row) => `${indent}  ${ident(row)}: ${answer},`).join('\n')}\n${indent}})`
    }
    case 'object':
      return zodObject(shape.props, indent, messages)
    case 'array':
      return `z.array(${zodObject(shape.props, indent, messages)})${shape.min > 0 ? `.min(${shape.min})` : ''}${Number.isFinite(shape.max) ? `.max(${shape.max})` : ''}`
  }
}

function zodProp(prop: Prop, indent: string, messages: MessageCatalog): string {
  const judged = prop.node.type === 'richtext' ? 'fgPlain(v)' : 'v'
  let out = zodBase(prop.shape, indent, messages)
  for (const { rule, message } of prop.rules) {
    const m = q(message)
    switch (rule.rule) {
      case 'required':
        out += prop.shape.kind === 'boolean' ? `.refine((v) => v === true, ${m})` : `.refine((v) => !fgIsBlank(v), ${m})`
        break
      case 'min':
        out += `.refine((v) => fgIsEmpty(v) || fgAtLeast(${judged}, ${Number(rule.value)}), ${m})`
        break
      case 'max':
        out += `.refine((v) => fgIsEmpty(v) || fgAtMost(${judged}, ${Number(rule.value)}), ${m})`
        break
      case 'between': {
        if (!Array.isArray(rule.value)) {
          out += `.refine((v) => fgIsEmpty(v), ${m})`
          break
        }
        const [lo, hi] = rule.value as [unknown, unknown]
        out += `.refine((v) => fgIsEmpty(v) || (fgAtLeast(${judged}, ${Number(lo)}) && fgAtMost(${judged}, ${Number(hi)})), ${m})`
        break
      }
      case 'email':
        out += `.refine((v) => fgIsEmpty(v) || (typeof v === 'string' && FG_EMAIL.test(v)), ${m})`
        break
      case 'url':
        out += `.refine((v) => fgIsEmpty(v) || fgUrl(v), ${m})`
        break
      case 'regex':
        out += `.refine((v) => fgIsEmpty(v) || fgMatches(${judged}, ${q(String(rule.value))}), ${m})`
        break
      case 'same-as':
        break // root refinement, see zodRootChecks
    }
  }
  if (prop.conditional) out += '.optional()'
  return out
}

/** Root-scoped properties (objects flattened, repeater items left out). */
function rootProps(props: Prop[]): Prop[] {
  return props.flatMap((p) => (p.shape.kind === 'object' ? [p, ...rootProps(p.shape.props)] : [p]))
}

const dataAccessor = (path: string): string => `data${path.split('.').map((s) => (/^[A-Za-z_$][\w$]*$/.test(s) ? `?.${s}` : `?.[${q(s)}]`)).join('')}`
const pathArray = (path: string): string => `[${path.split('.').map(q).join(', ')}]`

/** same-as, and required under a condition that holds: checks over the whole submission. */
function zodRootChecks(props: Prop[]): string[] {
  const checks: string[] = []
  for (const p of rootProps(props)) {
    if (p.shape.kind === 'object') continue
    for (const { rule, message } of p.rules) {
      if (rule.rule !== 'same-as') continue
      const self = dataAccessor(p.path)
      checks.push(`  if (!fgIsEmpty(${self}) && ${self} !== ${dataAccessor(String(rule.value))}) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ${pathArray(p.path)}, message: ${q(message)} })`)
    }
    const required = p.rules.find(({ rule }) => rule.rule === 'required')
    if (p.conditional && required) {
      const shown = p.conditions.map((groups) => `(${compileConditions(groups, dataAccessor)})`).join(' && ')
      const blank = p.shape.kind === 'boolean' ? `${dataAccessor(p.path)} !== true` : `fgIsBlank(${dataAccessor(p.path)})`
      checks.push(`  if (${shown} && ${blank}) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ${pathArray(p.path)}, message: ${q(required.message)} })`)
    }
  }
  return checks
}

/** The zod module for a form (zod 3.22+, also zod 4). */
export function zodSource(schema: FormSchema): string {
  const { props, messages } = validationModel(schema)
  const name = componentName(schema)
  const captcha = captchaKeyOf(schema) ? `  ${q(CAPTCHA_FIELD)}: z.string().optional(),\n` : ''
  const body = `z.object({\n${props.map((p) => `  ${ident(p.name)}: ${zodProp(p, '  ', messages)},`).join('\n')}\n${captcha}})`
  const checks = zodRootChecks(props)
  const root = checks.length > 0 ? `${body}.superRefine((data, ctx) => {\n${checks.join('\n')}\n})` : body
  const usesEmail = /FG_EMAIL/.test(root)
  const helpers = pruneUnusedHelpers(`${RUNTIME_HELPERS_TS}\n${ZOD_HELPERS}\n${root}\n`).slice(0, -(root.length + 1))
  return `// Generated by FormsGen: the rules of ${q(schema.meta.title ?? schema.meta.name)} for a server,
// mirroring the form's own validation. A rule other than "required" is
// skipped while the value is empty; a size is a string's length, a list's
// item count or the number itself. A field hidden by a condition may be
// absent from a submission: it is optional here, and "required" is checked
// again when its condition holds. Needs zod 3.22 or later.
import { z } from 'zod'

${usesEmail ? `const FG_EMAIL = /${EMAIL_SOURCE}/\n` : ''}${helpers.trimEnd()}

export const ${name}Schema = ${root}

export type ${name} = z.infer<typeof ${name}Schema>
`
}

// ---- JSON Schema ----

type Json = Record<string, unknown>

/** A string/list rule set as JSON Schema keywords that apply to a non-empty value. */
function sizeKeywords(prop: Prop, kind: 'string' | 'array'): Json {
  const out: Json = {}
  const [min, max] = kind === 'string' ? ['minLength', 'maxLength'] : ['minItems', 'maxItems']
  const rich = prop.node.type === 'richtext'
  for (const { rule } of prop.rules) {
    switch (rule.rule) {
      case 'min':
        if (!rich) out[min] = Number(rule.value)
        break
      case 'max':
        if (!rich) out[max] = Number(rule.value)
        break
      case 'between':
        if (!rich && Array.isArray(rule.value)) {
          out[min] = Number(rule.value[0])
          out[max] = Number(rule.value[1])
        }
        break
      case 'email':
        if (kind === 'string') out['pattern'] = EMAIL_SOURCE
        break
      case 'url':
        if (kind === 'string') out['format'] = 'uri'
        break
      case 'regex':
        if (kind === 'string' && !rich) out['pattern'] = String(rule.value)
        break
    }
  }
  return out
}

/** The keywords, required or not: a required value must satisfy them, an optional one may be empty instead. */
function withSize(base: Json, keywords: Json, required: boolean, emptyCase: Json): Json {
  if (Object.keys(keywords).length === 0) return base
  if (!required) return { ...base, anyOf: [emptyCase, keywords] }
  if ('pattern' in base && 'pattern' in keywords) {
    const { pattern: own, ...rest } = base
    const { pattern: ruled, ...more } = keywords
    return { ...rest, ...more, allOf: [{ pattern: own }, { pattern: ruled }] }
  }
  return { ...base, ...keywords }
}

function jsonObject(props: Prop[]): Json {
  const properties: Json = {}
  for (const p of props) properties[p.name] = jsonProp(p)
  const required = props.filter((p) => p.required && !p.conditional).map((p) => p.name)
  return { type: 'object', properties, ...(required.length > 0 ? { required } : {}) }
}

function jsonProp(prop: Prop): Json {
  const { shape, required } = prop
  switch (shape.kind) {
    case 'string': {
      const base: Json = { type: 'string', ...(shape.format ? { format: shape.format } : {}), ...(required ? { minLength: 1, pattern: '\\S' } : {}) }
      const keywords = sizeKeywords(prop, 'string')
      if (required && typeof keywords['minLength'] === 'number') base['minLength'] = Math.max(1, keywords['minLength'] as number)
      return withSize(base, keywords, required, { maxLength: 0 })
    }
    case 'number': {
      const out: Json = { type: required || !shape.nullable ? 'number' : ['number', 'null'] }
      for (const { rule } of prop.rules) {
        if (rule.rule === 'min') out['minimum'] = Number(rule.value)
        if (rule.rule === 'max') out['maximum'] = Number(rule.value)
        if (rule.rule === 'between' && Array.isArray(rule.value)) {
          out['minimum'] = Number(rule.value[0])
          out['maximum'] = Number(rule.value[1])
        }
      }
      return out
    }
    case 'boolean':
      return required ? { type: 'boolean', const: true } : { type: 'boolean' }
    case 'choice':
      if (shape.options) return { enum: required ? shape.options : [...shape.options, '', null] }
      return required ? { type: 'string', minLength: 1, pattern: '\\S' } : { type: ['string', 'null'] }
    case 'list': {
      const items: Json = shape.options ? { enum: shape.options } : shape.format ? { type: 'string', format: shape.format } : { type: 'string' }
      const base: Json = { type: 'array', items, ...(shape.options ? { uniqueItems: true } : {}), ...(required ? { minItems: 1 } : {}) }
      const keywords = sizeKeywords(prop, 'array')
      if (required && typeof keywords['minItems'] === 'number') base['minItems'] = Math.max(1, keywords['minItems'] as number)
      return withSize(base, keywords, required, { maxItems: 0 })
    }
    case 'files':
      return {
        type: 'array',
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, size: { type: 'number', ...(shape.maxBytes > 0 ? { maximum: shape.maxBytes } : {}) }, type: { type: 'string' } },
          required: ['name', 'size', 'type'],
        },
        ...(required ? { minItems: 1 } : {}),
        ...(shape.maxFiles > 0 ? { maxItems: shape.maxFiles } : {}),
      }
    case 'range2':
      return { type: 'object', properties: { from: { type: 'number' }, to: { type: 'number' } }, required: ['from', 'to'] }
    case 'daterange': {
      const part: Json = { type: 'string', format: 'date', ...(required ? { minLength: 1 } : {}) }
      return { type: 'object', properties: { from: part, to: part }, required: ['from', 'to'] }
    }
    case 'location':
      return { type: required ? 'object' : ['object', 'null'], properties: { lat: { type: 'number' }, lng: { type: 'number' } }, required: ['lat', 'lng'] }
    case 'matrix': {
      const answer: Json = shape.multiple
        ? { type: 'array', items: shape.columns.length > 0 ? { enum: shape.columns } : { type: 'string' }, ...(required ? { minItems: 1 } : {}) }
        : shape.columns.length > 0
          ? { enum: required ? shape.columns : [...shape.columns, null] }
          : { type: required ? 'string' : ['string', 'null'] }
      const properties: Json = {}
      for (const row of shape.rows) properties[row] = answer
      return shape.rows.length > 0 ? { type: 'object', properties, required: shape.rows } : { type: 'object', additionalProperties: answer }
    }
    case 'object':
      return jsonObject(shape.props)
    case 'array':
      return { type: 'array', items: jsonObject(shape.props), minItems: shape.min, ...(Number.isFinite(shape.max) ? { maxItems: shape.max } : {}) }
  }
}

/** The JSON Schema (draft 2020-12) for a form's submissions. */
export function jsonSchemaOf(schema: FormSchema): Json {
  const { props } = validationModel(schema)
  const root = jsonObject(props)
  const properties = root['properties'] as Json
  if (captchaKeyOf(schema)) properties[CAPTCHA_FIELD] = { type: 'string' }
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: schema.meta.title ?? schema.meta.name,
    description:
      'Generated by FormsGen: the shape and rules of a submission. A rule other than "required" lets an empty value through, as the form does. "Required when a condition holds", "same as another field" and the order of a date range are not expressed here (the zod schema has them).',
    ...root,
  }
}

/** The README that goes with the two files. */
export function validationReadme(schema: FormSchema): string {
  const name = componentName(schema)
  const file = schema.meta.name
  return `# ${schema.meta.title ?? schema.meta.name} — server-side validation

Two files carry the form's rules for your server, mirroring what the form
itself checks: a rule other than *required* is skipped while the value is
empty; a size is a string's length, a list's item count or the number
itself; a required checkbox must be ticked. A field hidden by a condition
may be absent from a submission (the form only sends what is shown).

## \`${file}.zod.ts\` — Node / TypeScript (zod 3.22+)

\`\`\`ts
import { ${name}Schema } from './${file}.zod'

app.post('/submit', (req, res) => {
  const result = ${name}Schema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ errors: result.error.issues })
  const answers = result.data // typed: ${name}
  // …
})
\`\`\`

The zod schema has everything: required fields under a condition are checked
when the condition holds (\`superRefine\`), *same as* compares the two fields,
a date range must end after it starts, rich text is judged by its visible
text. Unknown keys are dropped by \`z.object\`; use \`.passthrough()\` to keep them.

## \`${file}.schema.json\` — any language (JSON Schema 2020-12)

\`\`\`ts
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import schema from './${file}.schema.json'

const validate = addFormats(new Ajv2020({ allErrors: true })).compile(schema)
if (!validate(req.body)) return res.status(400).json({ errors: validate.errors })
\`\`\`

Any validator that reads draft 2020-12 works; \`uri\` and \`date\` formats need
a formats plug-in (\`ajv-formats\` for ajv). Not expressed in JSON Schema:
*required when a condition holds* (such fields are simply optional), *same
as another field*, the order of a date range, and size rules on rich text.

## What a submission looks like

JSON with one key per field (named groups nest; repeaters are arrays of
objects). Files arrive as \`{ name, size, type }\` descriptors in the JSON
\`data\` part of a multipart request, the bytes as separate parts named by
field path — validate the \`data\` part.${captchaKeyOf(schema) ? ` The spam-check token comes as
\`${CAPTCHA_FIELD}\`; verify it with your Turnstile secret before trusting the rest.` : ''}
`
}
