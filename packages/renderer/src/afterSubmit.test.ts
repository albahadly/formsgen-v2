import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { afterSubmitOf, isRedirectUrl } from './afterSubmit'
import FormsGenForm from './components/FormsGenForm.vue'
import { parseFormSchema } from './parse'
import type { FormSchema } from './schema'

const schema = (afterSubmit?: Record<string, unknown>): FormSchema => ({
  $schema: 'formsgen/v2',
  meta: { name: 'thanks_demo', locale: 'en', dir: 'ltr', ...(afterSubmit ? { afterSubmit } : {}) },
  tree: [{ id: 'n', type: 'text', name: 'full_name', props: { label: 'Full name' } }],
})

describe('meta.afterSubmit', () => {
  it('accepts a message and an http(s) or relative address, rejects the rest', () => {
    expect(parseFormSchema(schema({ message: 'Thanks!', redirectUrl: 'https://example.com/done' })).ok).toBe(true)
    expect(parseFormSchema(schema({ redirectUrl: '/done' })).ok).toBe(true)
    const bad = parseFormSchema(schema({ redirectUrl: 'mailto:a@b.c' }))
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.errors.join()).toContain('meta.afterSubmit.redirectUrl')
    expect(parseFormSchema(schema({ redirectUrl: 'javascript:alert(1)' })).ok).toBe(false)
    expect(parseFormSchema(schema({ message: 'x'.repeat(2001) })).ok).toBe(false)
    expect(parseFormSchema(schema({ message: 42 })).ok).toBe(false)
    expect(parseFormSchema(schema()).ok).toBe(true)
  })

  it('normalises blanks away', () => {
    expect(afterSubmitOf(schema({ message: '  ', redirectUrl: '' }))).toEqual({ message: null, redirectUrl: null })
    expect(afterSubmitOf(schema({ message: 'Thanks', redirectUrl: ' /done ' }))).toEqual({ message: 'Thanks', redirectUrl: '/done' })
    expect(isRedirectUrl('tel:123')).toBe(false)
    expect(isRedirectUrl('thanks.html')).toBe(true)
  })
})

describe('FormsGenForm after submit', () => {
  it('with sent, the thank-you (answers piped) replaces the form; "send another" resets and tells the host', async () => {
    const wrapper = mount(FormsGenForm, { props: { schema: schema({ message: 'Thanks, {full_name|friend}!' }), sent: false } })
    expect(wrapper.find('[data-fg-thanks]').exists()).toBe(false)
    expect(wrapper.find('.fg-grid').exists()).toBe(true)
    await wrapper.get('input[type="text"]').setValue('Ada')
    await wrapper.setProps({ sent: true })
    expect(wrapper.get('[data-fg-thanks]').text()).toContain('Thanks, Ada!')
    expect(wrapper.get('[data-fg-thanks]').attributes('role')).toBe('status')
    expect(wrapper.find('.fg-grid').exists()).toBe(false)
    await wrapper.get('[data-fg-again]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('again')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({ full_name: '' })
    await wrapper.setProps({ sent: false })
    expect(wrapper.find('.fg-grid').exists()).toBe(true)
  })

  it('without a message, sent changes nothing (the host redirects or shows its own result)', async () => {
    const wrapper = mount(FormsGenForm, { props: { schema: schema({ redirectUrl: '/done' }), sent: true } })
    expect(wrapper.find('[data-fg-thanks]').exists()).toBe(false)
    expect(wrapper.find('.fg-grid').exists()).toBe(true)
  })
})
