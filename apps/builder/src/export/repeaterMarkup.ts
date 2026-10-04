// Turns a repeater's item template (rendered once with ITEM_TOKEN for the
// index) into per-item markup for each target language, and the shared
// wrapper markup (items, item legends, remove/add buttons).

import { pascalMember } from '@/registry/emitters/shared'
import type { CssFrameworkAdapter } from './css'
import { ITEM_TOKEN, type RenderedRepeater } from './markup'

const TOKEN = ITEM_TOKEN
const quotedWithToken = new RegExp(`'([^'\\n]*?)${TOKEN}([^'\\n]*?)'`, 'g')
const attrWithToken = new RegExp(` ([\\w-]+)="([^"]*${TOKEN}[^"]*)"`, 'g')

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
function jsItemMarkup(html: string, path: string, valueRoot: string, attr: (name: string, expr: string) => string): string {
  return html
    .split(`${valueRoot}.${path}.${TOKEN}.`)
    .join('item.')
    .replace(quotedWithToken, (_, a: string, b: string) => `('${a}' + i + '${b}')`)
    .replace(attrWithToken, (_, name: string, value: string) => attr(name, concat(value, 'i')))
}

export function vueItemMarkup(html: string, path: string): string {
  return jsItemMarkup(html, path, 'form', (name, expr) => ` :${name}="${expr}"`)
}

export function reactItemMarkup(html: string, path: string): string {
  return jsItemMarkup(html, path, 'form', (name, expr) => ` ${name}={${expr}}`)
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
  }
  // Component parameters (InputText id=…) reject mixed text/C#, so every
  // attribute carrying the index becomes one interpolated string.
  return out.replace(attrWithToken, (_, name: string, value: string) => {
    const parts = value.split(TOKEN).map((part) => part.replace(/[{}]/g, (c) => c + c).replace(/"/g, '\\"'))
    return ` ${name}="@($"${parts.join('{i}')}")"`
  })
}

/** The repeater's own legend (group label), or nothing. */
export function repeaterLegend(css: CssFrameworkAdapter, r: RenderedRepeater, classAttr: string): string {
  return r.legend ? `\n  <legend ${classAttr}="${css.classes('groupLabel')}">${r.legend}</legend>` : ''
}
