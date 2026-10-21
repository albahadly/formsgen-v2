// The spam check (meta.captcha: Cloudflare Turnstile) in the code targets,
// as the renderer's FormsGenForm: the widget above the actions row, the
// submit button disabled until the check passes, the token sent with the
// answers as "cf-turnstile-response", and a fresh check after each send
// (a token works once). The server checks the token with its secret key
// (packages/submit-server: TURNSTILE_SECRET).

import { CAPTCHA_FIELD, TURNSTILE_SCRIPT, captchaSiteKey, type FormSchema, type MessageCatalog } from '@albahadly/formsgen-renderer'
import { jsString } from './announce'
import type { CssFrameworkAdapter } from './css/types'

/** The site key when the form has a spam check, else null. */
export const captchaKeyOf = (schema: FormSchema): string | null => captchaSiteKey(schema.meta)

export { CAPTCHA_FIELD }

/** Loads Cloudflare's script once and renders the widget (ES5; `ts` adds annotations). */
export function captchaRuntime(ts: boolean): string {
  const t = (annotation: string): string => (ts ? annotation : '')
  return `// Spam check (Cloudflare Turnstile): onToken(token, failed) runs when the
// check passes, and with '' when it expires or fails.
${t(`interface FgTurnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string
  reset(widget?: string): void
  remove(widget: string): void
}
type FgTurnstileWindow = Window & { turnstile?: FgTurnstile }
type FgCaptchaEl = HTMLElement & { fgCaptcha?: boolean; fgCaptchaId?: string }
`)}var fgTurnstileWaiting${t(': [() => void, () => void][] | null')} = null
function fgCaptcha(el${t(': FgCaptchaEl | null')}, siteKey${t(': string')}, lang${t(': string')}, onToken${t(': (token: string, failed: boolean) => void')}) {
  if (!el || el.fgCaptcha) return
  el.fgCaptcha = true
  var w = window${t(' as FgTurnstileWindow')}
  var render = function () {
    var api = w.turnstile
    if (!el.isConnected || !api) return
    el.fgCaptchaId = api.render(el, {
      sitekey: siteKey,
      language: lang,
      callback: function (token${t(': string')}) { onToken(token, false) },
      'expired-callback': function () { onToken('', false) },
      'error-callback': function () { onToken('', true) },
    })
  }
  if (w.turnstile) { render(); return }
  if (!fgTurnstileWaiting) {
    fgTurnstileWaiting = []
    var script = document.createElement('script')
    // Cloudflare changes this file in place: no integrity hash is possible.
    script.src = ${JSON.stringify(TURNSTILE_SCRIPT)}
    script.onload = function () {
      var waiting = fgTurnstileWaiting
      fgTurnstileWaiting = null
      if (waiting) waiting.forEach(function (pair) { if (w.turnstile) pair[0](); else pair[1]() })
    }
    script.onerror = function () {
      var waiting = fgTurnstileWaiting
      fgTurnstileWaiting = null
      if (waiting) waiting.forEach(function (pair) { pair[1]() })
    }
    document.head.appendChild(script)
  }
  fgTurnstileWaiting.push([render, function () { onToken('', true) }])
}
// A token works once: a new check for the next submission.
function fgCaptchaReset(el${t(': FgCaptchaEl | null')}) {
  var w = window${t(' as FgTurnstileWindow')}
  if (el && el.fgCaptchaId !== undefined && w.turnstile) w.turnstile.reset(el.fgCaptchaId)
}`
}

/** The widget block above the actions row; `lang` picks the markup flavor. */
export function captchaMarkup(
  lang: 'vue' | 'react' | 'html' | 'blazor',
  css: CssFrameworkAdapter,
  messages: MessageCatalog,
): string {
  const box = css.classes('captcha')
  const hint = css.classes('captchaHint')
  const error = css.classes('error')
  const text = (s: string): string => {
    const html = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return lang === 'react' ? `{${JSON.stringify(s)}}` : lang === 'blazor' ? html.replace(/@/g, '&#64;') : lang === 'vue' ? html.replace(/\{\{/g, '&#123;&#123;') : html
  }
  const failed = text(messages.captchaFailed)
  const wait = text(messages.captchaWait)
  switch (lang) {
    case 'vue':
      return `<div class="${box}">
  <div ref="fgCaptchaEl"></div>
  <p v-if="fgCaptchaFailed" class="${error}">${failed}</p>
  <p v-else-if="fgCaptchaToken === ''" id="fg_captcha_hint" class="${hint}">${wait}</p>
</div>`
    case 'react':
      return `<div className="${box}">
  <div ref={fgCaptchaEl}></div>
  {fgCaptchaFailed ? <p className="${error}">${failed}</p> : fgCaptchaToken === '' ? <p id="fg_captcha_hint" className="${hint}">${wait}</p> : null}
</div>`
    case 'html':
      return `<div class="${box}">
  <div data-fg-captcha></div>
  <p class="${error}" data-fg-captcha-failed hidden>${failed}</p>
  <p id="fg_captcha_hint" class="${hint}" data-fg-captcha-hint>${wait}</p>
</div>`
    case 'blazor':
      return `<div class="${box}">
    <div @ref="fgCaptchaEl"></div>
    @if (fgCaptchaFailed)
    {
        <p class="${error}">${failed}</p>
    }
    else if (fgCaptchaToken == "")
    {
        <p id="fg_captcha_hint" class="${hint}">${wait}</p>
    }
</div>`
  }
}

/** Vue (script setup): the widget on mount. */
export function vueCaptcha(siteKey: string, locale: string): string {
  return `${captchaRuntime(true)}
const fgCaptchaEl = ref<HTMLElement | null>(null)
const fgCaptchaToken = ref('')
const fgCaptchaFailed = ref(false)
onMounted(() => {
  fgCaptcha(fgCaptchaEl.value, ${jsString(siteKey)}, ${jsString(locale)}, (token, failed) => {
    fgCaptchaToken.value = token
    fgCaptchaFailed.value = failed
  })
})`
}

/** React: inside the component. */
export function reactCaptchaHooks(siteKey: string, locale: string): string {
  return `  // Spam check: the submit button waits for a passed check.
  const fgCaptchaEl = useRef<HTMLDivElement>(null)
  const [fgCaptchaToken, setFgCaptchaToken] = useState('')
  const [fgCaptchaFailed, setFgCaptchaFailed] = useState(false)
  useEffect(() => {
    fgCaptcha(fgCaptchaEl.current, ${jsString(siteKey)}, ${jsString(locale)}, (token, failed) => {
      setFgCaptchaToken(token)
      setFgCaptchaFailed(failed)
    })
  }, [])`
}

/** Blazor: the script (installed through IJSRuntime) and its .NET side. */
export function blazorCaptcha(siteKey: string, locale: string): { script: string; members: string } {
  const script = `${captchaRuntime(false)}
window.fgCaptchaWire = function (el, dotnet) {
  fgCaptcha(el, ${JSON.stringify(siteKey)}, ${JSON.stringify(locale)}, function (token, failed) {
    dotnet.invokeMethodAsync('FgCaptchaToken', token, failed)
  })
}`
  return {
    script,
    members: `
    // Spam check (Cloudflare Turnstile): the widget is run by a script
    // (FgCaptchaScript) that reports each token here; the submit button
    // waits for one, and each submission sends it once.
    private ElementReference fgCaptchaEl;
    private string fgCaptchaToken = "";
    private bool fgCaptchaFailed;

    private const string FgCaptchaScript = ${csVerbatim(script)};

    [Microsoft.JSInterop.JSInvokable]
    public void FgCaptchaToken(string token, bool failed)
    {
        fgCaptchaToken = token;
        fgCaptchaFailed = failed;
        StateHasChanged();
    }
`,
  }
}

const csVerbatim = (s: string): string => `@"${s.replace(/"/g, '""')}"`
