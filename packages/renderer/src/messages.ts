// Built-in form texts per locale: default validation messages, fallback
// button/section labels and screen-reader announcements. Picked from
// `meta.locale` ("ar", "ar-OM", … → Arabic; anything else → English).
// Templates use {placeholders}; export targets turn the same templates into
// generated code, so every target speaks the same words as the renderer.

import type { Rule } from './schema'

export type PluralCategory = 'one' | 'two' | 'few' | 'many' | 'other'

/** Plural variants of one text; `{n}` is the count. */
export interface PluralForms {
  one: string
  two?: string
  few?: string
  many?: string
  other: string
}

export interface MessageCatalog {
  /** Plural rule family: CLDR "one/other" (en) or Arabic six-way. */
  plural: 'en' | 'ar'
  rules: {
    required: string
    /** {value} */
    min: string
    /** {value} */
    max: string
    /** {min} {max} */
    between: string
    email: string
    url: string
    regex: string
    /** {value} — the other field's name */
    sameAs: string
  }
  submit: string
  back: string
  next: string
  /** {n} — fallback label of an unnamed tab */
  tab: string
  /** {n} — fallback label of an unnamed step */
  step: string
  /** {tag} — aria-label of a chip's remove button */
  removeTag: string
  /** {n} */
  errors: PluralForms
  submitted: string
  /** Announced after a reset button restores the initial values. */
  formReset: string
  /** Visually hidden suffix on links that open a new tab. */
  opensInNewTab: string
  /** {index} {total} {label} — index is 1-based */
  stepProgress: string
  /** {n} — fallback label of a repeater item */
  item: string
  /** Default text of a repeater's add button. */
  addItem: string
  /** Visible text of an item's remove button. */
  removeItem: string
  /** {label} — accessible name of an item's remove button */
  removeItemLabel: string
  /** {label} — announced after an item is added */
  itemAdded: string
  /** {label} — announced after an item is removed */
  itemRemoved: string
  /** {label} — accessible name of an item's move-up button */
  moveItemUp: string
  /** {label} — accessible name of an item's move-down button */
  moveItemDown: string
  /** {label} {n} — announced after an item moved (n = its new position) */
  itemMoved: string
  /** {name} {size} — a chosen file over the size limit (MB) */
  fileTooLarge: string
  /** {name} — a chosen file of a type the field doesn't accept */
  fileType: string
  /** {n} — more files than the field allows */
  tooManyFiles: string
  /** {name} — accessible name of a chosen file's remove button */
  removeFile: string
  /** An answer to a yes/no field, inserted into text ({field}). */
  yes: string
  no: string
  /** Text inside an upload's drop zone (one file / several files). */
  dropFile: string
  dropFiles: string
  /** Accessible name of the upload progress bar. */
  uploadProgress: string
  /** {n} — visible text while files upload (n = percent sent) */
  uploading: string
  /** Announced when a submission with files starts uploading. */
  uploadStarted: string
  /** Shown once the upload finished and the server accepted it. */
  uploadDone: string
  /** Shown and announced when the upload failed. */
  uploadFailed: string
  /** Accessible names of a range slider's two handles. */
  rangeFrom: string
  rangeTo: string
  /** Accessible names of a date range's two inputs. */
  dateFrom: string
  dateTo: string
  /** A date range whose end is before its start. */
  dateOrder: string
  /** Text of the multiple-dates field's add button. */
  addDate: string
  /** {date} — accessible name of a chosen date's remove button */
  removeDate: string
  /** Accessible name of a phone field's country-code select. */
  countryCode: string
  /** Accessible name of a field's help-tooltip button. */
  moreInfo: string
  /** Save and continue later: the note while answers are kept on the device. */
  draftOn: string
  /** …after saved answers were restored. */
  draftRestored: string
  /** Added when the form has upload fields. */
  draftNoFiles: string
  /** The button that forgets the saved answers and starts over. */
  draftClear: string
  /** Announced after clearing. */
  draftCleared: string
}

const en: MessageCatalog = {
  plural: 'en',
  rules: {
    required: 'This field is required',
    min: 'Must be at least {value}',
    max: 'Must be at most {value}',
    between: 'Must be between {min} and {max}',
    email: 'Must be a valid email address',
    url: 'Must be a valid URL',
    regex: 'Invalid format',
    sameAs: 'Must match {value}',
  },
  submit: 'Submit',
  back: 'Back',
  next: 'Next',
  tab: 'Tab {n}',
  step: 'Step {n}',
  removeTag: 'Remove {tag}',
  errors: {
    one: '1 error. Please fix the highlighted fields.',
    other: '{n} errors. Please fix the highlighted fields.',
  },
  submitted: 'Form submitted.',
  formReset: 'The form was reset.',
  opensInNewTab: '(opens in a new tab)',
  stepProgress: 'Step {index} of {total}: {label}',
  item: 'Item {n}',
  addItem: 'Add item',
  removeItem: 'Remove',
  removeItemLabel: 'Remove {label}',
  itemAdded: '{label} added',
  itemRemoved: '{label} removed',
  moveItemUp: 'Move {label} up',
  moveItemDown: 'Move {label} down',
  itemMoved: '{label} moved to position {n}',
  fileTooLarge: '{name} is larger than {size} MB',
  fileType: '{name} is not an accepted file type',
  tooManyFiles: 'Choose at most {n} files',
  removeFile: 'Remove {name}',
  yes: 'Yes',
  no: 'No',
  dropFile: 'Choose a file or drag it here',
  dropFiles: 'Choose files or drag them here',
  uploadProgress: 'Upload progress',
  uploading: 'Uploading… {n}%',
  uploadStarted: 'Uploading files…',
  uploadDone: 'Upload complete.',
  uploadFailed: 'Upload failed. Please try again.',
  rangeFrom: 'Minimum',
  rangeTo: 'Maximum',
  dateFrom: 'Start date',
  dateTo: 'End date',
  dateOrder: 'The end date can’t be before the start date',
  addDate: 'Add date',
  removeDate: 'Remove {date}',
  countryCode: 'Country code',
  moreInfo: 'More information',
  draftOn: 'Your answers are saved on this device until you send the form.',
  draftRestored: 'Welcome back! Your saved answers were restored.',
  draftNoFiles: 'Files aren’t saved; choose them again before sending.',
  draftClear: 'Clear saved answers',
  draftCleared: 'Saved answers cleared.',
}

const ar: MessageCatalog = {
  plural: 'ar',
  rules: {
    required: 'هذا الحقل مطلوب',
    min: 'الحد الأدنى {value}',
    max: 'الحد الأقصى {value}',
    between: 'يجب أن يكون بين {min} و{max}',
    email: 'يجب إدخال بريد إلكتروني صالح',
    url: 'يجب إدخال رابط صالح',
    regex: 'الصيغة غير صحيحة',
    sameAs: 'يجب أن يطابق {value}',
  },
  submit: 'إرسال',
  back: 'السابق',
  next: 'التالي',
  tab: 'تبويب {n}',
  step: 'الخطوة {n}',
  removeTag: 'إزالة {tag}',
  errors: {
    one: 'خطأ واحد. يرجى تصحيح الحقول المحددة.',
    two: 'خطآن. يرجى تصحيح الحقول المحددة.',
    few: '{n} أخطاء. يرجى تصحيح الحقول المحددة.',
    many: '{n} خطأً. يرجى تصحيح الحقول المحددة.',
    other: '{n} خطأ. يرجى تصحيح الحقول المحددة.',
  },
  submitted: 'تم إرسال النموذج.',
  formReset: 'تمت إعادة تعيين النموذج.',
  opensInNewTab: '(يُفتح في علامة تبويب جديدة)',
  stepProgress: 'الخطوة {index} من {total}: {label}',
  item: 'العنصر {n}',
  addItem: 'إضافة عنصر',
  removeItem: 'إزالة',
  removeItemLabel: 'إزالة {label}',
  itemAdded: 'تمت إضافة {label}',
  itemRemoved: 'تمت إزالة {label}',
  moveItemUp: 'نقل {label} إلى الأعلى',
  moveItemDown: 'نقل {label} إلى الأسفل',
  itemMoved: 'نُقل {label} إلى الموضع {n}',
  fileTooLarge: 'حجم {name} أكبر من {size} ميغابايت',
  fileType: '{name} ليس من أنواع الملفات المقبولة',
  tooManyFiles: 'اختر {n} ملفات على الأكثر',
  removeFile: 'إزالة {name}',
  yes: 'نعم',
  no: 'لا',
  dropFile: 'اختر ملفًا أو اسحبه إلى هنا',
  dropFiles: 'اختر ملفات أو اسحبها إلى هنا',
  uploadProgress: 'تقدّم الرفع',
  uploading: 'جارٍ الرفع… {n}%',
  uploadStarted: 'جارٍ رفع الملفات…',
  uploadDone: 'اكتمل الرفع.',
  uploadFailed: 'تعذّر الرفع. حاول مرة أخرى.',
  rangeFrom: 'الحد الأدنى',
  rangeTo: 'الحد الأقصى',
  dateFrom: 'تاريخ البداية',
  dateTo: 'تاريخ النهاية',
  dateOrder: 'لا يمكن أن يكون تاريخ النهاية قبل تاريخ البداية',
  addDate: 'إضافة تاريخ',
  removeDate: 'إزالة {date}',
  countryCode: 'رمز الدولة',
  moreInfo: 'مزيد من المعلومات',
  draftOn: 'تُحفَظ إجاباتك على هذا الجهاز حتى ترسل النموذج.',
  draftRestored: 'مرحبًا بعودتك! تمت استعادة إجاباتك المحفوظة.',
  draftNoFiles: 'لا تُحفَظ الملفات؛ اخترها مرة أخرى قبل الإرسال.',
  draftClear: 'مسح الإجابات المحفوظة',
  draftCleared: 'تم مسح الإجابات المحفوظة.',
}

export const MESSAGES: Readonly<Record<'en' | 'ar', MessageCatalog>> = { en, ar }

export function resolveMessages(locale: string | undefined): MessageCatalog {
  const language = (locale ?? '').toLowerCase().split(/[-_]/)[0]
  return language === 'ar' ? ar : en
}

/** Replace `{name}` placeholders. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

/** CLDR plural category (en: one/other; ar: one/two/few/many/other). */
export function pluralCategory(plural: MessageCatalog['plural'], n: number): PluralCategory {
  if (n === 1) return 'one'
  if (plural === 'en') return 'other'
  if (n === 2) return 'two'
  const mod = n % 100
  if (mod >= 3 && mod <= 10) return 'few'
  if (mod >= 11) return 'many'
  return 'other'
}

export function pluralText(messages: MessageCatalog, forms: PluralForms, n: number): string {
  const category = pluralCategory(messages.plural, n)
  return fill(forms[category] ?? forms.other, { n })
}

/** Default (non-custom) message for a rule. */
export function defaultRuleMessage(rule: Rule, messages: MessageCatalog = en): string {
  const t = messages.rules
  switch (rule.rule) {
    case 'required':
      return t.required
    case 'min':
      return fill(t.min, { value: String(rule.value) })
    case 'max':
      return fill(t.max, { value: String(rule.value) })
    case 'between': {
      const [lo, hi] = Array.isArray(rule.value) ? rule.value : [undefined, undefined]
      return fill(t.between, { min: String(lo), max: String(hi) })
    }
    case 'email':
      return t.email
    case 'url':
      return t.url
    case 'regex':
      return t.regex
    case 'same-as':
      return fill(t.sameAs, { value: String(rule.value) })
  }
}
