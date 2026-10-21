// Theme bridges: make meta.theme reach the Tailwind and Bootstrap exports.
// Their markup uses the framework's own palette classes, so a small
// generated stylesheet — concrete values, scoped to the themed form's
// `.fg-themed` root — re-styles exactly the classes the adapters emit.
// No theme, no bridge: unthemed exports are unchanged.

import {
  parseHexColor,
  pinsLightScheme,
  readableTextOn,
  resolveTheme,
  shadeColor,
  themeColorScheme,
  type ThemeTokens,
} from '@albahadly/formsgen-renderer'

/** Class on the themed form root (or the Blazor wrapper) the bridges scope to. */
export const THEMED_CLASS = 'fg-themed'

function alpha(color: string, opacity: number): string {
  const rgb = parseHexColor(color)
  return rgb ? `rgba(${rgb.join(', ')}, ${opacity})` : color
}

/** `--x: v;` plus `--x-rgb: r, g, b;` when the value is a hex color. */
function withRgb(variable: string, value: string): string[] {
  const rgb = parseHexColor(value)
  return rgb ? [`${variable}: ${value};`, `${variable}-rgb: ${rgb.join(', ')};`] : [`${variable}: ${value};`]
}

/** Bootstrap's select chevron, drawn in the theme's text color. */
function selectChevron(color: string): string {
  const stroke = color.replace('#', '%23')
  return `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='${stroke}' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`
}

function rule(selector: string, declarations: string[]): string {
  return declarations.length ? `${selector} {\n${declarations.map((d) => `  ${d}`).join('\n')}\n}\n` : ''
}

// ---------------------------------------------------------------- Bootstrap

export function bootstrapThemeCss(theme: ThemeTokens | undefined): string | undefined {
  const t = resolveTheme(theme)
  if (Object.keys(t).length === 0) return undefined
  const root: string[] = []
  let css = ''
  const primary = t['color-primary']
  if (primary) {
    const contrast = t['color-primary-contrast']!
    const hover = shadeColor(primary, 0.12)
    const rgb = parseHexColor(primary)
    root.push(`--bs-primary: ${primary};`, `--bs-link-color: ${primary};`)
    if (rgb) root.push(`--bs-primary-rgb: ${rgb.join(', ')};`, `--bs-link-color-rgb: ${rgb.join(', ')};`)
    css += rule(`.${THEMED_CLASS} .btn-primary`, [
      `--bs-btn-color: ${contrast};`,
      `--bs-btn-bg: ${primary};`,
      `--bs-btn-border-color: ${primary};`,
      `--bs-btn-hover-color: ${contrast};`,
      `--bs-btn-hover-bg: ${hover};`,
      `--bs-btn-hover-border-color: ${hover};`,
      `--bs-btn-active-color: ${contrast};`,
      `--bs-btn-active-bg: ${hover};`,
      `--bs-btn-active-border-color: ${hover};`,
      // Direct values too: host stylesheets (e.g. the Blazor template's
      // app.css) restyle .btn-primary without Bootstrap's variables.
      `color: ${contrast};`,
      `background-color: ${primary};`,
      `border-color: ${primary};`,
    ])
    css += rule(`.${THEMED_CLASS} .btn-primary:hover, .${THEMED_CLASS} .btn-primary:active`, [
      `color: ${contrast};`,
      `background-color: ${hover};`,
      `border-color: ${hover};`,
    ])
    css += rule(`.${THEMED_CLASS} .btn:focus-visible`, [`box-shadow: 0 0 0 0.25rem ${alpha(primary, 0.5)};`])
    // Choice blocks/buttons (.btn-check + .btn-outline-primary)
    css += rule(`.${THEMED_CLASS} .btn-outline-primary`, [
      `--bs-btn-color: ${primary};`,
      `--bs-btn-border-color: ${primary};`,
      `--bs-btn-hover-color: ${contrast};`,
      `--bs-btn-hover-bg: ${primary};`,
      `--bs-btn-hover-border-color: ${primary};`,
      `--bs-btn-active-color: ${contrast};`,
      `--bs-btn-active-bg: ${primary};`,
      `--bs-btn-active-border-color: ${primary};`,
    ])
    css += rule(
      `.${THEMED_CLASS} .form-control:focus, .${THEMED_CLASS} .form-select:focus, .${THEMED_CLASS} .form-check-input:focus`,
      [`border-color: ${primary};`, `box-shadow: 0 0 0 0.25rem ${alpha(primary, 0.25)};`],
    )
    css += rule(`.${THEMED_CLASS} .form-check-input:checked`, [
      `background-color: ${primary};`,
      `border-color: ${primary};`,
    ])
    css += rule(`.${THEMED_CLASS} .form-range::-webkit-slider-thumb`, [`background-color: ${primary};`])
    css += rule(`.${THEMED_CLASS} .form-range::-moz-range-thumb`, [`background-color: ${primary};`])
    css += rule(`.${THEMED_CLASS} .nav-underline .nav-link.active`, [`color: ${primary};`])
  }
  const text = t['color-text']
  if (text) {
    root.push(...withRgb('--bs-body-color', text), ...withRgb('--bs-emphasis-color', text), `color: ${text};`)
    if (parseHexColor(text)) {
      css += rule(`.${THEMED_CLASS} .form-select`, [`--bs-form-select-bg-img: ${selectChevron(text)};`])
    }
  }
  if (t['color-bg']) {
    root.push(...withRgb('--bs-body-bg', t['color-bg']), `background-color: ${t['color-bg']};`)
  }
  if (t['color-border']) {
    root.push(`--bs-border-color: ${t['color-border']};`, `--bs-border-color-translucent: ${t['color-border']};`)
  }
  const surface = t['color-surface']
  if (surface) root.push(...withRgb('--bs-tertiary-bg', surface), ...withRgb('--bs-secondary-bg', surface))
  const muted = t['color-muted']
  if (muted) {
    root.push(`--bs-secondary-color: ${muted};`)
    if (parseHexColor(muted)) root.push(`--bs-secondary-rgb: ${parseHexColor(muted)!.join(', ')};`)
    const onMuted = readableTextOn(muted)
    // Tag chips: Bootstrap forces white text on the secondary color.
    css += rule(`.${THEMED_CLASS} .text-bg-secondary, .${THEMED_CLASS} .text-bg-secondary .text-white`, [
      `color: ${onMuted} !important;`,
    ])
    css += rule(`.${THEMED_CLASS} .btn-outline-secondary`, [
      `--bs-btn-color: ${muted};`,
      `--bs-btn-border-color: ${muted};`,
      `--bs-btn-hover-color: ${onMuted};`,
      `--bs-btn-hover-bg: ${muted};`,
      `--bs-btn-hover-border-color: ${muted};`,
      `--bs-btn-active-color: ${onMuted};`,
      `--bs-btn-active-bg: ${muted};`,
      `--bs-btn-active-border-color: ${muted};`,
    ])
  }
  const error = t['color-error']
  if (error) {
    const rgb = parseHexColor(error)
    root.push(
      `--bs-danger: ${error};`,
      `--bs-form-invalid-color: ${error};`,
      `--bs-form-invalid-border-color: ${error};`,
    )
    if (rgb) root.push(`--bs-danger-rgb: ${rgb.join(', ')};`)
    const onError = t['color-error-contrast']!
    const errorHover = shadeColor(error, 0.12)
    css += rule(`.${THEMED_CLASS} .btn-danger`, [
      `--bs-btn-color: ${onError};`,
      `--bs-btn-bg: ${error};`,
      `--bs-btn-border-color: ${error};`,
      `--bs-btn-hover-color: ${onError};`,
      `--bs-btn-hover-bg: ${errorHover};`,
      `--bs-btn-hover-border-color: ${errorHover};`,
      `--bs-btn-active-color: ${onError};`,
      `--bs-btn-active-bg: ${errorHover};`,
      `--bs-btn-active-border-color: ${errorHover};`,
      `color: ${onError};`,
      `background-color: ${error};`,
      `border-color: ${error};`,
    ])
  }
  if (t['radius']) {
    root.push(
      `--bs-border-radius: ${t['radius']};`,
      `--bs-border-radius-sm: ${t['radius']};`,
      `--bs-border-radius-lg: ${t['radius']};`,
    )
  }
  if (t['font']) root.push(`--bs-body-font-family: ${t['font']};`, `font-family: ${t['font']};`)
  const scheme = themeColorScheme(t)
  if (scheme) root.push(`color-scheme: ${scheme};`)
  if (t['space']) {
    css += rule(`.${THEMED_CLASS} .row.g-3`, [`--bs-gutter-x: ${t['space']};`, `--bs-gutter-y: ${t['space']};`])
  }
  return `/* FormsGen theme for Bootstrap 5 */\n${rule(`.${THEMED_CLASS}.${THEMED_CLASS}`, root)}${css}`
}

// ----------------------------------------------------------------- Tailwind

/** Escapes a Tailwind class for use in a CSS selector. */
function cls(name: string): string {
  return name.replace(/([:/.[\]%#()!,])/g, '\\$1')
}

const VARIANT_PSEUDO: Record<string, string> = {
  hover: ':hover',
  focus: ':focus',
  'focus-within': ':focus-within',
  'focus-visible': ':focus-visible',
  checked: ':checked',
  'has-[:checked]': ':has(:checked)',
  'has-[:focus-visible]': ':has(:focus-visible)',
  'data-[fg-dragging]': '[data-fg-dragging]',
  file: '::file-selector-button',
}

/** The variant prefix of a class (`has-[:checked]:bg-x` → `has-[:checked]`). */
function variantOf(className: string): string {
  let depth = 0
  for (let i = className.length - 1; i >= 0; i--) {
    const c = className[i]
    if (c === ']') depth++
    else if (c === '[') depth--
    else if (c === ':' && depth === 0) return className.slice(0, i)
  }
  return ''
}

/** `.fg-themed .hover\:bg-x:hover` — dark: variants are themed in every scheme. */
function twSelector(className: string): string {
  return `.${THEMED_CLASS} .${cls(className)}${VARIANT_PSEUDO[variantOf(className)] ?? ''}`
}

/**
 * Every palette-bound Tailwind class the adapter emits, grouped by the theme
 * token that replaces it. Kept in sync with tailwind.ts by a test.
 */
export const TAILWIND_THEMED: Record<string, Record<string, string[]>> = {
  'color-text': { color: ['text-gray-900', 'dark:text-gray-100', 'text-gray-700', 'hover:text-gray-700'] },
  'color-muted': { color: ['text-gray-500', 'text-gray-600', 'dark:text-gray-400', 'dark:text-gray-300'] },
  'color-surface': {
    'background-color': ['bg-gray-50', 'bg-gray-100', 'dark:bg-gray-800/50', 'dark:bg-gray-700', 'hover:bg-gray-50'],
  },
  'color-primary': {
    color: ['text-indigo-600', 'dark:text-indigo-400'],
    'background-color': [
      'bg-indigo-600',
      'checked:bg-indigo-600',
      'has-[:checked]:bg-indigo-600',
      'file:bg-indigo-600',
    ],
    'border-color': [
      'border-indigo-500',
      'border-indigo-600',
      'focus:border-indigo-500',
      'has-[:checked]:border-indigo-600',
      'hover:border-indigo-500',
      'data-[fg-dragging]:border-indigo-500',
    ],
    'accent-color': ['accent-indigo-600'],
  },
  'color-primary-contrast': { color: ['has-[:checked]:text-white', 'file:text-white'] },
  'color-bg': { 'background-color': ['bg-white', 'dark:bg-gray-800', 'dark:bg-gray-900'] },
  'color-border': {
    'border-color': ['border-gray-200', 'border-gray-300', 'dark:border-gray-600', 'dark:border-gray-700'],
    // the switch track while off
    'background-color': ['bg-gray-300', 'dark:bg-gray-600'],
  },
  'color-error': {
    color: ['text-red-600', 'dark:text-red-400', 'hover:text-red-600', 'hover:text-red-700'],
    'border-color': ['border-red-500'],
    'background-color': ['bg-red-600'],
  },
  radius: { 'border-radius': ['rounded-md', 'rounded-lg'] },
  space: { gap: ['gap-4'] },
}

/**
 * A custom background or text color pins the light scheme (as the vanilla
 * stylesheet does): each dark: variant falls back to its light counterpart.
 */
export const TAILWIND_DARK_RESETS: Record<string, [property: string, value: string]> = {
  'dark:text-gray-100': ['color', '#111827'],
  'dark:text-gray-300': ['color', '#4b5563'],
  'dark:text-gray-400': ['color', '#6b7280'],
  'dark:text-indigo-400': ['color', '#4f46e5'],
  'dark:text-red-400': ['color', '#dc2626'],
  'dark:bg-gray-800': ['background-color', '#ffffff'],
  'dark:bg-gray-900': ['background-color', '#ffffff'],
  'dark:bg-gray-800/50': ['background-color', '#f9fafb'],
  'dark:bg-gray-700': ['background-color', '#f3f4f6'],
  'dark:bg-gray-600': ['background-color', '#d1d5db'],
  'dark:border-gray-600': ['border-color', '#d1d5db'],
  'dark:border-gray-700': ['border-color', '#e5e7eb'],
}

/** Ring utilities take an rgba color through --tw-ring-color. */
export const TAILWIND_RINGS: Record<string, string[]> = {
  'color-primary': [
    'focus:ring-indigo-200',
    'focus:ring-indigo-300',
    'focus-within:ring-indigo-200',
    'focus-visible:ring-indigo-300',
    'has-[:focus-visible]:ring-indigo-300',
  ],
  'color-error': ['focus:ring-red-200', 'focus:ring-red-300'],
}

/** Rings that mark a selection: drawn in the full token color. */
export const TAILWIND_SOLID_RINGS: Record<string, string[]> = {
  'color-primary': ['has-[:checked]:ring-indigo-600'],
}

export function tailwindThemeCss(theme: ThemeTokens | undefined): string | undefined {
  const t = resolveTheme(theme)
  if (Object.keys(t).length === 0) return undefined
  const root: string[] = []
  if (t['color-text']) root.push(`color: ${t['color-text']};`)
  if (t['color-bg']) root.push(`background-color: ${t['color-bg']};`)
  if (t['font']) root.push(`font-family: ${t['font']};`)
  const scheme = themeColorScheme(t)
  if (scheme) root.push(`color-scheme: ${scheme};`)
  let css = rule(`.${THEMED_CLASS}.${THEMED_CLASS}`, root)
  // The two-handle slider's CSS is framework-neutral: it reads these.
  css += rule(`.${THEMED_CLASS} .fg-dual`, [
    ...(t['color-primary'] ? [`--fg-color-primary: ${t['color-primary']};`] : []),
    ...(t['color-border'] ? [`--fg-color-border: ${t['color-border']};`] : []),
  ])
  // Resets first: a token rule of equal specificity that follows wins.
  if (pinsLightScheme(t)) {
    for (const [className, [property, value]] of Object.entries(TAILWIND_DARK_RESETS)) {
      css += rule(twSelector(className), [`${property}: ${value};`])
    }
  }
  for (const [token, properties] of Object.entries(TAILWIND_THEMED)) {
    const value = t[token]
    if (!value) continue
    for (const [property, classes] of Object.entries(properties)) {
      css += rule(classes.map(twSelector).join(',\n'), [`${property}: ${value};`])
    }
  }
  for (const [token, classes] of Object.entries(TAILWIND_RINGS)) {
    const value = t[token]
    if (value) css += rule(classes.map(twSelector).join(',\n'), [`--tw-ring-color: ${alpha(value, 0.35)};`])
  }
  for (const [token, classes] of Object.entries(TAILWIND_SOLID_RINGS)) {
    const value = t[token]
    if (value) css += rule(classes.map(twSelector).join(',\n'), [`--tw-ring-color: ${value};`])
  }
  const error = t['color-error']
  if (error) {
    css += rule(`.${THEMED_CLASS} .${cls('hover:bg-red-500')}:hover`, [`background-color: ${shadeColor(error, 0.12)};`])
    css += rule(`.${THEMED_CLASS} .bg-red-600.text-white`, [`color: ${t['color-error-contrast']};`])
  }
  const primary = t['color-primary']
  if (primary) {
    css += rule(`.${THEMED_CLASS} .${cls('hover:bg-indigo-500')}:hover`, [
      `background-color: ${shadeColor(primary, 0.12)};`,
    ])
    // Readable text on the primary button whatever the chosen color.
    css += rule(`.${THEMED_CLASS} .bg-indigo-600.text-white`, [`color: ${t['color-primary-contrast']};`])
  }
  return `/* FormsGen theme for Tailwind CSS */\n${css}`
}

// ------------------------------------------------------------ Form root hooks

/** True when the form has any (safe) theme token to apply. */
export function isThemed(theme: ThemeTokens | undefined): boolean {
  return Object.keys(resolveTheme(theme)).length > 0
}

/** The form root's class list: the framework's form class plus the theme hook. */
export function formRootClass(formClass: string, theme: ThemeTokens | undefined): string {
  return isThemed(theme) ? `${formClass} ${THEMED_CLASS}` : formClass
}

/** ` data-fg-theme="light"` when the theme defines its own colors, else ''. */
export function pinnedSchemeAttr(theme: ThemeTokens | undefined): string {
  return pinsLightScheme(resolveTheme(theme)) ? ' data-fg-theme="light"' : ''
}
