// Spam check (meta.captcha): Cloudflare Turnstile. The widget shows above
// the submit button, which stays disabled until the check passes; its token
// goes with the answers as "cf-turnstile-response" (Cloudflare's own field
// name), and the server checks it with its secret key before accepting the
// submission (see packages/submit-server). A token works once: after each
// submission the widget runs again.
//
// Cloudflare's testing keys: site key 1x00000000000000000000AA always
// passes, 2x00000000000000000000AB always blocks; secret
// 1x0000000000000000000000000000000AA always accepts the token.

import type { FormMeta } from './schema'

export const CAPTCHA_FIELD = 'cf-turnstile-response'
export const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA'
export const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA'
/** Site keys as Cloudflare issues them (letters, digits, "_" and "-"). */
export const SITE_KEY_PATTERN = /^[\w-]{10,100}$/

/** The site key when meta.captcha is on and valid, else null. */
export function captchaSiteKey(meta: Pick<FormMeta, 'captcha'>): string | null {
  const captcha = meta.captcha
  return captcha && captcha.provider === 'turnstile' && SITE_KEY_PATTERN.test(captcha.siteKey) ? captcha.siteKey : null
}

export interface Turnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string
  reset(widget?: string): void
  remove(widget: string): void
}
type TurnstileWindow = typeof globalThis & { turnstile?: Turnstile }
let loading: Promise<Turnstile> | null = null

/** Loads Cloudflare's script once; resolves with window.turnstile. */
export function loadTurnstile(): Promise<Turnstile> {
  const w = window as TurnstileWindow
  if (w.turnstile) return Promise.resolve(w.turnstile)
  if (loading) return loading
  loading = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script')
    // Cloudflare changes the file in place: no integrity hash is possible.
    script.src = TURNSTILE_SCRIPT
    script.onload = () => {
      const t = (window as TurnstileWindow).turnstile
      if (t) resolve(t)
      else script.onerror?.(new Event('error'))
    }
    script.onerror = () => {
      loading = null
      reject(new Error('Turnstile did not load'))
    }
    document.head.appendChild(script)
  })
  return loading
}
