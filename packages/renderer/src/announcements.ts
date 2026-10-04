// Screen-reader announcement texts spoken through the form's polite
// aria-live region. Export targets generate code producing the SAME
// strings (asserted in the builder's target tests).

export function errorsAnnouncement(count: number): string {
  return `${count} ${count === 1 ? 'error' : 'errors'}. Please fix the highlighted fields.`
}

export const SUBMITTED_ANNOUNCEMENT = 'Form submitted.'

/** `index` is zero-based. */
export function stepAnnouncement(index: number, total: number, label: string): string {
  return `Step ${index + 1} of ${total}: ${label}`
}
