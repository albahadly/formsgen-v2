// Four more starter templates (phase 44): an event RSVP, an order form with
// a calculated total, an appointment booking and a quote request. Each in
// English and Arabic, like those in index.ts.

import { SCHEMA_ID, type ElementNode, type FormSchema } from '@albahadly/formsgen-renderer'
import { meta, tx, type TemplateLocale, type Text } from './shared'

export function rsvp(lang: TemplateLocale): FormSchema {
  const L = (t: Text): string => t[lang]
  const attending = (value: string) => [[{ field: 'attending', operator: 'equals' as const, value }]]
  const tree: ElementNode[] = [
    { id: 'tpl-rsvp-heading', type: 'heading', props: { text: L(tx('Will you join us?', 'هل ستنضم إلينا؟')), level: 2 } },
    {
      id: 'tpl-rsvp-intro',
      type: 'paragraph',
      props: { text: L(tx('Saturday 14 March, 7 pm at the Riverside Hall. Please answer by 1 March.', 'السبت 14 مارس، الساعة 7 مساءً في قاعة النهر. يرجى الرد قبل 1 مارس.')) },
    },
    {
      id: 'tpl-rsvp-name',
      type: 'text',
      name: 'full_name',
      props: { label: L(tx('Full name', 'الاسم الكامل')) },
      validation: [{ rule: 'required' }],
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-rsvp-email',
      type: 'email',
      name: 'email',
      props: { label: L(tx('Email', 'البريد الإلكتروني')) },
      validation: [{ rule: 'required' }, { rule: 'email' }],
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-rsvp-attending',
      type: 'radiogroup',
      name: 'attending',
      props: {
        label: L(tx('Will you attend?', 'هل ستحضر؟')),
        display: 'buttons',
        items: [
          { value: 'yes', label: L(tx('Yes, I will be there', 'نعم، سأكون هناك')) },
          { value: 'no', label: L(tx('Sorry, I cannot make it', 'عذرًا، لن أتمكن من الحضور')) },
        ],
      },
      validation: [{ rule: 'required' }],
    },
    {
      id: 'tpl-rsvp-guests',
      type: 'range',
      name: 'guests',
      props: { label: L(tx('Guests coming with you', 'عدد المرافقين')), min: 0, max: 5, step: 1, default: 0, tooltip: L(tx('Up to five.', 'حتى خمسة.')) },
      conditions: attending('yes'),
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-rsvp-dietary',
      type: 'checkboxgroup',
      name: 'dietary',
      props: {
        label: L(tx('Dietary needs', 'احتياجات غذائية')),
        items: [
          { value: 'vegetarian', label: L(tx('Vegetarian', 'نباتي')) },
          { value: 'vegan', label: L(tx('Vegan', 'نباتي صرف')) },
          { value: 'gluten_free', label: L(tx('Gluten-free', 'خالٍ من الغلوتين')) },
          { value: 'halal', label: L(tx('Halal', 'حلال')) },
        ],
      },
      conditions: attending('yes'),
    },
    {
      id: 'tpl-rsvp-song',
      type: 'text',
      name: 'song',
      props: { label: L(tx('A song that gets you dancing', 'أغنية تجعلك ترقص')), placeholder: L(tx('Optional', 'اختياري')) },
      conditions: attending('yes'),
    },
    {
      id: 'tpl-rsvp-message',
      type: 'textarea',
      name: 'message',
      props: { label: L(tx('A note for the hosts', 'رسالة للمضيفين')), rows: 3 },
    },
    { id: 'tpl-rsvp-event', type: 'hidden', name: 'event', props: { value: 'spring-gala' } },
  ]
  return { $schema: SCHEMA_ID, meta: meta('rsvp_form', tx('Event RSVP', 'تأكيد الحضور'), lang, tx('Send my reply', 'إرسال ردي')), tree }
}

export function order(lang: TemplateLocale): FormSchema {
  const L = (t: Text): string => t[lang]
  const tree: ElementNode[] = [
    { id: 'tpl-order-heading', type: 'heading', props: { text: L(tx('Place an order', 'إنشاء طلب')), level: 2 } },
    {
      id: 'tpl-order-customer',
      type: 'group',
      name: 'customer',
      props: { label: L(tx('Your details', 'بياناتك')) },
      children: [
        {
          id: 'tpl-order-name',
          type: 'text',
          name: 'full_name',
          props: { label: L(tx('Full name', 'الاسم الكامل')) },
          validation: [{ rule: 'required' }],
          layout: { colSpan: 6 },
        },
        {
          id: 'tpl-order-email',
          type: 'email',
          name: 'email',
          props: { label: L(tx('Email', 'البريد الإلكتروني')) },
          validation: [{ rule: 'required' }, { rule: 'email' }],
          layout: { colSpan: 6 },
        },
        {
          id: 'tpl-order-phone',
          type: 'phone',
          name: 'phone',
          props: { label: L(tx('Phone', 'الهاتف')), countrySelect: true, defaultCountry: lang === 'ar' ? 'OM' : 'US' },
        },
      ],
    },
    {
      id: 'tpl-order-items',
      type: 'repeater',
      name: 'items',
      props: {
        label: L(tx('Items', 'المنتجات')),
        itemLabel: L(tx('Item {n}', 'المنتج {n}')),
        addText: L(tx('Add another item', 'إضافة منتج آخر')),
        minItems: 1,
        maxItems: 10,
      },
      children: [
        {
          id: 'tpl-order-product',
          type: 'select',
          name: 'product',
          props: {
            label: L(tx('Product', 'المنتج')),
            placeholder: L(tx('Choose a product', 'اختر منتجًا')),
            items: [
              { value: 'tshirt', label: L(tx('T-shirt — $20', 'قميص — 20$')) },
              { value: 'mug', label: L(tx('Mug — $12', 'كوب — 12$')) },
              { value: 'poster', label: L(tx('Poster — $15', 'ملصق — 15$')) },
              { value: 'cap', label: L(tx('Cap — $18', 'قبعة — 18$')) },
            ],
          },
          validation: [{ rule: 'required' }],
        },
        {
          id: 'tpl-order-quantity',
          type: 'number',
          name: 'quantity',
          props: { label: L(tx('Quantity', 'الكمية')), min: 1, max: 20, default: 1 },
          validation: [{ rule: 'required' }, { rule: 'min', value: 1 }],
          layout: { colSpan: 6 },
        },
        {
          id: 'tpl-order-size',
          type: 'radiogroup',
          name: 'size',
          props: {
            label: L(tx('Size', 'المقاس')),
            display: 'buttons',
            items: [
              { value: 's', label: 'S' },
              { value: 'm', label: 'M' },
              { value: 'l', label: 'L' },
              { value: 'xl', label: 'XL' },
            ],
          },
          conditions: [[{ field: 'items.product', operator: 'equals', value: 'tshirt' }]],
        },
      ],
    },
    {
      id: 'tpl-order-total',
      type: 'calculated',
      name: 'total_items',
      props: { label: L(tx('Items in your order', 'عدد القطع في طلبك')), formula: 'sum({items.quantity})', decimals: 0 },
    },
    {
      id: 'tpl-order-tip',
      type: 'currency',
      name: 'tip',
      props: { label: L(tx('Tip for the courier', 'إكرامية للمندوب')), currency: 'USD', decimals: 2 },
      conditions: [[{ field: 'delivery', operator: 'equals', value: 'courier' }]],
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-order-delivery',
      type: 'radiogroup',
      name: 'delivery',
      props: {
        label: L(tx('Delivery', 'التسليم')),
        items: [
          { value: 'pickup', label: L(tx('I will pick it up', 'سأستلمه بنفسي')) },
          { value: 'courier', label: L(tx('Deliver it to me', 'توصيل إلى عنواني')) },
        ],
      },
      validation: [{ rule: 'required' }],
    },
    {
      id: 'tpl-order-address',
      type: 'group',
      name: 'address',
      props: { label: L(tx('Delivery address', 'عنوان التوصيل')) },
      conditions: [[{ field: 'delivery', operator: 'equals', value: 'courier' }]],
      children: [
        {
          id: 'tpl-order-street',
          type: 'address',
          name: 'street',
          props: { label: L(tx('Street and number', 'الشارع والرقم')) },
          validation: [{ rule: 'required' }],
        },
        {
          id: 'tpl-order-city',
          type: 'text',
          name: 'city',
          props: { label: L(tx('City', 'المدينة')) },
          validation: [{ rule: 'required' }],
          layout: { colSpan: 6 },
        },
        {
          id: 'tpl-order-postcode',
          type: 'text',
          name: 'postcode',
          props: { label: L(tx('Postcode', 'الرمز البريدي')) },
          validation: [{ rule: 'required' }],
          layout: { colSpan: 6 },
        },
      ],
    },
    {
      id: 'tpl-order-date',
      type: 'date',
      name: 'delivery_date',
      props: { label: L(tx('Preferred date', 'التاريخ المفضل')) },
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-order-notes',
      type: 'textarea',
      name: 'notes',
      props: { label: L(tx('Notes for us', 'ملاحظات لنا')), rows: 3 },
    },
  ]
  return { $schema: SCHEMA_ID, meta: meta('order_form', tx('Order form', 'نموذج طلب'), lang, tx('Place order', 'إرسال الطلب')), tree }
}

export function appointment(lang: TemplateLocale): FormSchema {
  const L = (t: Text): string => t[lang]
  const tree: ElementNode[] = [
    { id: 'tpl-appt-heading', type: 'heading', props: { text: L(tx('Book an appointment', 'حجز موعد')), level: 2 } },
    {
      id: 'tpl-appt-intro',
      type: 'paragraph',
      props: { text: L(tx('We confirm every booking by email within a few hours.', 'نؤكد كل حجز بالبريد الإلكتروني خلال ساعات قليلة.')) },
    },
    {
      id: 'tpl-appt-service',
      type: 'select',
      name: 'service',
      props: {
        label: L(tx('Service', 'الخدمة')),
        placeholder: L(tx('Choose a service', 'اختر خدمة')),
        items: [
          { value: 'consultation', label: L(tx('First consultation (45 min)', 'استشارة أولى (45 دقيقة)')) },
          { value: 'checkup', label: L(tx('Check-up (30 min)', 'فحص دوري (30 دقيقة)')) },
          { value: 'followup', label: L(tx('Follow-up (20 min)', 'متابعة (20 دقيقة)')) },
        ],
      },
      validation: [{ rule: 'required' }],
    },
    {
      id: 'tpl-appt-date',
      type: 'date',
      name: 'date',
      props: { label: L(tx('Date', 'التاريخ')) },
      validation: [{ rule: 'required' }],
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-appt-time',
      type: 'time',
      name: 'time',
      props: { label: L(tx('Time', 'الوقت')), tooltip: L(tx('We are open 9:00–17:00, Sunday to Thursday.', 'نعمل من 9:00 إلى 17:00، من الأحد إلى الخميس.')) },
      validation: [{ rule: 'required' }],
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-appt-name',
      type: 'text',
      name: 'full_name',
      props: { label: L(tx('Full name', 'الاسم الكامل')) },
      validation: [{ rule: 'required' }],
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-appt-phone',
      type: 'phone',
      name: 'phone',
      props: { label: L(tx('Phone', 'الهاتف')), countrySelect: true, defaultCountry: lang === 'ar' ? 'OM' : 'US' },
      validation: [{ rule: 'required' }],
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-appt-email',
      type: 'email',
      name: 'email',
      props: { label: L(tx('Email', 'البريد الإلكتروني')) },
      validation: [{ rule: 'required' }, { rule: 'email' }],
    },
    {
      id: 'tpl-appt-first',
      type: 'toggle',
      name: 'first_visit',
      props: { label: L(tx('This is my first visit', 'هذه زيارتي الأولى')) },
    },
    {
      id: 'tpl-appt-reminder',
      type: 'toggle',
      name: 'reminder',
      props: { label: L(tx('Send me a reminder the day before', 'أرسلوا لي تذكيرًا قبل الموعد بيوم')), default: true },
    },
    {
      id: 'tpl-appt-channel',
      type: 'radiogroup',
      name: 'reminder_channel',
      props: {
        label: L(tx('Remind me by', 'التذكير عبر')),
        display: 'buttons',
        items: [
          { value: 'sms', label: L(tx('Text message', 'رسالة نصية')) },
          { value: 'email', label: L(tx('Email', 'البريد الإلكتروني')) },
        ],
        default: 'sms',
      },
      conditions: [[{ field: 'reminder', operator: 'equals', value: true }]],
    },
    {
      id: 'tpl-appt-notes',
      type: 'textarea',
      name: 'notes',
      props: { label: L(tx('Anything we should know?', 'هل من شيء يجب أن نعرفه؟')), rows: 3 },
    },
  ]
  return { $schema: SCHEMA_ID, meta: meta('appointment_form', tx('Appointment booking', 'حجز موعد'), lang, tx('Book appointment', 'تأكيد الحجز')), tree }
}

export function quote(lang: TemplateLocale): FormSchema {
  const L = (t: Text): string => t[lang]
  const tree: ElementNode[] = [
    { id: 'tpl-quote-heading', type: 'heading', props: { text: L(tx('Request a quote', 'طلب عرض سعر')), level: 2 } },
    {
      id: 'tpl-quote-intro',
      type: 'paragraph',
      props: { text: L(tx('Tell us about your project and we will send a quote within two working days.', 'أخبرنا عن مشروعك وسنرسل عرض السعر خلال يومي عمل.')) },
    },
    {
      id: 'tpl-quote-company',
      type: 'text',
      name: 'company',
      props: { label: L(tx('Company', 'الشركة')) },
      validation: [{ rule: 'required' }],
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-quote-contact',
      type: 'text',
      name: 'contact_name',
      props: { label: L(tx('Contact person', 'الشخص المسؤول')) },
      validation: [{ rule: 'required' }],
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-quote-email',
      type: 'email',
      name: 'email',
      props: { label: L(tx('Email', 'البريد الإلكتروني')) },
      validation: [{ rule: 'required' }, { rule: 'email' }],
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-quote-website',
      type: 'url',
      name: 'website',
      props: { label: L(tx('Website', 'الموقع الإلكتروني')), placeholder: 'https://' },
      validation: [{ rule: 'url' }],
      layout: { colSpan: 6 },
    },
    {
      id: 'tpl-quote-services',
      type: 'multiselect',
      name: 'services',
      props: {
        label: L(tx('What do you need?', 'ما الذي تحتاجه؟')),
        items: [
          { value: 'design', label: L(tx('Design', 'تصميم')) },
          { value: 'development', label: L(tx('Development', 'تطوير')) },
          { value: 'hosting', label: L(tx('Hosting', 'استضافة')) },
          { value: 'support', label: L(tx('Ongoing support', 'دعم مستمر')) },
          { value: 'training', label: L(tx('Training', 'تدريب')) },
        ],
      },
      validation: [{ rule: 'required' }],
    },
    {
      id: 'tpl-quote-budget',
      type: 'rangeslider',
      name: 'budget',
      props: { label: L(tx('Budget range (USD)', 'نطاق الميزانية (دولار)')), min: 500, max: 50000, step: 500, defaultFrom: 2000, defaultTo: 10000 },
    },
    {
      id: 'tpl-quote-timeline',
      type: 'daterange',
      name: 'timeline',
      props: { label: L(tx('When should it happen?', 'متى يجب أن يتم؟')) },
    },
    {
      id: 'tpl-quote-brief',
      type: 'textarea',
      name: 'brief',
      props: { label: L(tx('Project brief', 'ملخص المشروع')), rows: 6, placeholder: L(tx('Goals, audience, examples you like…', 'الأهداف والجمهور وأمثلة تعجبك…')) },
      validation: [{ rule: 'required' }, { rule: 'min', value: 30 }],
    },
    {
      id: 'tpl-quote-files',
      type: 'file',
      name: 'attachments',
      props: { label: L(tx('Attachments', 'المرفقات')), multiple: true, accept: '.pdf,.doc,.docx,image/*', maxSizeMb: 10, maxFiles: 3 },
    },
    {
      id: 'tpl-quote-consent',
      type: 'checkbox',
      name: 'consent',
      props: { label: L(tx('You may contact me about this request', 'أوافق على التواصل معي بخصوص هذا الطلب')) },
      validation: [{ rule: 'required' }],
    },
  ]
  return { $schema: SCHEMA_ID, meta: meta('quote_form', tx('Quote request', 'طلب عرض سعر'), lang, tx('Request quote', 'إرسال الطلب')), tree }
}
