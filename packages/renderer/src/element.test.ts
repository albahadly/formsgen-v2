import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { ELEMENT_TAG, defineFormsGenElement } from './element'

defineFormsGenElement()

const project = (meta: Record<string, unknown> = {}) => ({
  $schema: 'formsgen/v2',
  meta: { name: 'contact', title: 'Contact', locale: 'en', dir: 'ltr', ...meta },
  tree: [{ id: 'n', type: 'text', name: 'full_name', props: { label: 'Full name' }, validation: [{ rule: 'required' }] }],
})

type Host = HTMLElement & { schema: unknown; src: string }

async function mountElement(attributes: Record<string, string> = {}, properties: Record<string, unknown> = {}): Promise<Host> {
  const el = document.createElement(ELEMENT_TAG) as Host
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value)
  Object.assign(el, properties)
  document.body.append(el)
  await nextTick()
  await nextTick()
  return el
}

const settle = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
  await nextTick()
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('<formsgen-form>', () => {
  it('renders the form from the schema property and adds the stylesheet to the page once', async () => {
    const el = await mountElement({}, { schema: project() })
    expect(el.querySelector('form.fg-form')).not.toBeNull()
    expect(el.querySelector('input[type="text"]')).not.toBeNull()
    await mountElement({}, { schema: project() })
    // one <style> for any number of elements (its text is the built stylesheet; empty under vitest, which does not process CSS)
    expect(document.querySelectorAll('#formsgen-element-styles')).toHaveLength(1)
  })

  it('takes the schema attribute as JSON and reports a bad one', async () => {
    const good = await mountElement({ schema: JSON.stringify(project()) })
    expect(good.querySelector('form.fg-form')).not.toBeNull()
    const errors: unknown[] = []
    const bad = document.createElement(ELEMENT_TAG)
    bad.addEventListener('formsgen-error', (event) => errors.push((event as CustomEvent).detail))
    bad.setAttribute('schema', '{ nope')
    document.body.append(bad)
    await nextTick()
    expect(bad.querySelector('[role="alert"]')!.textContent).toContain('not JSON')
    expect(errors).toHaveLength(1)
  })

  it('loads the project from src, and says when it cannot', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.endsWith('ok.json') ? { ok: true, json: async () => project() } : { ok: false, status: 404, json: async () => ({}) })))
    const ready: unknown[] = []
    const el = document.createElement(ELEMENT_TAG)
    el.addEventListener('formsgen-ready', (event) => ready.push((event as CustomEvent).detail))
    el.setAttribute('src', '/forms/ok.json')
    document.body.append(el)
    await settle()
    expect(el.querySelector('form.fg-form')).not.toBeNull()
    expect(ready).toHaveLength(1)
    const missing = await mountElement({ src: '/forms/missing.json' })
    await settle()
    expect(missing.querySelector('[role="alert"]')!.textContent).toContain('Could not load /forms/missing.json (404)')
  })

  it('reports changes and submits; without a submit address the thank-you follows', async () => {
    const el = await mountElement({}, { schema: project({ afterSubmit: { message: 'Thanks, {full_name}!' } }) })
    const changes: unknown[] = []
    const submits: unknown[] = []
    el.addEventListener('formsgen-change', (event) => changes.push((event as CustomEvent).detail))
    el.addEventListener('formsgen-submit', (event) => submits.push((event as CustomEvent).detail))
    const input = el.querySelector('input[type="text"]') as HTMLInputElement
    input.value = 'Ada'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    expect(changes.at(-1)).toEqual({ full_name: 'Ada' })
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    await settle()
    expect(submits).toEqual([{ full_name: 'Ada' }])
    expect(el.querySelector('[data-fg-thanks]')!.textContent).toContain('Thanks, Ada!')
    ;(el.querySelector('[data-fg-again]') as HTMLButtonElement).click()
    await settle()
    expect(el.querySelector('[data-fg-thanks]')).toBeNull()
    expect((el.querySelector('input[type="text"]') as HTMLInputElement).value).toBe('')
  })

  it('a required field blocks the submit event; preventing formsgen-submit leaves the page in charge', async () => {
    const el = await mountElement({}, { schema: project({ afterSubmit: { message: 'Thanks!' } }) })
    const submits: unknown[] = []
    el.addEventListener('formsgen-submit', (event) => {
      submits.push((event as CustomEvent).detail)
      event.preventDefault()
    })
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    await settle()
    expect(submits).toHaveLength(0)
    expect(el.querySelector('.fg-error')).not.toBeNull()
    const input = el.querySelector('input[type="text"]') as HTMLInputElement
    input.value = 'Ada'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    await settle()
    expect(submits).toHaveLength(1)
    expect(el.querySelector('[data-fg-thanks]')).toBeNull()
  })

  it('pins the colour scheme with theme', async () => {
    const el = await mountElement({ theme: 'dark' }, { schema: project() })
    expect(el.querySelector('form.fg-form')!.getAttribute('data-fg-theme')).toBe('dark')
  })
})
