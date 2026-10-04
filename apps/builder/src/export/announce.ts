// aria-live announcement code shared by the JS export targets. Texts come
// from the renderer's announcement functions, so every target speaks the
// exact same strings as <FormsGenForm>.

import {
  SUBMITTED_ANNOUNCEMENT,
  errorsAnnouncement,
  stepAnnouncement,
} from '@formsgen/renderer'
import type { SectionHostInfo } from './structure'

/** JS string literal that is also safe inside an inline <script>. */
export function jsString(text: string): string {
  return JSON.stringify(text).replace(/</g, '\\u003c')
}

export const SUBMITTED_TEXT = jsString(SUBMITTED_ANNOUNCEMENT)

/**
 * `fgErrorsText(count)` — mirrors errorsAnnouncement(). Built from the
 * renderer's own output for 1 and N so the wording cannot drift.
 */
export function errorsTextFunction(typed: boolean): string {
  const one = jsString(errorsAnnouncement(1))
  const many = jsString(errorsAnnouncement(2).replace(/^2 /, ' '))
  return `function fgErrorsText(count${typed ? ': number' : ''})${typed ? ': string' : ''} {
  return count === 1 ? ${one} : count + ${many}
}`
}

/** Per-step announcement strings for a steps host, as a JS array literal. */
export function stepAnnouncementsLiteral(host: SectionHostInfo): string {
  return `[${host.sections
    .map((s) => jsString(stepAnnouncement(s.index, host.sections.length, s.label)))
    .join(', ')}]`
}
