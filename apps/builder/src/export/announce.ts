// Locale-aware built-in texts for the code-generating export targets:
// aria-live announcements, plural error counts and templated labels. All
// strings come from the renderer's message catalog, so every target speaks
// the same words as <FormsGenForm> for the form's meta.locale.

import { fill, type MessageCatalog, type PluralForms } from '@formsgen/renderer'
import type { SectionHostInfo } from './structure'

/** JS string literal that is also safe inside an inline <script>. */
export function jsString(text: string): string {
  return JSON.stringify(text).replace(/</g, '\\u003c')
}

/**
 * Single-quoted JS string literal that is also safe inside a double-quoted
 * HTML/Vue attribute.
 */
export function jsSingle(text: string): string {
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\x22').replace(/</g, '\\x3c')}'`
}

/** JS expression concatenating a `{name}` template with runtime expressions. */
export function jsTemplate(template: string, vars: Record<string, string>): string {
  const parts = template.split(/(\{\w+\})/).filter((p) => p !== '')
  return parts
    .map((part) => {
      const name = /^\{(\w+)\}$/.exec(part)?.[1]
      return name !== undefined && name in vars ? `(${vars[name]})` : jsSingle(part)
    })
    .join(' + ')
}

/**
 * Plural-category expression over an integer variable, valid as both JS and
 * C# (same operators); `q` wraps a category name in the language's quotes.
 * Mirrors the renderer's pluralCategory().
 */
export function pluralCategoryExpr(
  plural: MessageCatalog['plural'],
  v: string,
  q: (category: string) => string,
): string {
  if (plural === 'en') return `${v} == 1 ? ${q('one')} : ${q('other')}`
  return [
    `${v} == 1 ? ${q('one')}`,
    `${v} == 2 ? ${q('two')}`,
    `${v} % 100 >= 3 && ${v} % 100 <= 10 ? ${q('few')}`,
    `${v} % 100 >= 11 ? ${q('many')}`,
    q('other'),
  ].join(' : ')
}

function pluralEntries(forms: PluralForms): [string, string][] {
  return Object.entries(forms).filter((entry): entry is [string, string] => entry[1] !== undefined)
}

/** `fgErrorsText(count)` — mirrors the renderer's plural error announcement. */
export function errorsTextFunction(messages: MessageCatalog, typed: boolean): string {
  const forms = pluralEntries(messages.errors)
    .map(([category, text]) => `${category}: ${jsString(text)}`)
    .join(', ')
  const category = pluralCategoryExpr(messages.plural, 'count', (c) => `'${c}'`)
  return `function fgErrorsText(count${typed ? ': number' : ''})${typed ? ': string' : ''} {
  const forms${typed ? ': Record<string, string> & { other: string }' : ''} = { ${forms} }
  const text = forms[${category}] ?? forms.other
  return text.split('{n}').join(String(count))
}`
}

/** C# `FgErrorsText(int count)` for the Blazor target. */
export function errorsTextFunctionCs(messages: MessageCatalog, csStr: (s: string) => string): string {
  const forms = pluralEntries(messages.errors)
    .map(([category, text]) => `[${csStr(category)}] = ${csStr(text)}`)
    .join(', ')
  const category = pluralCategoryExpr(messages.plural, 'count', (c) => csStr(c))
  return `    private static readonly Dictionary<string, string> fgErrorForms = new() { ${forms} };

    private static string FgErrorsText(int count)
    {
        var category = ${category};
        var text = fgErrorForms.TryGetValue(category, out var form) ? form : fgErrorForms["other"];
        return text.Replace("{n}", count.ToString());
    }`
}

export function submittedText(messages: MessageCatalog): string {
  return jsString(messages.submitted)
}

/** Per-step announcement strings for a steps host, as a JS array literal. */
export function stepAnnouncementsLiteral(host: SectionHostInfo, messages: MessageCatalog): string {
  return `[${stepAnnouncements(host, messages)
    .map((text) => jsString(text))
    .join(', ')}]`
}

export function stepAnnouncements(host: SectionHostInfo, messages: MessageCatalog): string[] {
  return host.sections.map((s) =>
    fill(messages.stepProgress, { index: s.index + 1, total: host.sections.length, label: s.label }),
  )
}
