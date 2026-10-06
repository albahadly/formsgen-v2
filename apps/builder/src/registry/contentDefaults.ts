// Default content of NEW elements in the form's language. Definitions carry
// English defaults (label = element name, "Option 1", "Choose…"…); when the
// form's locale is Arabic, a new element starts with Arabic text instead.
// Only untouched defaults are replaced; existing content is never changed.

import { resolveMessages, MESSAGES, type ElementNode } from '@formsgen/renderer'
import { tFor } from '@/i18n'
import { getElement } from './index'

const PHRASES_AR: Record<string, string> = {
  'Choose…': 'اختر…',
  'Type and press Enter': 'اكتب ثم اضغط Enter',
  Heading: 'عنوان',
  'Paragraph text.': 'نص الفقرة.',
  'Tell us more': 'أخبرنا المزيد',
}

const NUMBERED_AR: [RegExp, string][] = [
  [/^Option (\d+)$/, 'خيار $1'],
  [/^Tab (\d+)$/, 'تبويب $1'],
  [/^Step (\d+)$/, 'الخطوة $1'],
]

function arabicPhrase(text: string): string {
  if (text in PHRASES_AR) return PHRASES_AR[text]!
  for (const [pattern, replacement] of NUMBERED_AR) {
    if (pattern.test(text)) return text.replace(pattern, replacement)
  }
  return text
}

function localizeNode(node: ElementNode): void {
  const def = getElement(node.type)
  const props = node.props
  for (const key of ['label', 'placeholder', 'text'] as const) {
    const value = props[key]
    if (typeof value !== 'string' || value === '') continue
    // A default label equal to the element's name takes its Arabic name.
    const elementName =
      key === 'label' && def && value === def.label ? tFor('ar', `element.${node.type}.label`) : undefined
    props[key] = elementName ?? arabicPhrase(value)
  }
  if (Array.isArray(props['items'])) {
    props['items'] = (props['items'] as { value: string; label: string }[]).map((item) => ({
      ...item,
      label: arabicPhrase(item.label),
    }))
  }
  for (const child of node.children ?? []) localizeNode(child)
}

/** Rewrites a freshly created node's default texts for the form's locale. */
export function localizeNewNode(node: ElementNode, formLocale: string): ElementNode {
  if (resolveMessages(formLocale) === MESSAGES.ar) localizeNode(node)
  return node
}
