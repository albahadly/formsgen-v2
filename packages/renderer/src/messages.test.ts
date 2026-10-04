import { describe, expect, it } from 'vitest'
import { errorsAnnouncement, stepAnnouncement, submittedAnnouncement } from './announcements'
import {
  MESSAGES,
  defaultRuleMessage,
  fill,
  pluralCategory,
  pluralText,
  resolveMessages,
} from './messages'
import { evaluateRules } from './rules'

describe('resolveMessages', () => {
  it('picks Arabic for any ar locale and English otherwise', () => {
    expect(resolveMessages('ar')).toBe(MESSAGES.ar)
    expect(resolveMessages('ar-OM')).toBe(MESSAGES.ar)
    expect(resolveMessages('AR_sa')).toBe(MESSAGES.ar)
    expect(resolveMessages('en')).toBe(MESSAGES.en)
    expect(resolveMessages('fr-FR')).toBe(MESSAGES.en)
    expect(resolveMessages(undefined)).toBe(MESSAGES.en)
    expect(resolveMessages('')).toBe(MESSAGES.en)
  })

  it('both catalogs define every key', () => {
    const keys = (o: object): string[] => Object.keys(o).sort()
    expect(keys(MESSAGES.ar)).toEqual(keys(MESSAGES.en))
    expect(keys(MESSAGES.ar.rules)).toEqual(keys(MESSAGES.en.rules))
  })
})

describe('plural rules', () => {
  it('English: one / other', () => {
    expect([0, 1, 2, 5, 11].map((n) => pluralCategory('en', n))).toEqual([
      'other',
      'one',
      'other',
      'other',
      'other',
    ])
  })

  it('Arabic: one / two / few (3–10) / many (11–99) / other, by n % 100', () => {
    const table: [number, string][] = [
      [1, 'one'],
      [2, 'two'],
      [3, 'few'],
      [10, 'few'],
      [11, 'many'],
      [99, 'many'],
      [100, 'other'],
      [102, 'other'],
      [103, 'few'],
      [111, 'many'],
    ]
    for (const [n, category] of table) expect(pluralCategory('ar', n), String(n)).toBe(category)
  })

  it('Arabic error counts read naturally', () => {
    expect(errorsAnnouncement(1, 'ar')).toBe('خطأ واحد. يرجى تصحيح الحقول المحددة.')
    expect(errorsAnnouncement(2, 'ar')).toBe('خطآن. يرجى تصحيح الحقول المحددة.')
    expect(errorsAnnouncement(6, 'ar')).toBe('6 أخطاء. يرجى تصحيح الحقول المحددة.')
    expect(errorsAnnouncement(12, 'ar')).toBe('12 خطأً. يرجى تصحيح الحقول المحددة.')
    expect(errorsAnnouncement(100, 'ar')).toBe('100 خطأ. يرجى تصحيح الحقول المحددة.')
    expect(errorsAnnouncement(1)).toBe('1 error. Please fix the highlighted fields.')
    expect(errorsAnnouncement(6)).toBe('6 errors. Please fix the highlighted fields.')
  })

  it('pluralText falls back to "other" when a form is missing', () => {
    expect(pluralText(MESSAGES.en, { one: 'x', other: '{n} y' }, 2)).toBe('2 y')
  })
})

describe('templates and announcements', () => {
  it('fill replaces known placeholders and keeps unknown ones', () => {
    expect(fill('{a} and {b}', { a: 1 })).toBe('1 and {b}')
  })

  it('step and submit announcements per locale', () => {
    expect(stepAnnouncement(1, 3, 'الدفع', 'ar')).toBe('الخطوة 2 من 3: الدفع')
    expect(stepAnnouncement(1, 3, 'Payment')).toBe('Step 2 of 3: Payment')
    expect(submittedAnnouncement('ar')).toBe('تم إرسال النموذج.')
  })
})

describe('Arabic default rule messages', () => {
  const ar = MESSAGES.ar
  it('covers every rule', () => {
    expect(defaultRuleMessage({ rule: 'required' }, ar)).toBe('هذا الحقل مطلوب')
    expect(defaultRuleMessage({ rule: 'min', value: 2 }, ar)).toBe('الحد الأدنى 2')
    expect(defaultRuleMessage({ rule: 'max', value: 50 }, ar)).toBe('الحد الأقصى 50')
    expect(defaultRuleMessage({ rule: 'between', value: [3, 20] }, ar)).toBe('يجب أن يكون بين 3 و20')
    expect(defaultRuleMessage({ rule: 'email' }, ar)).toBe('يجب إدخال بريد إلكتروني صالح')
    expect(defaultRuleMessage({ rule: 'url' }, ar)).toBe('يجب إدخال رابط صالح')
    expect(defaultRuleMessage({ rule: 'regex', value: '^x$' }, ar)).toBe('الصيغة غير صحيحة')
    expect(defaultRuleMessage({ rule: 'same-as', value: 'password' }, ar)).toBe('يجب أن يطابق password')
  })

  it('evaluateRules uses the given catalog; custom messages still win', () => {
    expect(evaluateRules([{ rule: 'required' }], '', undefined, ar)[0]?.message).toBe('هذا الحقل مطلوب')
    expect(
      evaluateRules([{ rule: 'required', message: 'مطلوب!' }], '', undefined, ar)[0]?.message,
    ).toBe('مطلوب!')
    expect(evaluateRules([{ rule: 'required' }], '')[0]?.message).toBe('This field is required')
  })
})
