// Screen-reader announcement texts spoken through the form's polite
// aria-live region, per locale (see messages.ts). Export targets generate
// code producing the SAME strings (asserted in the builder's target tests).

import { fill, pluralText, resolveMessages } from './messages'

export function errorsAnnouncement(count: number, locale = 'en'): string {
  const messages = resolveMessages(locale)
  return pluralText(messages, messages.errors, count)
}

export function submittedAnnouncement(locale = 'en'): string {
  return resolveMessages(locale).submitted
}

/** `index` is zero-based. */
export function stepAnnouncement(index: number, total: number, label: string, locale = 'en'): string {
  return fill(resolveMessages(locale).stepProgress, { index: index + 1, total, label })
}
