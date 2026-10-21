// Starter templates: ready-made forms in English and Arabic. Each is a
// plain schema (validated by the template tests), loaded like an opened
// project. Ids are prefixed per template; loading replaces the form.
// Together they use every element type (the tests check this), so they
// double as examples of how each element looks.

import { SCHEMA_ID, type ElementNode, type FormSchema } from '@albahadly/formsgen-renderer'

import { appointment, order, quote, rsvp } from './more'
import { meta, tx, type TemplateLocale, type Text } from './shared'

export { templateLocale, type TemplateLocale } from './shared'

export interface FormTemplate {
  id: 'contact' | 'registration' | 'feedback' | 'job' | 'booking' | 'trip' | 'settings' | 'rsvp' | 'order' | 'appointment' | 'quote'
  title: string
  description: string
  schema: FormSchema
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
              id: 'tpl-reg-hello',
              type: 'paragraph',
              props: {
                text: L(
                  tx(
                    'Almost done, {full_name|friend}! We will send a confirmation to {email|your email}.',
                    'أوشكت على الانتهاء يا {full_name|صديقي}! سنرسل تأكيدًا إلى {email|بريدك الإلكتروني}.',
                  ),
                ),
              },
            },
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
      id: 'tpl-fb-channels',
      type: 'matrix',
      name: 'channels',
      props: {
        label: L(tx('How did you reach us for each step?', 'كيف تواصلت معنا في كل مرحلة؟')),
        description: L(tx('Tick all that apply.', 'اختر كل ما ينطبق.')),
        multiple: true,
        rows: [
          { value: 'order', label: L(tx('Ordering', 'الطلب')) },
          { value: 'delivery', label: L(tx('Delivery', 'التوصيل')) },
          { value: 'returns', label: L(tx('Returns', 'الإرجاع')) },
        ],
        columns: [
          { value: 'web', label: L(tx('Website', 'الموقع')) },
          { value: 'app', label: L(tx('App', 'التطبيق')) },
          { value: 'phone', label: L(tx('Phone', 'الهاتف')) },
        ],
      },
    },
    {
      id: 'tpl-fb-stars',
      type: 'rating',
      name: 'overall',
      props: { label: L(tx('Overall, how was it?', 'بشكل عام، كيف كانت التجربة؟')), max: 5 },
      validation: [{ rule: 'required' }],
    },
    {
      id: 'tpl-fb-recommend',
      type: 'nps',
      name: 'recommend',
      props: {
        label: L(tx('How likely are you to recommend us?', 'ما مدى احتمال أن توصي بنا؟')),
        lowLabel: L(tx('Not at all likely', 'غير محتمل إطلاقًا')),
        highLabel: L(tx('Extremely likely', 'محتمل جدًا')),
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

function job(lang: TemplateLocale): FormSchema {
  const L = (t: Text): string => t[lang]
  const tree: ElementNode[] = [
    { id: 'tpl-job-heading', type: 'heading', props: { text: L(tx('Join our team', 'انضم إلى فريقنا')), level: 2 } },
    {
      id: 'tpl-job-intro',
      type: 'paragraph',
      props: {
        format: 'markdown',
        text: L(
          tx(
            'Tell us about yourself. It takes about **five minutes**. Have these ready:\n- your *work history*, newest first\n- your CV (PDF or Word)',
            'حدّثنا عن نفسك. يستغرق ذلك نحو **خمس دقائق**. جهّز ما يلي:\n- *خبراتك السابقة*، الأحدث أولًا\n- سيرتك الذاتية (PDF أو Word)',
          ),
        ),
      },
    },
    {
      id: 'tpl-job-names',
      type: 'columns',
      props: { count: 2 },
      children: [
        {
          id: 'tpl-job-first',
          type: 'text',
          name: 'first_name',
          props: { label: L(tx('First name', 'الاسم الأول')) },
          validation: [{ rule: 'required' }],
        },
        {
          id: 'tpl-job-last',
          type: 'text',
          name: 'last_name',
          props: { label: L(tx('Last name', 'اسم العائلة')) },
          validation: [{ rule: 'required' }],
        },
      ],
    },
    {
      id: 'tpl-job-email',
      type: 'email',
      name: 'email',
      props: { label: L(tx('Email', 'البريد الإلكتروني')) },
      validation: [{ rule: 'required' }, { rule: 'email' }],
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-job-phone',
      type: 'phone',
      name: 'phone',
      props: { label: L(tx('Phone', 'الهاتف')), countrySelect: true, defaultCountry: lang === 'ar' ? 'OM' : 'US' },
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-job-position',
      type: 'select',
      name: 'position',
      props: {
        label: L(tx('Position', 'الوظيفة')),
        placeholder: L(tx('Choose a position', 'اختر وظيفة')),
        items: [
          { value: 'frontend', label: L(tx('Frontend developer', 'مطوّر واجهات')) },
          { value: 'backend', label: L(tx('Backend developer', 'مطوّر خوادم')) },
          { value: 'designer', label: L(tx('Product designer', 'مصمم منتجات')) },
        ],
      },
      validation: [{ rule: 'required' }],
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-job-years',
      type: 'number',
      name: 'years_experience',
      props: { label: L(tx('Experience', 'الخبرة')), min: 0, max: 50, suffix: L(tx('years', 'سنوات')) },
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-job-portfolio',
      type: 'url',
      name: 'portfolio',
      props: { label: L(tx('Portfolio or GitHub', 'معرض الأعمال أو GitHub')), placeholder: 'https://' },
      validation: [{ rule: 'url' }],
    },
    {
      id: 'tpl-job-skills',
      type: 'tags',
      name: 'skills',
      props: {
        label: L(tx('Skills', 'المهارات')),
        placeholder: L(tx('Type a skill and press Enter', 'اكتب مهارة واضغط Enter')),
      },
      validation: [{ rule: 'max', value: 8 }],
    },
    {
      id: 'tpl-job-history',
      type: 'repeater',
      name: 'experience',
      props: {
        label: L(tx('Work history', 'الخبرات السابقة')),
        itemLabel: L(tx('Job {n}', 'وظيفة {n}')),
        addText: L(tx('Add a job', 'إضافة وظيفة')),
        minItems: 0,
        maxItems: 5,
        initialItems: 1,
        sortable: true,
      },
      children: [
        { id: 'tpl-job-company', type: 'text', name: 'company', props: { label: L(tx('Company', 'الشركة')) } },
        { id: 'tpl-job-role', type: 'text', name: 'role', props: { label: L(tx('Role', 'المسمى الوظيفي')) } },
        { id: 'tpl-job-started', type: 'month', name: 'started', props: { label: L(tx('Started', 'تاريخ البدء')) } },
      ],
    },
    {
      id: 'tpl-job-cv',
      type: 'file',
      name: 'cv',
      props: {
        label: L(tx('CV', 'السيرة الذاتية')),
        description: L(tx('PDF or Word, up to 5 MB', 'ملف PDF أو Word حتى 5 ميغابايت')),
        multiple: false,
        accept: '.pdf,.doc,.docx',
        maxSizeMb: 5,
      },
      validation: [{ rule: 'required' }],
    },
    {
      id: 'tpl-job-cover',
      type: 'richtext',
      name: 'cover_letter',
      props: {
        label: L(tx('Cover letter', 'رسالة التقديم')),
        description: L(tx('Bold, lists and links are kept.', 'يُحتفظ بالخط الغامق والقوائم والروابط.')),
      },
    },
    {
      id: 'tpl-job-interview',
      type: 'dates',
      name: 'interview_days',
      props: {
        label: L(tx('Days you could interview', 'أيام تناسبك للمقابلة')),
        tooltip: L(tx('Pick up to three days.', 'اختر حتى ثلاثة أيام.')),
      },
      validation: [{ rule: 'max', value: 3 }],
    },
    { id: 'tpl-job-source', type: 'hidden', name: 'source', props: { value: 'careers-page' } },
    { id: 'tpl-job-divider', type: 'divider', props: {} },
    {
      id: 'tpl-job-privacy',
      type: 'link',
      props: { text: L(tx('How we handle your data', 'كيف نتعامل مع بياناتك')), href: 'https://example.com/privacy', newTab: true },
    },
    {
      id: 'tpl-job-consent',
      type: 'checkbox',
      name: 'consent',
      props: { label: L(tx('Keep my application on file for future roles', 'احتفظوا بطلبي للوظائف القادمة')) },
    },
    {
      id: 'tpl-job-signature',
      type: 'signature',
      name: 'signature',
      props: {
        label: L(tx('Signature', 'التوقيع')),
        description: L(tx('By signing, you confirm the details above are true.', 'بتوقيعك تؤكد صحة البيانات أعلاه.')),
        typing: true,
        height: 140,
      },
      validation: [{ rule: 'required' }],
    },
  ]
  return { $schema: SCHEMA_ID, meta: meta('job_application', tx('Job application', 'طلب توظيف'), lang, tx('Apply', 'تقديم الطلب')), tree }
}

function booking(lang: TemplateLocale): FormSchema {
  const L = (t: Text): string => t[lang]
  const tree: ElementNode[] = [
    {
      id: 'tpl-book-photo',
      type: 'image',
      props: {
        src: 'https://picsum.photos/id/887/720/240',
        alt: L(tx('The hotel building', 'مبنى الفندق')),
      },
    },
    { id: 'tpl-book-heading', type: 'heading', props: { text: L(tx('Book your stay', 'احجز إقامتك')), level: 2 } },
    {
      id: 'tpl-book-stay',
      type: 'daterange',
      name: 'stay',
      props: { label: L(tx('Check-in and check-out', 'الوصول والمغادرة')) },
      validation: [{ rule: 'required' }],
    },
    {
      id: 'tpl-book-arrival',
      type: 'time',
      name: 'arrival_time',
      props: { label: L(tx('Arrival time', 'وقت الوصول')) },
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-book-guests',
      type: 'number',
      name: 'guests',
      props: { label: L(tx('Guests', 'عدد النزلاء')), min: 1, max: 6, default: 2 },
      validation: [{ rule: 'required' }],
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-book-room',
      type: 'radiogroup',
      name: 'room',
      props: {
        label: L(tx('Room', 'الغرفة')),
        display: 'blocks',
        items: [
          { value: 'standard', label: L(tx('Standard', 'عادية')) },
          { value: 'deluxe', label: L(tx('Deluxe', 'فاخرة')) },
          { value: 'suite', label: L(tx('Suite', 'جناح')) },
        ],
      },
      validation: [{ rule: 'required' }],
    },
    {
      id: 'tpl-book-rates',
      type: 'html',
      props: {
        html: L(
          tx(
            '<table><caption>Nightly rates</caption><thead><tr><th>Room</th><th>Price</th></tr></thead><tbody><tr><td>Standard</td><td>$90</td></tr><tr><td>Deluxe</td><td>$140</td></tr><tr><td>Suite</td><td>$220</td></tr></tbody></table><p><small>Breakfast and taxes included. <a href="https://example.com/rates" target="_blank">Full price list</a></small></p>',
            '<table><caption>أسعار الليلة</caption><thead><tr><th>الغرفة</th><th>السعر</th></tr></thead><tbody><tr><td>عادية</td><td>35 ر.ع</td></tr><tr><td>فاخرة</td><td>55 ر.ع</td></tr><tr><td>جناح</td><td>85 ر.ع</td></tr></tbody></table><p><small>يشمل الإفطار والضرائب. <a href="https://example.com/rates" target="_blank">قائمة الأسعار كاملة</a></small></p>',
          ),
        ),
      },
    },
    {
      id: 'tpl-book-pickup',
      type: 'location',
      name: 'pickup',
      props: {
        label: L(tx('Where should our driver pick you up?', 'أين يقلّك سائقنا؟')),
        description: L(tx('Optional: tap the map, use your location or type the coordinates.', 'اختياري: انقر على الخريطة أو استخدم موقعك أو اكتب الإحداثيات.')),
        lat: 23.588,
        lng: 58.3829,
        zoom: 11,
        height: 240,
      },
    },
    {
      id: 'tpl-book-budget',
      type: 'rangeslider',
      name: 'budget',
      props: {
        label: L(tx('Budget per night (USD)', 'الميزانية لليلة (دولار)')),
        min: 50,
        max: 600,
        step: 10,
        defaultFrom: 120,
        defaultTo: 300,
      },
    },
    {
      id: 'tpl-book-extras',
      type: 'checkboxgroup',
      name: 'extras',
      props: {
        label: L(tx('Extras', 'إضافات')),
        display: 'buttons',
        items: [
          { value: 'breakfast', label: L(tx('Breakfast', 'الإفطار')) },
          { value: 'parking', label: L(tx('Parking', 'موقف سيارة')) },
          { value: 'airport', label: L(tx('Airport pickup', 'التوصيل من المطار')) },
        ],
      },
    },
    {
      id: 'tpl-book-cost',
      type: 'columns',
      props: { count: 2 },
      children: [
        {
          id: 'tpl-book-nights',
          type: 'calculated',
          name: 'nights',
          props: { label: L(tx('Nights', 'عدد الليالي')), formula: 'days({stay})', decimals: 0 },
        },
        {
          id: 'tpl-book-estimate',
          type: 'calculated',
          name: 'estimate',
          props: {
            label: L(tx('Estimated cost', 'التكلفة التقديرية')),
            description: L(tx('$90 a night, plus $15 a night for each extra.', '90$ لليلة، و15$ لليلة لكل إضافة.')),
            formula: '{nights} * (90 + 15 * {extras})',
            decimals: 2,
            prefix: '$',
          },
        },
      ],
    },
    {
      id: 'tpl-book-flight',
      type: 'text',
      name: 'flight_number',
      props: { label: L(tx('Flight number', 'رقم الرحلة')), placeholder: 'WY 101' },
      conditions: [[{ field: 'extras', operator: 'contains', value: 'airport' }]],
    },
    {
      id: 'tpl-book-guest',
      type: 'group',
      name: 'guest',
      props: { label: L(tx('Main guest', 'النزيل الرئيسي')) },
      children: [
        {
          id: 'tpl-book-name',
          type: 'text',
          name: 'name',
          props: { label: L(tx('Full name', 'الاسم الكامل')) },
          validation: [{ rule: 'required' }],
        },
        {
          id: 'tpl-book-email',
          type: 'email',
          name: 'email',
          props: { label: L(tx('Email', 'البريد الإلكتروني')) },
          validation: [{ rule: 'required' }, { rule: 'email' }],
        },
      ],
    },
    {
      id: 'tpl-book-requests',
      type: 'textarea',
      name: 'requests',
      props: { label: L(tx('Special requests', 'طلبات خاصة')), rows: 3 },
    },
    {
      id: 'tpl-book-review',
      type: 'quote',
      props: {
        text: L(tx('The best sea view we have ever had.', 'أجمل إطلالة على البحر رأيناها.')),
        cite: L(tx('A recent guest', 'أحد النزلاء')),
      },
    },
  ]
  return { $schema: SCHEMA_ID, meta: meta('hotel_booking', tx('Hotel booking', 'حجز فندق'), lang, tx('Book now', 'احجز الآن')), tree }
}

function trip(lang: TemplateLocale): FormSchema {
  const L = (t: Text): string => t[lang]
  const tree: ElementNode[] = [
    { id: 'tpl-trip-heading', type: 'heading', props: { text: L(tx('Plan your trip', 'خطّط لرحلتك')), level: 2 } },
    {
      id: 'tpl-trip-intro',
      type: 'paragraph',
      props: {
        format: 'markdown',
        text: L(
          tx(
            'Add **everyone travelling** and their checked bags. Each bag may weigh up to *32 kg*; see the [baggage rules](https://example.com/baggage).',
            'أضف **جميع المسافرين** وحقائبهم المشحونة. يصل وزن الحقيبة إلى *32 كغ*؛ راجع [قواعد الأمتعة](https://example.com/baggage).',
          ),
        ),
      },
    },
    {
      id: 'tpl-trip-travellers',
      type: 'repeater',
      name: 'travellers',
      props: {
        label: L(tx('Travellers', 'المسافرون')),
        itemLabel: L(tx('Traveller {n}', 'المسافر {n}')),
        addText: L(tx('Add a traveller', 'إضافة مسافر')),
        minItems: 1,
        maxItems: 4,
        initialItems: 1,
        sortable: true,
      },
      children: [
        {
          id: 'tpl-trip-row',
          type: 'columns',
          props: { count: 2 },
          children: [
            {
              id: 'tpl-trip-name',
              type: 'text',
              name: 'name',
              props: { label: L(tx('Full name', 'الاسم الكامل')) },
              validation: [{ rule: 'required' }],
            },
            {
              id: 'tpl-trip-has-bags',
              type: 'toggle',
              name: 'has_bags',
              props: { label: L(tx('Checks in bags', 'لديه حقائب مشحونة')) },
            },
          ],
        },
        {
          id: 'tpl-trip-bags',
          type: 'repeater',
          name: 'bags',
          props: {
            label: L(tx('Bags', 'الحقائب')),
            itemLabel: L(tx('Bag {n}', 'الحقيبة {n}')),
            addText: L(tx('Add a bag', 'إضافة حقيبة')),
            minItems: 1,
            maxItems: 3,
            initialItems: 1,
            sortable: true,
          },
          conditions: [[{ field: 'travellers.has_bags', operator: 'equals', value: true }]],
          children: [
            {
              id: 'tpl-trip-weight',
              type: 'number',
              name: 'weight',
              props: { label: L(tx('Weight', 'الوزن')), suffix: L(tx('kg', 'كغ')) },
              validation: [{ rule: 'required' }, { rule: 'max', value: 32 }],
            },
            {
              id: 'tpl-trip-fragile',
              type: 'checkbox',
              name: 'fragile',
              props: { label: L(tx('Fragile', 'قابلة للكسر')) },
            },
            {
              id: 'tpl-trip-note',
              type: 'text',
              name: 'note',
              props: { label: L(tx('Handling note', 'ملاحظة للتعامل')) },
              conditions: [[{ field: 'travellers.bags.fragile', operator: 'equals', value: true }]],
            },
          ],
        },
      ],
    },
  ]
  return { $schema: SCHEMA_ID, meta: meta('trip_plan', tx('Trip', 'رحلة'), lang, tx('Book trip', 'احجز الرحلة')), tree }
}

function settings(lang: TemplateLocale): FormSchema {
  const L = (t: Text): string => t[lang]
  const tree: ElementNode[] = [
    { id: 'tpl-set-heading', type: 'heading', props: { text: L(tx('Account settings', 'إعدادات الحساب')), level: 2 } },
    {
      id: 'tpl-set-tabs',
      type: 'tabs',
      props: {},
      children: [
        {
          id: 'tpl-set-tab-profile',
          type: 'tab',
          props: { label: L(tx('Profile', 'الملف الشخصي')) },
          children: [
            {
              id: 'tpl-set-name',
              type: 'text',
              name: 'display_name',
              props: { label: L(tx('Display name', 'الاسم الظاهر')) },
              validation: [{ rule: 'required' }],
            },
            {
              id: 'tpl-set-avatar',
              type: 'imageupload',
              name: 'avatar',
              props: { label: L(tx('Profile picture', 'الصورة الشخصية')), multiple: false, accept: 'image/*', maxSizeMb: 2 },
            },
            {
              id: 'tpl-set-bio',
              type: 'textarea',
              name: 'bio',
              props: { label: L(tx('About you', 'نبذة عنك')), rows: 3 },
              validation: [{ rule: 'max', value: 200 }],
            },
          ],
        },
        {
          id: 'tpl-set-tab-prefs',
          type: 'tab',
          props: { label: L(tx('Preferences', 'التفضيلات')) },
          children: [
            {
              id: 'tpl-set-accent',
              type: 'color',
              name: 'accent_color',
              props: { label: L(tx('Accent color', 'اللون المميز')), default: '#4f46e5' },
              layout: { colSpan: 6 },
            },
            {
              id: 'tpl-set-dark',
              type: 'toggle',
              name: 'dark_mode',
              props: { label: L(tx('Dark mode', 'الوضع الداكن')) },
              layout: { colSpan: 6 },
            },
            {
              id: 'tpl-set-channels',
              type: 'multiselect',
              name: 'channels',
              props: {
                label: L(tx('Notify me by', 'أرسل الإشعارات عبر')),
                items: [
                  { value: 'email', label: L(tx('Email', 'البريد الإلكتروني')) },
                  { value: 'sms', label: L(tx('SMS', 'رسائل نصية')) },
                  { value: 'push', label: L(tx('Push notifications', 'إشعارات التطبيق')) },
                ],
              },
            },
            {
              id: 'tpl-set-away',
              type: 'week',
              name: 'away_week',
              props: {
                label: L(tx('Away week', 'أسبوع الإجازة')),
                tooltip: L(tx('We pause notifications that week.', 'نوقف الإشعارات خلال ذلك الأسبوع.')),
              },
            },
          ],
        },
        {
          id: 'tpl-set-tab-help',
          type: 'tab',
          props: { label: L(tx('Help', 'المساعدة')) },
          children: [
            {
              id: 'tpl-set-search',
              type: 'search',
              name: 'help_search',
              props: {
                label: L(tx('Search the help center', 'ابحث في مركز المساعدة')),
                placeholder: L(tx('e.g. change password', 'مثال: تغيير كلمة المرور')),
              },
            },
            {
              id: 'tpl-set-call',
              type: 'datetime',
              name: 'support_call',
              props: { label: L(tx('Book a call with support', 'احجز مكالمة مع الدعم')) },
            },
          ],
        },
      ],
    },
    {
      id: 'tpl-set-reset',
      type: 'button',
      props: { text: L(tx('Undo changes', 'تراجع عن التغييرات')), action: 'reset', variant: 'secondary' },
    },
  ]
  return { $schema: SCHEMA_ID, meta: meta('account_settings', tx('Account settings', 'إعدادات الحساب'), lang, tx('Save', 'حفظ')), tree }
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
      description: pick(
        tx(
          'Ratings matrix, a matrix with several answers per row, recommendation score and comments.',
          'مصفوفة تقييم ومصفوفة بعدة إجابات لكل صف ومقياس توصية وملاحظات.',
        ),
      ),
      schema: feedback(lang),
    },
    {
      id: 'job',
      title: pick(tx('Job application', 'طلب توظيف')),
      description: pick(
        tx(
          'Formatted intro, reorderable work history, skills, CV upload (drag and drop) and interview days.',
          'مقدمة منسّقة وخبرات قابلة لإعادة الترتيب والمهارات ورفع السيرة الذاتية (بالسحب والإفلات) وأيام المقابلة.',
        ),
      ),
      schema: job(lang),
    },
    {
      id: 'booking',
      title: pick(tx('Hotel booking', 'حجز فندق')),
      description: pick(
        tx(
          'Stay dates, room choice with a rates table (HTML block), budget range and extras.',
          'تواريخ الإقامة واختيار الغرفة مع جدول أسعار (كتلة HTML) ونطاق الميزانية والإضافات.',
        ),
      ),
      schema: booking(lang),
    },
    {
      id: 'trip',
      title: pick(tx('Trip with luggage', 'رحلة مع الأمتعة')),
      description: pick(
        tx(
          'Travellers, each with their own bags (a repeating section inside another), both reorderable.',
          'مسافرون لكل منهم حقائبه (قسم متكرر داخل آخر)، ويمكن إعادة ترتيب الاثنين.',
        ),
      ),
      schema: trip(lang),
    },
    {
      id: 'settings',
      title: pick(tx('Account settings', 'إعدادات الحساب')),
      description: pick(tx('Tabs for profile, preferences and help.', 'تبويبات للملف الشخصي والتفضيلات والمساعدة.')),
      schema: settings(lang),
    },
    {
      id: 'rsvp',
      title: pick(tx('Event RSVP', 'تأكيد الحضور')),
      description: pick(tx('Attending or not, guests and dietary needs only when attending, a hidden event tag.', 'الحضور من عدمه، والمرافقون والاحتياجات الغذائية عند الحضور فقط، ووسم مخفي للفعالية.')),
      schema: rsvp(lang),
    },
    {
      id: 'order',
      title: pick(tx('Order form', 'نموذج طلب')),
      description: pick(tx('Customer details, repeated items with a calculated count, delivery with a conditional address.', 'بيانات العميل، ومنتجات متكررة مع عدد محسوب، والتسليم مع عنوان مشروط.')),
      schema: order(lang),
    },
    {
      id: 'appointment',
      title: pick(tx('Appointment booking', 'حجز موعد')),
      description: pick(tx('Service, date and time, phone with country code, a reminder with its channel.', 'الخدمة والتاريخ والوقت، وهاتف برمز الدولة، وتذكير مع وسيلته.')),
      schema: appointment(lang),
    },
    {
      id: 'quote',
      title: pick(tx('Quote request', 'طلب عرض سعر')),
      description: pick(tx('Services, a budget range, a timeline, a brief with attachments.', 'الخدمات ونطاق الميزانية والجدول الزمني وملخص مع مرفقات.')),
      schema: quote(lang),
    },
  ]
}
