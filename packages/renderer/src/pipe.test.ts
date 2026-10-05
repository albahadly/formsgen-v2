import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FormsGenForm from './components/FormsGenForm.vue'
import { MESSAGES } from './messages'
import { answerText, pipeParts } from './pipe'
import type { ElementNode, FormSchema } from './schema'

const node = (id: string, type: string, name: string | undefined, props: Record<string, unknown> = {}, children?: ElementNode[]): ElementNode =>
  ({ id, type, ...(name ? { name } : {}), props, ...(children ? { children } : {}) }) as ElementNode

describe('answers inside text', () => {
  it('splits references and fallbacks', () => {
    expect(pipeParts('Hi {name|friend}, {a.b}! {not a ref} {}')).toEqual([
      { t: 'text', v: 'Hi ' },
      { t: 'ref', path: 'name', fallback: 'friend', raw: '{name|friend}' },
      { t: 'text', v: ', ' },
      { t: 'ref', path: 'a.b', fallback: '', raw: '{a.b}' },
      { t: 'text', v: '! {not a ref} {}' },
    ])
  })

  it('formats each kind of answer as text', () => {
    const m = MESSAGES.en
    const room = node('r', 'select', 'room', { items: [{ value: '90', label: 'Standard' }, { value: '140', label: 'Deluxe' }] })
    expect(answerText(room, '140', m, ', ')).toBe('Deluxe')
    expect(answerText({ ...room, type: 'checkboxgroup' }, ['90', '140'], m, '، ')).toBe('Standard، Deluxe')
    expect(answerText(node('c', 'checkbox', 'c'), true, m, ', ')).toBe('Yes')
    expect(answerText(node('c', 'toggle', 'c'), false, MESSAGES.ar, ', ')).toBe('لا')
    expect(answerText(node('d', 'daterange', 'd'), { from: '2026-01-01', to: '2026-01-05' }, m, ', ')).toBe('2026-01-01 – 2026-01-05')
    expect(answerText(node('d', 'daterange', 'd'), { from: '2026-01-01', to: '' }, m, ', ')).toBe('')
    expect(answerText(node('t', 'calculated', 't', { decimals: 2 }), 12, m, ', ')).toBe('12.00')
    expect(answerText(node('n', 'number', 'n'), 12.5, m, ', ')).toBe('12.5')
    expect(answerText(node('f', 'file', 'f'), [new File(['x'], 'cv.pdf')], m, ', ')).toBe('cv.pdf')
    expect(answerText(node('m', 'matrix', 'm'), { a: '1' }, m, ', ')).toBe('')
  })

  it('updates labels, descriptions, headings and formatted text as people answer', async () => {
    const schema = {
      $schema: 'formsgen/v2',
      meta: { name: 'p', locale: 'en', dir: 'ltr' },
      tree: [
        node('first', 'text', 'first_name', { label: 'First name' }),
        node('h', 'heading', undefined, { text: 'Welcome, {first_name|guest}!', level: 2 }),
        node('room', 'select', 'room', { label: 'Room', items: [{ value: '90', label: 'Standard' }] }),
        node('when', 'date', 'when', { label: 'When will {first_name|you} arrive?', description: 'Room: {room|not chosen}. {nope} stays.' }),
        node('md', 'paragraph', undefined, { format: 'markdown', text: '**{first_name|Guest}**, check *{room}* and {first_name}' }),
        node('people', 'repeater', 'people', { label: 'People', initialItems: 2 }, [
          node('pn', 'text', 'pname', { label: 'Name' }),
          node('pa', 'number', 'age', { label: 'How old is {people.pname|this person}?' }),
          node('pp', 'paragraph', undefined, { text: '{first_name} invited {people.pname|someone}.' }),
        ]),
        node('outside', 'paragraph', undefined, { text: 'Outside an item: {people.pname}' }),
      ],
    } as FormSchema
    const wrapper = mount(FormsGenForm, { props: { schema }, attachTo: document.body })
    expect(wrapper.get('h2').text()).toBe('Welcome, guest!')
    expect(wrapper.get('label[for="fg-when"]').text()).toBe('When will you arrive?')
    expect(wrapper.text()).toContain('Room: not chosen. {nope} stays.')
    await wrapper.get('#fg-first').setValue('Ana')
    await wrapper.get('#fg-room').setValue('90')
    await wrapper.get('#fg-pn-1').setValue('Bo')
    expect(wrapper.get('h2').text()).toBe('Welcome, Ana!')
    expect(wrapper.get('label[for="fg-when"]').text()).toBe('When will Ana arrive?')
    expect(wrapper.text()).toContain('Room: Standard.')
    expect(wrapper.get('.fg-rich-text').html()).toContain('<strong>Ana</strong>, check <em>Standard</em> and Ana')
    expect(wrapper.get('label[for="fg-pa-0"]').text()).toBe('How old is this person?')
    expect(wrapper.get('label[for="fg-pa-1"]').text()).toBe('How old is Bo?')
    expect(wrapper.text()).toContain('Ana invited Bo.')
    expect(wrapper.text()).toContain('Outside an item: {people.pname}')
    wrapper.unmount()
  })

  it('inserts answers as text, never as markup', async () => {
    const schema = {
      $schema: 'formsgen/v2',
      meta: { name: 'p', locale: 'en', dir: 'ltr' },
      tree: [node('n', 'text', 'name', { label: 'Name' }), node('h', 'paragraph', undefined, { format: 'markdown', text: 'Hi {name}' })],
    } as FormSchema
    const wrapper = mount(FormsGenForm, { props: { schema } })
    await wrapper.get('#fg-n').setValue('<b>x</b> **y**')
    expect(wrapper.get('.fg-rich-text').html()).toContain('Hi &lt;b&gt;x&lt;/b&gt; **y**')
    wrapper.unmount()
  })
})
