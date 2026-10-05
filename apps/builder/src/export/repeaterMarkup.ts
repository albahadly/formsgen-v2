// Turns a repeater's item template (rendered once with ITEM_TOKEN for the
// index) into per-item markup for each target language, and the shared
// wrapper markup (items, item legends, remove/add buttons).

import { pascalMember } from '@/registry/emitters/shared'
import type { CssFrameworkAdapter } from './css'
import type { RenderedRepeater } from './markup'
import { ITEM_TOKENS, pathKey } from './structure'

const ANY_TOKEN = `(?:${ITEM_TOKENS.join('|')})`
const csStringWithAnyToken = new RegExp(`"([^"\\s]*${ANY_TOKEN}[^"\\s]*)"`, 'g')
const attrWithAnyToken = new RegExp(` ([\\w-]+)="([^"]*${ANY_TOKEN}[^"]*)"`, 'g')

/** Loop variables per repeater depth: an inner item nests inside an outer one. */
export const ITEM_VARS = [
  { token: ITEM_TOKENS[0], item: 'item', index: 'i' },
  { token: ITEM_TOKENS[1], item: 'item2', index: 'j' },
] as const

/** `'a' + i + 'b'` for a static string around the token. */
function concat(value: string, token: string, indexVar: string): string {
  return value
    .split(token)
    .map((part) => `'${part}'`)
    .join(` + ${indexVar} + `)
}

/**
 * JS-template targets (Vue, JSX). `valueRoot` is how fields are bound
 * (`form`), so `form.people.__i__.name` becomes `item.name` (an inner
 * repeater's `form.travellers.__i__.bags.__j__.x` becomes `item2.x`; the
 * outer item's pass then makes `form.travellers.__i__.bags` `item.bags`).
 */
function jsItemMarkup(
  html: string,
  path: string,
  depth: number,
  valueRoot: string,
  attr: (name: string, expr: string) => string,
  /** A per-item key that survives moves (radio group names use it). */
  stableKey: string,
): string {
  const { token, item, index } = ITEM_VARS[depth - 1]!
  const quoted = new RegExp(`'([^'\\n]*?)${token}([^'\\n]*?)'`, 'g')
  const quotedKey = new RegExp(`'([^'\\n]*?)${token}([^'\\n]*?)':`, 'g')
  const attrs = new RegExp(` ([\\w-]+)="([^"]*${token}[^"]*)"`, 'g')
  return (
    html
      .split(`${valueRoot}.${path}.${token}.`)
      .join(`${item}.`)
      // An object key ({ ...d, 'people.__i__.x': v }) becomes a computed key.
      .replace(quotedKey, (_, a: string, b: string) => `['${a}' + ${index} + '${b}']:`)
      .replace(quoted, (_, a: string, b: string) => `('${a}' + ${index} + '${b}')`)
      // Radio group names follow the item, not its index: during a move two
      // items would otherwise share a group and the browser unchecks one.
      .replace(attrs, (_, name: string, value: string) => attr(name, concat(value, token, name === 'name' ? stableKey : index)))
  )
}

export function vueItemMarkup(html: string, path: string, depth = 1): string {
  const { item } = ITEM_VARS[depth - 1]!
  return jsItemMarkup(html, path, depth, 'form', (name, expr) => ` :${name}="${expr}"`, `fgKeyOf(${item})`)
}

export function reactItemMarkup(html: string, path: string, depth = 1): string {
  const { index } = ITEM_VARS[depth - 1]!
  return jsItemMarkup(html, path, depth, 'form', (name, expr) => ` ${name}={${expr}}`, `fgKeyAt('${path}', ${index})`)
}

/**
 * Razor: model members become item members (`Model.PeopleIName` →
 * `item.Name`) and ids embed the index (`fg_people_@(i)_name`).
 */
/** One repeater level for blazorItemMarkup: its path with outer tokens, and field names. */
export interface BlazorItemLevel {
  /** `travellers`, or for an inner repeater `travellers.__i__.bags`. */
  tokenPath: string
  depth: number
  fields: string[]
}

export function blazorItemMarkup(html: string, levels: BlazorItemLevel[]): string {
  let out = html
  // Every member to rewrite; longest first (`Model.PeopleIName` is a prefix
  // of `Model.PeopleINameFull`).
  const swaps: Array<[string, string]> = []
  for (const level of levels) {
    const { token, item } = ITEM_VARS[level.depth - 1]!
    for (const name of level.fields) {
      const member = pascalMember(pathKey(`${level.tokenPath}.${token}.${name}`))
      swaps.push([`Model.${member}`, `${item}.${pascalMember(name)}`])
      // Field keys (drafts, chosen country, change notices) become per item.
      swaps.push([`"${member}"`, `FgItemKey(${item}, "${member}", "${pascalMember(name)}")`])
    }
    if (level.depth === 2) {
      // The inner list lives on the outer item: Model.TravellersIBags → item.Bags.
      swaps.push([`Model.${pascalMember(pathKey(level.tokenPath))}`, `item.${pascalMember(level.tokenPath.split('.').pop()!)}`])
    }
  }
  for (const [from, to] of swaps.sort((a, b) => b[0].length - a[0].length)) out = out.split(from).join(to)
  // Component parameters (InputText id=…) reject mixed text/C#, so every
  // attribute carrying an index becomes one interpolated string. Radio
  // group names use the items' stable ids (see jsItemMarkup).
  out = out.replace(attrWithAnyToken, (_, name: string, value: string) =>
    ` ${name}="@($"${interpolate(value, name.toLowerCase() === 'name')}")"`,
  )
  // C# strings in code (element ref keys, paths) carry the indexes the same way.
  return out.replace(csStringWithAnyToken, (_, value: string) => `$"${interpolate(value)}"`)
}

/** C# interpolated-string body with `{i}` / `{j}` (or stable item ids) for the tokens. */
function interpolate(value: string, stable = false): string {
  const escaped = value.replace(/[{}]/g, (c) => c + c).replace(/"/g, '\\"')
  return ITEM_VARS.reduce(
    (text, v) => text.split(v.token).join(stable ? `{FgItemId(${v.item})}` : `{${v.index}}`),
    escaped,
  )
}

/** The repeater's own legend (group label), or nothing. */
export function repeaterLegend(css: CssFrameworkAdapter, r: RenderedRepeater, classAttr: string): string {
  return r.legend ? `\n  <legend ${classAttr}="${css.classes('groupLabel')}">${r.legend}</legend>` : ''
}
