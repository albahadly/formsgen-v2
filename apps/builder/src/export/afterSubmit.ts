// After submit (meta.afterSubmit) in the code targets: once the answers were
// sent, a thank-you block replaces the form — the root gets data-fg-sent and
// a one-line stylesheet hides every other child — with "Send another
// response" bringing the form back through the target's reset; or the page
// goes to another address (which wins when both are set). The message pipes
// answers like a paragraph does (answers.ts), after a successful send only:
// a 2xx from the submit URL, or validation passing when there is none.

import { afterSubmitOf, fieldsByPath, listSeparator, type FormSchema, type MessageCatalog } from '@formsgen/renderer'
import { esc } from '@/registry/emitters/shared'
import type { EmitterLang } from '@/registry/types'
import { pipeMarkup } from './answers'
import type { CssFrameworkAdapter } from './css/types'

export { afterSubmitOf }

/** Does the thank-you message show an answer ({full_name})? Then the answer helpers are needed. */
export function thanksPipes(schema: FormSchema): boolean {
  const { message } = afterSubmitOf(schema)
  return message !== null && /\{\s*[a-zA-Z]/.test(message)
}

/** The rule that hides everything but the thank-you once the root carries data-fg-sent. */
export const SENT_RULE = '[data-fg-sent] > :not([data-fg-thanks]) { display: none; }'

const vueSafe = (s: string): string => s.replace(/\{/g, '&#123;')
const jsxSafe = (s: string): string => s.replace(/[{}]/g, (b) => `{'${b}'}`)

/** The thank-you block for a language ('' without a message). */
export function thanksMarkup(
  lang: EmitterLang,
  schema: FormSchema,
  css: CssFrameworkAdapter,
  messages: MessageCatalog,
  accessor: (path: string) => string,
): string {
  const { message } = afterSubmitOf(schema)
  if (message === null) return ''
  const text = pipeMarkup(message, {
    lang,
    fields: fieldsByPath(schema.tree),
    parent: '',
    accessor,
    messages,
    separator: listSeparator(schema.meta.locale),
  })
  const cls = (slot: 'group' | 'paragraph' | 'buttonSecondary', attr: string): string => {
    const value = css.classes(slot)
    return value ? ` ${attr}="${value}"` : ''
  }
  const again = esc(messages.sendAnother)
  switch (lang) {
    case 'react':
      return `{fgSent && (
  <div${cls('group', 'className')} role="status" data-fg-thanks>
    <p${cls('paragraph', 'className')}>${text}</p>
    <button type="button"${cls('buttonSecondary', 'className')} data-fg-again onClick={fgSendAnother}>${jsxSafe(again)}</button>
  </div>
)}`
    case 'vue':
      return `<div v-if="fgSent"${cls('group', 'class')} role="status" data-fg-thanks>
  <p${cls('paragraph', 'class')}>${text}</p>
  <button type="button"${cls('buttonSecondary', 'class')} data-fg-again @click="fgSendAnother">${vueSafe(again)}</button>
</div>`
    case 'blazor':
      return `@if (fgSent)
{
    <div${cls('group', 'class')} role="status" data-fg-thanks>
        <p${cls('paragraph', 'class')}>${text}</p>
        <button type="button"${cls('buttonSecondary', 'class')} data-fg-again @onclick="FgSendAnother">${again.replace(/@/g, '&#64;')}</button>
    </div>
}`
    default:
      return `<div${cls('group', 'class')} role="status" data-fg-thanks hidden>
  <p${cls('paragraph', 'class')}>${text}</p>
  <button type="button"${cls('buttonSecondary', 'class')} data-fg-again>${again}</button>
</div>`
  }
}

/** Plain HTML: after a successful send, and the way back. */
export function htmlAfterSubmitRuntime(schema: FormSchema, messages: MessageCatalog): string {
  const { message, redirectUrl } = afterSubmitOf(schema)
  if (redirectUrl !== null) {
    return `// After a successful send the page goes on.
function fgAfterSubmit() {
  window.location.assign(${JSON.stringify(redirectUrl)})
}`
  }
  if (message === null) return ''
  return `// After a successful send the thank-you replaces the form (data-fg-sent
// hides the rest); "Send another response" resets and brings it back.
function fgAfterSubmit() {
  form.setAttribute('data-fg-sent', '')
  var thanks = form.querySelector('[data-fg-thanks]')
  thanks.hidden = false
  thanks.querySelector('[data-fg-again]').focus()
}
form.querySelector('[data-fg-again]').addEventListener('click', function () {
  form.removeAttribute('data-fg-sent')
  form.querySelector('[data-fg-thanks]').hidden = true
  fgResetForm()
  fgAnnounce(${JSON.stringify(messages.formReset)})
})`
}

/** React: the state and handlers inside the component. */
export function reactAfterSubmit(schema: FormSchema): { state: string; handlers: string } {
  const { message, redirectUrl } = afterSubmitOf(schema)
  if (redirectUrl !== null) {
    return {
      state: '',
      handlers: `  // After a successful send the page goes on.
  function fgAfterSubmit(): void {
    window.location.assign(${JSON.stringify(redirectUrl)})
  }`,
    }
  }
  if (message === null) return { state: '', handlers: '' }
  return {
    state: `  // After a successful send the thank-you replaces the form.
  const [fgSent, setFgSent] = useState(false)`,
    handlers: `  function fgAfterSubmit(): void {
    setFgSent(true)
  }
  // "Send another response": the form comes back, reset.
  function fgSendAnother(): void {
    setFgSent(false)
    fgReset()
  }`,
  }
}

/** Vue: the state and handlers in script setup. */
export function vueAfterSubmit(schema: FormSchema): string {
  const { message, redirectUrl } = afterSubmitOf(schema)
  if (redirectUrl !== null) {
    return `// After a successful send the page goes on.
function fgAfterSubmit(): void {
  window.location.assign(${JSON.stringify(redirectUrl)})
}`
  }
  if (message === null) return ''
  return `// After a successful send the thank-you replaces the form.
const fgSent = ref(false)
function fgAfterSubmit(): void {
  fgSent.value = true
}
// "Send another response": the form comes back, reset.
function fgSendAnother(): void {
  fgSent.value = false
  fgReset()
}`
}

/** Blazor: the field and methods in @code. */
export function blazorAfterSubmit(schema: FormSchema): string {
  const { message, redirectUrl } = afterSubmitOf(schema)
  if (redirectUrl !== null) {
    return `
    // After a successful send the page goes on.
    private void FgAfterSubmit() => FgNav.NavigateTo(${JSON.stringify(redirectUrl)}, forceLoad: true);
`
  }
  if (message === null) return ''
  return `
    // After a successful send the thank-you replaces the form.
    private bool fgSent;

    private void FgAfterSubmit() => fgSent = true;

    // "Send another response": the form comes back, reset.
    private async Task FgSendAnother()
    {
        fgSent = false;
        await FgReset();
    }
`
}
