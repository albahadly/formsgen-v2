import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import FormsGenForm from './components/FormsGenForm.vue'
import { CAPTCHA_FIELD, captchaSiteKey } from './captcha'
import { MESSAGES } from './messages'
import { parseFormSchema } from './parse'
import type { FormSchema } from './schema'

const KEY = '1x00000000000000000000AA'
const schema: FormSchema = {
  $schema: 'formsgen/v2',
  meta: { name: 'spam', locale: 'en', dir: 'ltr', captcha: { provider: 'turnstile', siteKey: KEY } },
  tree: [{ id: 'n', type: 'text', name: 'name', props: { label: 'Name' }, validation: [{ rule: 'required' }] }],
}

// A stand-in for window.turnstile: records calls, hands out tokens on demand.
function fakeTurnstile() {
  const calls: string[] = []
  let options: Record<string, (token?: string) => void> = {}
  const api = {
    render: (_el: HTMLElement, o: Record<string, unknown>) => {
      options = o as typeof options
      calls.push(`render(${String(o['sitekey'])},${String(o['language'])})`)
      return 'w1'
    },
    reset: (id: string) => calls.push(`reset(${id})`),
    remove: (id: string) => calls.push(`remove(${id})`),
  }
  return { api, calls, pass: (token: string) => options['callback']!(token), expire: () => options['expired-callback']!(), fail: () => options['error-callback']!() }
}

describe('spam check (meta.captcha)', () => {
  afterEach(() => {
    delete (window as { turnstile?: unknown }).turnstile
  })

  it('parses: Turnstile with a site key only', () => {
    const base = { $schema: 'formsgen/v2', tree: [] }
    expect(parseFormSchema({ ...base, meta: { ...schema.meta } }).ok).toBe(true)
    const bad = parseFormSchema({ ...base, meta: { ...schema.meta, captcha: { provider: 'recaptcha', siteKey: KEY } } })
    expect(bad.ok ? [] : bad.errors).toEqual(['meta.captcha: expected { provider: "turnstile", siteKey }'])
    const key = parseFormSchema({ ...base, meta: { ...schema.meta, captcha: { provider: 'turnstile', siteKey: '<script>' } } })
    expect(key.ok).toBe(false)
    expect(captchaSiteKey(schema.meta)).toBe(KEY)
    expect(captchaSiteKey({})).toBeNull()
  })

  it('the submit button waits for the check; the token goes with the answers, once', async () => {
    const fake = fakeTurnstile()
    ;(window as { turnstile?: unknown }).turnstile = fake.api
    const wrapper = mount(FormsGenForm, { props: { schema } })
    await flushPromises()
    expect(fake.calls).toEqual([`render(${KEY},en)`])
    const button = () => wrapper.get('button[type=submit]')
    expect(button().attributes('disabled')).toBeDefined()
    expect(button().attributes('aria-describedby')).toBe('fg-spam-captcha')
    expect(wrapper.get('#fg-spam-captcha').text()).toBe(MESSAGES.en.captchaWait)

    fake.pass('token-1')
    await flushPromises()
    expect(button().attributes('disabled')).toBeUndefined()
    expect(wrapper.find('#fg-spam-captcha').exists()).toBe(false)

    // Invalid answers: nothing sent, the token is kept.
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(button().attributes('disabled')).toBeUndefined()

    await wrapper.get('input').setValue('Ana')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')![0]![0]).toEqual({ name: 'Ana', [CAPTCHA_FIELD]: 'token-1' })
    expect(fake.calls).toContain('reset(w1)')
    expect(button().attributes('disabled')).toBeDefined()

    fake.pass('token-2')
    fake.expire()
    await flushPromises()
    expect(button().attributes('disabled')).toBeDefined()
    fake.fail()
    await flushPromises()
    expect(wrapper.text()).toContain(MESSAGES.en.captchaFailed)
    wrapper.unmount()
    expect(fake.calls).toContain('remove(w1)')
  })

  it('without meta.captcha nothing changes', async () => {
    const plain: FormSchema = { ...schema, meta: { name: 'spam', locale: 'en', dir: 'ltr' } }
    const wrapper = mount(FormsGenForm, { props: { schema: plain } })
    expect(wrapper.find('[data-fg-captcha]').exists()).toBe(false)
    expect(wrapper.get('button[type=submit]').attributes('disabled')).toBeUndefined()
    await wrapper.get('input').setValue('Ana')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')![0]![0]).toEqual({ name: 'Ana' })
  })
})
