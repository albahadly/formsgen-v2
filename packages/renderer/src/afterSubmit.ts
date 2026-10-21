// After submit (meta.afterSubmit): once the answers were sent, a thank-you
// message replaces the form, or the page goes to another address (which
// wins when both are set). The message may carry answers ({full_name}, see
// pipe.ts); the address must be http(s) or relative — never mailto:/tel:.

import { isSafeUrl } from './elements'
import type { FormSchema } from './schema'

export interface AfterSubmit {
  message: string | null
  redirectUrl: string | null
}

/** An address a page may go to after sending: http(s) or relative. */
export function isRedirectUrl(value: unknown): value is string {
  return isSafeUrl(value) && !/^(mailto|tel):/i.test(value.trim())
}

/** The form's after-submit settings, normalised (blank = none). */
export function afterSubmitOf(schema: FormSchema): AfterSubmit {
  const config = schema.meta.afterSubmit
  const message = typeof config?.message === 'string' && config.message.trim() !== '' ? config.message : null
  const redirectUrl = isRedirectUrl(config?.redirectUrl) ? config.redirectUrl.trim() : null
  return { message, redirectUrl }
}
