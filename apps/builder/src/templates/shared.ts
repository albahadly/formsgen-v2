// What every template file needs: the two template languages, a text in
// both, and the form meta for one of them.

import type { FormSchema } from '@albahadly/formsgen-renderer'

export type TemplateLocale = 'en' | 'ar'

export type Text = { en: string; ar: string }
export const tx = (en: string, ar: string): Text => ({ en, ar })

export function meta(name: string, title: Text, lang: TemplateLocale, submitText: Text): FormSchema['meta'] {
  return {
    name,
    title: title[lang],
    locale: lang,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    submitButton: { text: submitText[lang] },
  }
}

/** The template language for a builder UI locale: Arabic stays Arabic, every other UI gets English templates. */
export function templateLocale(locale: string): TemplateLocale {
  return locale === 'ar' ? 'ar' : 'en'
}
