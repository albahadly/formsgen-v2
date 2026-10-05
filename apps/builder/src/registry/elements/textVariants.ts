// The text-like input variants, built from the shared factory.

import { withCountrySelect } from './phone'
import { makeTextLikeElement } from './textLike'

const icon = (path: string): string =>
  `<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="${path}"/></svg>`

export const emailElement = makeTextLikeElement({
  type: 'email',
  inputType: 'email',
  affixes: true,
  label: 'Email',
  description: 'Text input expecting an email address',
  icon: icon(
    'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z',
  ),
  defaultValidation: [{ rule: 'email' }],
})

export const passwordElement = makeTextLikeElement({
  type: 'password',
  inputType: 'password',
  affixes: true,
  label: 'Password',
  description: 'Masked text input',
  icon: icon(
    'M12 17a2 2 0 0 0 2-2 2 2 0 0 0-4 0 2 2 0 0 0 2 2zm6-8h-1V7a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zm-9-2a3 3 0 0 1 6 0v2H9z',
  ),
})

export const urlElement = makeTextLikeElement({
  type: 'url',
  inputType: 'url',
  affixes: true,
  label: 'URL',
  description: 'Text input expecting a web address',
  icon: icon(
    'M10.6 13.4a1 1 0 0 1 0-1.4l2.8-2.8a1 1 0 1 1 1.4 1.4L12 13.4a1 1 0 0 1-1.4 0zm-2.8 4.2a3 3 0 0 1 0-4.2l1.4-1.4-1.4-1.4-1.4 1.4a5 5 0 0 0 7 7l1.4-1.4-1.4-1.4-1.4 1.4a3 3 0 0 1-4.2 0zm9.8-5.6 1.4-1.4a5 5 0 0 0-7-7L10.6 5l1.4 1.4 1.4-1.4a3 3 0 0 1 4.2 4.2l-1.4 1.4z',
  ),
  defaultValidation: [{ rule: 'url' }],
})

export const phoneElement = withCountrySelect(
  makeTextLikeElement({
    type: 'phone',
    inputType: 'tel',
    affixes: true,
    label: 'Phone',
    description: 'Text input expecting a phone number',
    icon: icon(
      'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.2 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .6 3.6 1 1 0 0 1-.3 1z',
    ),
  }),
)

export const dateElement = makeTextLikeElement({
  type: 'date',
  inputType: 'date',
  label: 'Date',
  description: 'Native date picker',
  icon: icon(
    'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 15H5V9h14zM7 11h5v5H7z',
  ),
})

export const timeElement = makeTextLikeElement({
  type: 'time',
  inputType: 'time',
  label: 'Time',
  description: 'Native time picker',
  icon: icon(
    'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm.5-13H11v6l5.2 3.1.8-1.2-4.5-2.7z',
  ),
})

export const datetimeElement = makeTextLikeElement({
  type: 'datetime',
  inputType: 'datetime-local',
  label: 'Date & time',
  description: 'Native date and time picker',
  icon: icon(
    'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h7v-2H5V9h14v3h2V6a2 2 0 0 0-2-2zm-1 10a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm1.6 5.6-2.1-1.3V15.5h1v2.2l1.6.9z',
  ),
})

export const monthElement = makeTextLikeElement({
  type: 'month',
  inputType: 'month',
  label: 'Month',
  description: 'Month and year picker',
  icon: icon('M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 15H5V9h14z'),
})

export const weekElement = makeTextLikeElement({
  type: 'week',
  inputType: 'week',
  label: 'Week',
  description: 'Week of the year picker',
  icon: icon('M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 15H5V9h14zM6 11h12v3H6z'),
})

export const colorElement = makeTextLikeElement({
  type: 'color',
  inputType: 'color',
  label: 'Color',
  description: 'Color picker (hex value)',
  icon: icon(
    'M12 3a9 9 0 0 0 0 18 1.5 1.5 0 0 0 1.1-2.5 1.5 1.5 0 0 1 1.1-2.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8zm-5.5 9A1.5 1.5 0 1 1 8 10.5 1.5 1.5 0 0 1 6.5 12zm3-4A1.5 1.5 0 1 1 11 6.5 1.5 1.5 0 0 1 9.5 8zm5 0A1.5 1.5 0 1 1 16 6.5 1.5 1.5 0 0 1 14.5 8zm3 4a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5z',
  ),
  placeholder: false,
  inputSlot: 'colorInput',
})

export const searchElement = makeTextLikeElement({
  type: 'search',
  inputType: 'search',
  affixes: true,
  label: 'Search',
  description: 'Search box (clearable text input)',
  icon: icon(
    'M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 14 15.5l.3.3v.8l5 5 1.5-1.5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z',
  ),
})
