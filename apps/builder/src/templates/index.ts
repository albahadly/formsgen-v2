// Starter templates: ready-made forms in English and Arabic. Each is a
// plain schema (validated by the template tests), loaded like an opened
// project. Ids are prefixed per template; loading replaces the form.

import { SCHEMA_ID, type ElementNode, type FormSchema } from '@formsgen/renderer'

export type TemplateLocale = 'en' | 'ar'

export interface FormTemplate {
  id: 'contact' | 'registration' | 'feedback'
  title: string
  description: string
  schema: FormSchema
}

type Text = { en: string; ar: string }
const tx = (en: string, ar: string): Text => ({ en, ar })

function meta(name: string, title: Text, lang: TemplateLocale, submitText: Text): FormSchema['meta'] {
  return {
    name,
    title: title[lang],
    locale: lang,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    submitButton: { text: submitText[lang] },
  }
}

function contact(lang: TemplateLocale): FormSchema {
  const L = (t: Text): string => t[lang]
  const tree: ElementNode[] = [
    { id: 'tpl-contact-heading', type: 'heading', props: { text: L(tx('Get in touch', 'تواصل معنا')), level: 2 } },
    {
      id: 'tpl-contact-intro',
      type: 'paragraph',
      props: { text: L(tx('We usually reply within one working day.', 'نرد عادةً خلال يوم عمل واحد.')) },
    },
    {
      id: 'tpl-contact-name',
      type: 'text',
      name: 'full_name',
      props: { label: L(tx('Full name', 'الاسم الكامل')) },
      validation: [{ rule: 'required' }],
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-contact-email',
      type: 'email',
      name: 'email',
      props: { label: L(tx('Email', 'البريد الإلكتروني')) },
      validation: [{ rule: 'required' }, { rule: 'email' }],
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-contact-phone',
      type: 'phone',
      name: 'phone',
      props: {
        label: L(tx('Phone (optional)', 'الهاتف (اختياري)')),
        countrySelect: true,
        defaultCountry: lang === 'ar' ? 'OM' : 'US',
      },
    },
    {
      id: 'tpl-contact-topic',
      type: 'select',
      name: 'topic',
      props: {
        label: L(tx('Topic', 'الموضوع')),
        placeholder: L(tx('Choose a topic', 'اختر موضوعًا')),
        items: [
          { value: 'general', label: L(tx('General question', 'سؤال عام')) },
          { value: 'support', label: L(tx('Support', 'الدعم الفني')) },
          { value: 'sales', label: L(tx('Sales', 'المبيعات')) },
        ],
      },
      validation: [{ rule: 'required' }],
    },
    {
      id: 'tpl-contact-message',
      type: 'textarea',
      name: 'message',
      props: { label: L(tx('Message', 'الرسالة')), rows: 5 },
      validation: [{ rule: 'required' }, { rule: 'min', value: 10 }],
    },
    {
      id: 'tpl-contact-consent',
      type: 'checkbox',
      name: 'consent',
      props: {
        label: L(tx('You may contact me about my request', 'أوافق على التواصل معي بخصوص طلبي')),
        tooltip: L(tx('We only use your details to answer you.', 'نستخدم بياناتك للرد عليك فقط.')),
      },
      validation: [{ rule: 'required' }],
    },
  ]
  return { $schema: SCHEMA_ID, meta: meta('contact_form', tx('Contact us', 'اتصل بنا'), lang, tx('Send message', 'إرسال الرسالة')), tree }
}

function registration(lang: TemplateLocale): FormSchema {
  const L = (t: Text): string => t[lang]
  const tree: ElementNode[] = [
    {
      id: 'tpl-reg-steps',
      type: 'steps',
      props: {},
      children: [
        {
          id: 'tpl-reg-step-account',
          type: 'step',
          props: { label: L(tx('Account', 'الحساب')) },
          children: [
            {
              id: 'tpl-reg-username',
              type: 'text',
              name: 'username',
              props: { label: L(tx('Username', 'اسم المستخدم')), prefix: '@' },
              validation: [{ rule: 'required' }, { rule: 'min', value: 3 }],
            },
            {
              id: 'tpl-reg-email',
              type: 'email',
              name: 'email',
              props: { label: L(tx('Email', 'البريد الإلكتروني')) },
              validation: [{ rule: 'required' }, { rule: 'email' }],
            },
            {
              id: 'tpl-reg-password',
              type: 'password',
              name: 'password',
              props: {
                label: L(tx('Password', 'كلمة المرور')),
                tooltip: L(tx('At least 8 characters.', '8 أحرف على الأقل.')),
              },
              validation: [{ rule: 'required' }, { rule: 'min', value: 8 }],
              layout: { colSpan: 6 },
            },
            {
              id: 'tpl-reg-confirm',
              type: 'password',
              name: 'confirm_password',
              props: { label: L(tx('Confirm password', 'تأكيد كلمة المرور')) },
              validation: [
                { rule: 'required' },
                { rule: 'same-as', value: 'password', message: L(tx('Passwords must match', 'كلمتا المرور غير متطابقتين')) },
              ],
              layout: { colSpan: 6 },
            },
          ],
        },
        {
          id: 'tpl-reg-step-profile',
          type: 'step',
          props: { label: L(tx('Profile', 'الملف الشخصي')) },
          children: [
            {
              id: 'tpl-reg-name',
              type: 'text',
              name: 'full_name',
              props: { label: L(tx('Full name', 'الاسم الكامل')) },
              validation: [{ rule: 'required' }],
            },
            { id: 'tpl-reg-birthday', type: 'date', name: 'birthday', props: { label: L(tx('Birthday', 'تاريخ الميلاد')) } },
            {
              id: 'tpl-reg-plan',
              type: 'radiogroup',
              name: 'plan',
              props: {
                label: L(tx('Plan', 'الباقة')),
                display: 'blocks',
                tooltip: L(tx('You can switch plans at any time.', 'يمكنك تغيير الباقة في أي وقت.')),
                items: [
                  { value: 'free', label: L(tx('Free', 'مجانية')) },
                  { value: 'pro', label: L(tx('Pro', 'احترافية')) },
                ],
              },
              validation: [{ rule: 'required' }],
            },
          ],
        },
        {
          id: 'tpl-reg-step-confirm',
          type: 'step',
          props: { label: L(tx('Confirm', 'التأكيد')) },
          children: [
            {
              id: 'tpl-reg-newsletter',
              type: 'toggle',
              name: 'newsletter',
              props: { label: L(tx('Send me the monthly newsletter', 'أرسل لي النشرة الشهرية')) },
            },
            {
              id: 'tpl-reg-terms',
              type: 'checkbox',
              name: 'terms',
              props: { label: L(tx('I accept the terms of service', 'أوافق على شروط الخدمة')) },
              validation: [{ rule: 'required' }],
            },
          ],
        },
      ],
    },
  ]
  return {
    $schema: SCHEMA_ID,
    meta: meta('registration_form', tx('Create your account', 'إنشاء حساب'), lang, tx('Create account', 'إنشاء الحساب')),
    tree,
  }
}

function feedback(lang: TemplateLocale): FormSchema {
  const L = (t: Text): string => t[lang]
  const tree: ElementNode[] = [
    { id: 'tpl-fb-heading', type: 'heading', props: { text: L(tx('Tell us how we did', 'أخبرنا عن تجربتك')), level: 2 } },
    {
      id: 'tpl-fb-rating',
      type: 'matrix',
      name: 'rating',
      props: {
        label: L(tx('Rate your experience', 'قيّم تجربتك')),
        rows: [
          { value: 'speed', label: L(tx('Speed', 'السرعة')) },
          { value: 'quality', label: L(tx('Quality', 'الجودة')) },
          { value: 'support', label: L(tx('Support', 'الدعم')) },
        ],
        columns: [
          { value: '1', label: L(tx('Poor', 'ضعيف')) },
          { value: '2', label: L(tx('Fair', 'مقبول')) },
          { value: '3', label: L(tx('Good', 'جيد')) },
          { value: '4', label: L(tx('Excellent', 'ممتاز')) },
        ],
      },
      validation: [{ rule: 'required' }],
    },
    {
      id: 'tpl-fb-recommend',
      type: 'range',
      name: 'recommend',
      props: {
        label: L(tx('How likely are you to recommend us? (0–10)', 'ما مدى احتمال أن توصي بنا؟ (0–10)')),
        min: 0,
        max: 10,
        step: 1,
        default: 8,
      },
    },
    {
      id: 'tpl-fb-used',
      type: 'checkboxgroup',
      name: 'used',
      props: {
        label: L(tx('What did you use?', 'ما الذي استخدمته؟')),
        display: 'buttons',
        items: [
          { value: 'web', label: L(tx('Website', 'الموقع')) },
          { value: 'app', label: L(tx('Mobile app', 'تطبيق الجوال')) },
          { value: 'store', label: L(tx('Store', 'المتجر')) },
        ],
      },
    },
    {
      id: 'tpl-fb-comments',
      type: 'textarea',
      name: 'comments',
      props: { label: L(tx('Anything else?', 'هل لديك ملاحظات أخرى؟')), rows: 4 },
    },
    {
      id: 'tpl-fb-contact',
      type: 'toggle',
      name: 'may_contact',
      props: { label: L(tx('You may contact me about my feedback', 'يمكنكم التواصل معي بخصوص ملاحظاتي')) },
    },
    {
      id: 'tpl-fb-email',
      type: 'email',
      name: 'email',
      props: { label: L(tx('Email', 'البريد الإلكتروني')) },
      validation: [{ rule: 'required' }, { rule: 'email' }],
      conditions: [[{ field: 'may_contact', operator: 'equals', value: true }]],
    },
  ]
  return { $schema: SCHEMA_ID, meta: meta('feedback_form', tx('Feedback', 'استبيان رأي'), lang, tx('Send feedback', 'إرسال الرأي')), tree }
}

/** The starter templates, written in `lang`. */
export function listTemplates(lang: TemplateLocale): FormTemplate[] {
  const pick = (t: Text): string => t[lang]
  return [
    {
      id: 'contact',
      title: pick(tx('Contact form', 'نموذج تواصل')),
      description: pick(tx('Name, email, phone, topic and message.', 'الاسم والبريد والهاتف والموضوع والرسالة.')),
      schema: contact(lang),
    },
    {
      id: 'registration',
      title: pick(tx('Registration', 'تسجيل حساب')),
      description: pick(tx('A three-step sign-up wizard with password check.', 'معالج تسجيل من ثلاث خطوات مع تأكيد كلمة المرور.')),
      schema: registration(lang),
    },
    {
      id: 'feedback',
      title: pick(tx('Feedback survey', 'استبيان رأي')),
      description: pick(tx('Ratings matrix, recommendation score and comments.', 'مصفوفة تقييم ومقياس توصية وملاحظات.')),
      schema: feedback(lang),
    },
  ]
}
