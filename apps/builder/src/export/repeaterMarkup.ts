// Turns a repeater's item template (rendered once with ITEM_TOKEN for the
// index) into per-item markup for each target language, and the shared
// wrapper markup (items, item legends, remove/add buttons).

import { pascalMember } from '@/registry/emitters/shared'
import type { CssFrameworkAdapter } from './css'
import { ITEM_TOKEN, type RenderedRepeater } from './markup'

const TOKEN = ITEM_TOKEN
const quotedWithToken = new RegExp(`'([^'\\n]*?)${TOKEN}([^'\\n]*?)'`, 'g')
const quotedKeyWithToken = new RegExp(`'([^'\\n]*?)${TOKEN}([^'\\n]*?)':`, 'g')
const attrWithToken = new RegExp(` ([\\w-]+)="([^"]*${TOKEN}[^"]*)"`, 'g')
const csStringWithToken = new RegExp(`"([^"\\s]*${TOKEN}[^"\\s]*)"`, 'g')

/** `'a' + i + 'b'` for a static string around the token. */
function concat(value: string, indexVar: string): string {
  return value
    .split(TOKEN)
    .map((part) => `'${part}'`)
    .join(` + ${indexVar} + `)
}

/**
 * JS-template targets (Vue, JSX). `valueRoot` is how fields are bound
 * (`form`), so `form.people.__i__.name` becomes `item.name`.
 */
function jsItemMarkup(
  html: string,
  path: string,
  valueRoot: string,
  attr: (name: string, expr: string) => string,
  /** A per-item key that survives moves (radio group names use it). */
  stableKey: string,
): string {
  return (
    html
      .split(`${valueRoot}.${path}.${TOKEN}.`)
      .join('item.')
      // An object key ({ ...d, 'people.__i__.x': v }) becomes a computed key.
      .replace(quotedKeyWithToken, (_, a: string, b: string) => `['${a}' + i + '${b}']:`)
      .replace(quotedWithToken, (_, a: string, b: string) => `('${a}' + i + '${b}')`)
      // Radio group names follow the item, not its index: during a move two
      // items would otherwise share a group and the browser unchecks one.
      .replace(attrWithToken, (_, name: string, value: string) => attr(name, concat(value, name === 'name' ? stableKey : 'i')))
  )
}

export function vueItemMarkup(html: string, path: string): string {
  return jsItemMarkup(html, path, 'form', (name, expr) => ` :${name}="${expr}"`, 'fgKeyOf(item)')
}

export function reactItemMarkup(html: string, path: string): string {
  return jsItemMarkup(html, path, 'form', (name, expr) => ` ${name}={${expr}}`, `fgKeyAt('${path}', i)`)
}

/**
 * Razor: model members become item members (`Model.PeopleIName` →
 * `item.Name`) and ids embed the index (`fg_people_@(i)_name`).
 */
export function blazorItemMarkup(html: string, repeaterKey: string, childNames: string[]): string {
  let out = html
  // Longest first: `Model.PeopleIName` is a prefix of `Model.PeopleINameFull`.
  const byLength = [...childNames].sort((a, b) => b.length - a.length)
  for (const name of byLength) {
    const member = pascalMember(`${repeaterKey}_${TOKEN}_${name}`)
    out = out.split(`Model.${member}`).join(`item.${pascalMember(name)}`)
    // Field keys (drafts, chosen country, change notices) become per item.
    out = out.split(`"${member}"`).join(`FgItemKey(item, "${member}", "${pascalMember(name)}")`)
  }
  // Component parameters (InputText id=…) reject mixed text/C#, so every
  // attribute carrying the index becomes one interpolated string.
  // Radio group names use the item's stable id (see jsItemMarkup).
  out = out.replace(attrWithToken, (_, name: string, value: string) =>
    ` ${name}="@($"${interpolate(value, name === 'name' ? '{FgItemId(item)}' : '{i}')}")"`,
  )
  // C# strings in code (element ref keys) carry the index the same way.
  return out.replace(csStringWithToken, (_, value: string) => `$"${interpolate(value)}"`)
}

/** C# interpolated-string body with `{i}` for the index token. */
function interpolate(value: string, index = '{i}'): string {
  return value
    .split(TOKEN)
    .map((part) => part.replace(/[{}]/g, (c) => c + c).replace(/"/g, '\\"'))
    .join(index)
}

/** The repeater's own legend (group label), or nothing. */
export function repeaterLegend(css: CssFrameworkAdapter, r: RenderedRepeater, classAttr: string): string {
  return r.legend ? `\n  <legend ${classAttr}="${css.classes('groupLabel')}">${r.legend}</legend>` : ''
}
