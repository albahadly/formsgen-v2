import { flushPromises, mount } from '@vue/test-utils'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import FormsGenForm from './components/FormsGenForm.vue'
import type { FormSchema } from './schema'

// jsdom has no canvas: a context that records what is drawn, and toBlob.
const drawn: string[] = []
beforeAll(() => {
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, key) => (key in target ? target[key as string] : (...args: unknown[]) => drawn.push(`${String(key)}(${args.join(',')})`)),
    set: (target, key, value) => ((target[key as string] = value), true),
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx as unknown as CanvasRenderingContext2D)
  HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback) {
    setTimeout(() => callback(new Blob(['\x89PNG drawn'], { type: 'image/png' })), 0)
  }
})
afterAll(() => vi.restoreAllMocks())

const schema = (props: Record<string, unknown> = {}): FormSchema => ({
  $schema: 'formsgen/v2',
  meta: { name: 'sign', locale: 'en', dir: 'ltr' },
  tree: [{ id: 's', type: 'signature', name: 'signature', props: { label: 'Signature', ...props }, validation: [{ rule: 'required' }] }],
})
const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 5))
  await flushPromises()
}

describe('signature field', () => {
  it('drawing makes signature.png the value; it is required like an upload', async () => {
    const wrapper = mount(FormsGenForm, { props: { schema: schema() } })
    const pad = wrapper.get('canvas')
    expect(pad.attributes('role')).toBe('img')
    expect(pad.attributes('aria-label')).toBe('Signature pad: draw your signature here')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('This field is required')
    drawn.length = 0
    const at = (type: string, x: number, y: number) => pad.element.dispatchEvent(new MouseEvent(type, { button: 0, clientX: x, clientY: y, bubbles: true }))
    at('pointerdown', 10, 10)
    at('pointermove', 40, 30)
    at('pointerup', 40, 30)
    await settle()
    expect(drawn.some((call) => call.startsWith('lineTo(40,30)'))).toBe(true)
    await wrapper.get('form').trigger('submit')
    const [data] = wrapper.emitted('submit')!.at(-1) as [Record<string, unknown>]
    const [file] = data['signature'] as File[]
    expect([file!.name, file!.type]).toEqual(['signature.png', 'image/png'])
    expect(wrapper.text()).not.toContain('This field is required')
  })

  it('a typed name draws in a handwriting font; Clear empties it', async () => {
    const wrapper = mount(FormsGenForm, { props: { schema: schema() } })
    drawn.length = 0
    await wrapper.get('[data-fg-sign-type]').setValue('Ana Lima')
    await settle()
    expect(drawn.some((call) => call.startsWith('fillText(Ana Lima,'))).toBe(true)
    expect(wrapper.emitted('update:modelValue')!.at(-1)![0]).toMatchObject({ signature: [expect.any(File)] })
    await wrapper.get('[data-fg-sign-clear]').trigger('click')
    await settle()
    expect((wrapper.get('[data-fg-sign-type]').element as HTMLInputElement).value).toBe('')
    expect(wrapper.emitted('update:modelValue')!.at(-1)![0]).toMatchObject({ signature: [] })
  })

  it('typing can be turned off; the pad height comes from props', () => {
    const wrapper = mount(FormsGenForm, { props: { schema: schema({ typing: false, height: 220 }) } })
    expect(wrapper.find('[data-fg-sign-type]').exists()).toBe(false)
    expect(wrapper.get('canvas').attributes('style')).toContain('height: 220px')
  })
})
