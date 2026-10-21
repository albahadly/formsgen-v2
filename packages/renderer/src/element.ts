// <formsgen-form>: the renderer as a custom element for any page. One
// script (this file built with Vue inside, dist/element/) and one tag:
//   <formsgen-form src="./form.formsgen.json"></formsgen-form>
// The project comes from `src` (fetched), the `schema` property (an
// object) or the `schema` attribute (JSON text). The form renders in the
// page itself (no shadow DOM) with its stylesheet added to the page once,
// so the host's CSS can reach the fg- classes and the map, spam-check and
// upload pieces work as in the other exports. The element sends the
// answers where meta.submit points (unless the page prevents
// formsgen-submit), tells the page what the server said, and honours the
// form's after-submit settings.

import { defineCustomElement, h, ref, useHost, watch, type PropType } from 'vue'
import { afterSubmitOf } from './afterSubmit'
import FormsGenForm from './components/FormsGenForm.vue'
import { hasUploadFields, sendSubmission, type UploadStatus } from './files'
import { parseFormSchema } from './parse'
import type { FormSchema } from './schema'
import styles from './styles.css?inline'

export const ELEMENT_TAG = 'formsgen-form'
const STYLE_ID = 'formsgen-element-styles'

/** The form's stylesheet, in the page once. */
function ensureStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = styles
  document.head.append(style)
}

export const FormsGenElement = defineCustomElement(
  {
    props: {
      /** The URL of the project file (.formsgen.json). */
      src: { type: String, default: '' },
      /** The project itself: an object (property) or its JSON text (attribute). */
      schema: { type: [Object, String] as PropType<Record<string, unknown> | string | null>, default: null },
      /** "light" or "dark" pins the colour scheme; else the form's own rule. */
      theme: { type: String, default: '' },
    },
    setup(props) {
      const host = useHost()
      const resolved = ref<FormSchema | null>(null)
      const error = ref<string | null>(null)
      const data = ref<Record<string, unknown>>({})
      const sent = ref(false)
      const upload = ref<UploadStatus | null>(null)
      ensureStyles()

      /** An event on the element, bubbling; false when the page prevented it. */
      const dispatch = (name: string, detail: unknown, cancelable = false): boolean =>
        host ? host.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true, cancelable })) : true

      function adopt(json: unknown): void {
        const result = parseFormSchema(json)
        if (result.ok) {
          resolved.value = result.schema
          error.value = null
          data.value = {}
          sent.value = false
          dispatch('formsgen-ready', result.schema)
        } else {
          resolved.value = null
          error.value = result.errors.join('\n')
          dispatch('formsgen-error', result.errors)
        }
      }

      let loading = 0
      async function load(): Promise<void> {
        const turn = ++loading
        if (props.schema !== null && props.schema !== '') {
          try {
            adopt(typeof props.schema === 'string' ? (JSON.parse(props.schema) as unknown) : props.schema)
          } catch {
            resolved.value = null
            error.value = 'The schema attribute is not JSON.'
            dispatch('formsgen-error', [error.value])
          }
          return
        }
        if (!props.src) {
          resolved.value = null
          error.value = null
          return
        }
        try {
          const response = await fetch(props.src)
          if (!response.ok) throw new Error(String(response.status))
          const json: unknown = await response.json()
          if (turn === loading) adopt(json)
        } catch (cause) {
          if (turn !== loading) return
          resolved.value = null
          error.value = `Could not load ${props.src}${cause instanceof Error && cause.message ? ` (${cause.message})` : ''}.`
          dispatch('formsgen-error', [error.value])
        }
      }
      watch(() => [props.src, props.schema] as const, () => void load(), { immediate: true })

      async function onSubmit(answers: Record<string, unknown>): Promise<void> {
        const schema = resolved.value
        if (!schema) return
        // event.preventDefault() on formsgen-submit: the page sends the answers itself.
        if (!dispatch('formsgen-submit', answers, true)) return
        const submit = schema.meta.submit
        if (submit?.url) {
          const multipart = hasUploadFields(schema.tree)
          if (multipart) upload.value = { state: 'uploading', progress: 0 }
          const result = await sendSubmission(submit.url, answers, {
            method: submit.method ?? 'POST',
            multipart,
            ...(submit.headers ? { headers: submit.headers } : {}),
            onProgress: (progress) => {
              if (multipart) upload.value = { state: 'uploading', progress }
            },
          })
          if (multipart) upload.value = result.ok ? { state: 'done', progress: 1 } : { state: 'failed', progress: 0 }
          dispatch('formsgen-sent', { ok: result.ok, status: result.status })
          if (!result.ok) return
        }
        const after = afterSubmitOf(schema)
        if (after.redirectUrl) window.location.assign(after.redirectUrl)
        else if (after.message) sent.value = true
      }

      return () => {
        if (error.value) return h('p', { class: 'fg-error', role: 'alert' }, error.value)
        if (!resolved.value) return null
        return h(FormsGenForm, {
          schema: resolved.value,
          modelValue: data.value,
          'onUpdate:modelValue': (value: Record<string, unknown>) => {
            data.value = value
            dispatch('formsgen-change', value)
          },
          sent: sent.value,
          upload: upload.value,
          'data-fg-theme': props.theme === 'light' || props.theme === 'dark' ? props.theme : undefined,
          onSubmit: (answers: Record<string, unknown>) => void onSubmit(answers),
          onAgain: () => {
            sent.value = false
          },
        })
      }
    },
  },
  { shadowRoot: false },
)

/** Registers the element once, under `formsgen-form` unless told otherwise. */
export function defineFormsGenElement(tag = ELEMENT_TAG): void {
  if (typeof customElements === 'undefined' || customElements.get(tag)) return
  customElements.define(tag, FormsGenElement)
}

defineFormsGenElement()
