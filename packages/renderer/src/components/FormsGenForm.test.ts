import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import kitchenSink from '../../../../fixtures/kitchen-sink.formsgen.json'
import { parseFormSchema } from '../parse'
import type { FormSchema } from '../schema'
import FormsGenForm from './FormsGenForm.vue'

function fixtureSchema(): FormSchema {
  // Deep-clone: parseFormSchema returns the SAME object it was given, and
  // some tests mutate the schema — the shared JSON module must stay pristine.
  const result = parseFormSchema(JSON.parse(JSON.stringify(kitchenSink)))
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}

const mountForm = () => mount(FormsGenForm, { props: { schema: fixtureSchema() } })

async function fillValidForm(wrapper: ReturnType<typeof mountForm>) {
  await wrapper.get('input[name="full_name"]').setValue('Jane Doe')
  await wrapper.get('input[name="email"]').setValue('jane@example.com')
  await wrapper.get('input[name="username"]').setValue('jane')
  await wrapper.get('input[id$="-pro"]').setValue(true) // radio: plan = pro
  await wrapper.get('select[name="contact_method"]').setValue('email')
  await wrapper.get('input[name="shipping_city"]').setValue('Muscat') // step 1
  await wrapper.get('input[name="terms"]').setValue(true)
}

describe('FormsGenForm', () => {
  it('renders every visible pilot element with defaults applied', () => {
    const wrapper = mountForm()
    expect(wrapper.find('input[name="full_name"]').exists()).toBe(true)
    expect(wrapper.find('textarea[name="bio"]').exists()).toBe(true)
    expect(wrapper.find('select[name="contact_method"]').exists()).toBe(true)
    // props.default made newsletter start checked
    expect((wrapper.get('input[name="newsletter"]').element as HTMLInputElement).checked).toBe(
      true,
    )
    // named group renders as a fieldset with its label
    expect(wrapper.get('fieldset.fg-group legend').text()).toBe('Account')
  })

  it('hides and shows conditional fields reactively', async () => {
    const wrapper = mountForm()
    expect(wrapper.find('textarea[name="contact_other"]').exists()).toBe(false)
    await wrapper.get('select[name="contact_method"]').setValue('other')
    expect(wrapper.find('textarea[name="contact_other"]').exists()).toBe(true)
    await wrapper.get('select[name="contact_method"]').setValue('phone')
    expect(wrapper.find('textarea[name="contact_other"]').exists()).toBe(false)
  })

  it('shows an error after blur on a touched invalid field, then clears it', async () => {
    const wrapper = mountForm()
    const input = wrapper.get('input[name="full_name"]')
    expect(wrapper.find('.fg-error').exists()).toBe(false)
    await input.trigger('blur')
    expect(wrapper.get('.fg-error').text()).toBe('This field is required')
    await input.setValue('Jane')
    expect(wrapper.find('.fg-error').exists()).toBe(false)
  })

  it('blocks submit while invalid and surfaces all errors', async () => {
    const wrapper = mountForm()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.findAll('.fg-error').length).toBeGreaterThanOrEqual(4)
  })

  it('emits nested visible data on valid submit, excluding hidden fields', async () => {
    const wrapper = mountForm()
    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    const emitted = wrapper.emitted('submit')
    expect(emitted).toHaveLength(1)
    const payload = emitted![0]![0] as Record<string, unknown>
    expect(payload).toEqual({
      full_name: 'Jane Doe',
      email: 'jane@example.com',
      website: '',
      seats: null,
      satisfaction: 5,
      city: '',
      zip: '',
      account: { username: 'jane', password: '', bio: '', birthday: '' },
      plan: 'pro',
      interests: [],
      channels: [],
      topics: [],
      contact_method: 'email',
      twitter: '',
      github: '',
      shipping_city: 'Muscat',
      order_notes: '',
      newsletter: true,
      terms: true,
    })
    expect('contact_other' in payload).toBe(false)
    expect('contact_phone' in payload).toBe(false)
  })

  it('includes a conditional field in the payload once visible and filled', async () => {
    const wrapper = mountForm()
    await fillValidForm(wrapper)
    await wrapper.get('select[name="contact_method"]').setValue('other')
    await wrapper.get('textarea[name="contact_other"]').setValue('Carrier pigeon')
    await wrapper.get('form').trigger('submit')
    const payload = wrapper.emitted('submit')![0]![0] as Record<string, unknown>
    expect(payload['contact_other']).toBe('Carrier pigeon')
  })

  it('emits update:modelValue as data changes', async () => {
    const wrapper = mountForm()
    await wrapper.get('input[name="full_name"]').setValue('J')
    const updates = wrapper.emitted('update:modelValue')
    expect(updates).toBeDefined()
    const last = updates![updates!.length - 1]![0] as Record<string, unknown>
    expect(last['full_name']).toBe('J')
  })

  it('validates a required checkbox as must-be-true', async () => {
    const wrapper = mountForm()
    await fillValidForm(wrapper)
    await wrapper.get('input[name="terms"]').setValue(false)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('applies meta.theme tokens as CSS variables on the form root', () => {
    const schema = fixtureSchema()
    schema.meta.theme = { 'color-primary': '#ff0000', radius: '12px' }
    const wrapper = mount(FormsGenForm, { props: { schema } })
    const style = wrapper.get('form').attributes('style') ?? ''
    expect(style).toContain('--fg-color-primary: #ff0000')
    expect(style).toContain('--fg-radius: 12px')
  })

  it('binds the new field kinds: number, checkbox group, radio, range', async () => {
    const wrapper = mountForm()
    await fillValidForm(wrapper)
    await wrapper.get('input[name="seats"]').setValue('12')
    await wrapper.get('input[id$="-news"]').setValue(true)
    await wrapper.get('input[id$="-product"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    const payload = wrapper.emitted('submit')![0]![0] as Record<string, unknown>
    expect(payload['seats']).toBe(12)
    expect(payload['interests']).toEqual(['news', 'product'])
    expect(payload['plan']).toBe('pro')
    expect(payload['satisfaction']).toBe(5)
  })

  it('switches between two conditional fields on one driver', async () => {
    const wrapper = mountForm()
    expect(wrapper.find('input[name="contact_phone"]').exists()).toBe(false)
    await wrapper.get('select[name="contact_method"]').setValue('phone')
    expect(wrapper.find('input[name="contact_phone"]').exists()).toBe(true)
    expect(wrapper.find('textarea[name="contact_other"]').exists()).toBe(false)
    await wrapper.get('select[name="contact_method"]').setValue('other')
    expect(wrapper.find('input[name="contact_phone"]').exists()).toBe(false)
    expect(wrapper.find('textarea[name="contact_other"]').exists()).toBe(true)
  })

  it('renders static elements without touching the data', () => {
    const wrapper = mountForm()
    expect(wrapper.get('h2.fg-heading').text()).toBe('Kitchen Sink')
    expect(wrapper.find('p.fg-paragraph').exists()).toBe(true)
    expect(wrapper.find('hr.fg-divider').exists()).toBe(true)
  })

  it('tabs: only the active tab renders; clicking switches', async () => {
    const wrapper = mountForm()
    expect(wrapper.find('input[name="twitter"]').exists()).toBe(true)
    expect(wrapper.find('input[name="github"]').exists()).toBe(false)
    const codeTab = wrapper
      .findAll('.fg-tab-button')
      .find((b) => b.text().includes('Code'))!
    await codeTab.trigger('click')
    expect(wrapper.find('input[name="github"]').exists()).toBe(true)
    expect(wrapper.find('input[name="twitter"]').exists()).toBe(false)
  })

  it('steps: Next is blocked until the current step validates', async () => {
    const wrapper = mountForm()
    expect(wrapper.find('input[name="shipping_city"]').exists()).toBe(true)
    expect(wrapper.find('textarea[name="order_notes"]').exists()).toBe(false)
    const next = wrapper
      .findAll('.fg-step-actions button')
      .find((b) => b.text() === 'Next')!
    await next.trigger('click')
    // required shipping_city is empty -> stays on step 1 with an error
    expect(wrapper.find('textarea[name="order_notes"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('This field is required')
    await wrapper.get('input[name="shipping_city"]').setValue('Muscat')
    await next.trigger('click')
    expect(wrapper.find('textarea[name="order_notes"]').exists()).toBe(true)
    // Back returns to step 1 with the value intact
    const back = wrapper
      .findAll('.fg-step-actions button')
      .find((b) => b.text() === 'Back')!
    await back.trigger('click')
    expect(
      (wrapper.get('input[name="shipping_city"]').element as HTMLInputElement).value,
    ).toBe('Muscat')
  })

  it('tab headers show an error dot after a failed submit', async () => {
    const schema = fixtureSchema()
    // make the hidden tab's field required
    const tabs = schema.tree.find((n) => n.id === 'ks-social-tabs')!
    tabs.children![1]!.children![0]!.validation = [{ rule: 'required' }]
    const wrapper = mount(FormsGenForm, { props: { schema } })
    await wrapper.get('form').trigger('submit')
    const codeTab = wrapper
      .findAll('.fg-tab-button')
      .find((b) => b.text().includes('Code'))!
    expect(codeTab.classes()).toContain('fg-tab-button--error')
    expect(codeTab.find('.fg-tab-error-dot').exists()).toBe(true)
  })

  it('multiselect binds an array of selected options', async () => {
    const wrapper = mountForm()
    await fillValidForm(wrapper)
    await wrapper.get('select[name="channels"]').setValue(['email', 'push'])
    await wrapper.get('form').trigger('submit')
    const payload = wrapper.emitted('submit')![0]![0] as Record<string, unknown>
    expect(payload['channels']).toEqual(['email', 'push'])
  })

  it('jumps to the first errored section after a failed submit', async () => {
    const schema = fixtureSchema()
    const tabs = schema.tree.find((n) => n.id === 'ks-social-tabs')!
    tabs.children![1]!.children![0]!.validation = [{ rule: 'required' }]
    const wrapper = mount(FormsGenForm, { props: { schema } })
    // active tab is Social (clean); the required github field is in Code
    expect(wrapper.find('input[name="github"]').exists()).toBe(false)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.find('input[name="github"]').exists()).toBe(true)
  })

  it('merges a provided modelValue over defaults', () => {
    const wrapper = mount(FormsGenForm, {
      props: {
        schema: fixtureSchema(),
        modelValue: { full_name: 'Prefilled', account: { username: 'pre' } },
      },
    })
    expect((wrapper.get('input[name="full_name"]').element as HTMLInputElement).value).toBe(
      'Prefilled',
    )
    expect((wrapper.get('input[name="username"]').element as HTMLInputElement).value).toBe('pre')
  })
})
