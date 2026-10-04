// Form theme tokens (meta.theme) — CSS-variable values the renderer and
// every export target apply. Token values are written into generated CSS,
// so they are validated (no characters that could end a declaration or
// rule) and a few values are derived (readable text on the primary color).

import type { ThemeTokens } from './schema'

/** Built-in look; a theme overrides any subset of these. */
export const THEME_DEFAULTS: Readonly<Record<string, string>> = {
  'color-bg': '#ffffff',
  'color-surface': '#f8fafc',
  'color-text': '#0f172a',
  'color-muted': '#64748b',
  'color-border': '#cbd5e1',
  'color-primary': '#4f46e5',
  'color-primary-contrast': '#ffffff',
  'color-error': '#dc2626',
  'color-error-contrast': '#ffffff',
  radius: '6px',
  space: '1rem',
  font: 'system-ui, sans-serif',
}

export interface ThemePreset {
  id: string
  value: string
}

export const FONT_PRESETS: readonly ThemePreset[] = [
  { id: 'system', value: 'system-ui, sans-serif' },
  { id: 'sans', value: '"Helvetica Neue", Arial, sans-serif' },
  { id: 'serif', value: 'Georgia, "Times New Roman", serif' },
  { id: 'mono', value: 'ui-monospace, Menlo, Consolas, monospace' },
  { id: 'arabic', value: 'Tahoma, "Segoe UI", "Noto Sans Arabic", sans-serif' },
]

export const RADIUS_PRESETS: readonly ThemePreset[] = [
  { id: 'none', value: '0px' },
  { id: 'small', value: '4px' },
  { id: 'medium', value: '6px' },
  { id: 'large', value: '12px' },
]

export const SPACE_PRESETS: readonly ThemePreset[] = [
  { id: 'compact', value: '0.75rem' },
  { id: 'normal', value: '1rem' },
  { id: 'relaxed', value: '1.5rem' },
]

/** The color tokens a palette sets (the contrast color is derived). */
export const THEME_COLOR_TOKENS = [
  'color-primary',
  'color-text',
  'color-bg',
  'color-surface',
  'color-muted',
  'color-border',
  'color-error',
] as const

export interface ThemePalette {
  id: string
  colors: Record<(typeof THEME_COLOR_TOKENS)[number], string>
}

/**
 * One-click color palettes. Each keeps text, muted text, primary and error
 * readable (≥ 4.5:1) on both its background and its surface color.
 */
export const THEME_PALETTES: readonly ThemePalette[] = [
  {
    id: 'ocean',
    colors: {
      'color-primary': '#0369a1',
      'color-text': '#0c1f2e',
      'color-bg': '#f0f9ff',
      'color-surface': '#e0f2fe',
      'color-muted': '#3b5a70',
      'color-border': '#93c5e4',
      'color-error': '#b91c1c',
    },
  },
  {
    id: 'forest',
    colors: {
      'color-primary': '#166534',
      'color-text': '#14231a',
      'color-bg': '#f6fbf4',
      'color-surface': '#e8f3e4',
      'color-muted': '#4a5d50',
      'color-border': '#a9c9a4',
      'color-error': '#b91c1c',
    },
  },
  {
    id: 'sunset',
    colors: {
      'color-primary': '#c2410c',
      'color-text': '#2a1a12',
      'color-bg': '#fff8f1',
      'color-surface': '#ffedd5',
      'color-muted': '#6b4f3f',
      'color-border': '#f0bf94',
      'color-error': '#be123c',
    },
  },
  {
    id: 'rose',
    colors: {
      'color-primary': '#be185d',
      'color-text': '#2b1220',
      'color-bg': '#fff5f8',
      'color-surface': '#fce7f0',
      'color-muted': '#6e4a5a',
      'color-border': '#f0b3cb',
      'color-error': '#b91c1c',
    },
  },
  {
    id: 'graphite',
    colors: {
      'color-primary': '#334155',
      'color-text': '#0f172a',
      'color-bg': '#ffffff',
      'color-surface': '#f1f5f9',
      'color-muted': '#475569',
      'color-border': '#94a3b8',
      'color-error': '#b91c1c',
    },
  },
  {
    id: 'midnight',
    colors: {
      'color-primary': '#818cf8',
      'color-text': '#e2e8f0',
      'color-bg': '#0f172a',
      'color-surface': '#1e293b',
      'color-muted': '#94a3b8',
      'color-border': '#475569',
      'color-error': '#f87171',
    },
  },
]

export const THEME_TOKEN_PATTERN = /^[a-z][a-z0-9-]*$/

/**
 * A theme value that cannot end a CSS declaration/rule or reach markup:
 * no ; { } < > \ @ ` or line breaks anywhere (even inside quotes — `</style>`
 * in a string would still close an HTML style element), balanced quotes.
 */
export function isSafeThemeValue(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[^;{}<>\\@\n\r`]{1,120}$/.test(value) &&
    (value.match(/"/g)?.length ?? 0) % 2 === 0 &&
    (value.match(/'/g)?.length ?? 0) % 2 === 0
  )
}

/** [r, g, b] for #rgb / #rrggbb, else null. */
export function parseHexColor(value: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())?.[1]
  if (!hex) return null
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`
}

/** Darkens a hex color by `amount` (0–1); other formats pass through. */
export function shadeColor(value: string, amount: number): string {
  const rgb = parseHexColor(value)
  return rgb ? toHex(rgb.map((c) => c * (1 - amount)) as [number, number, number]) : value
}

function luminance(color: string): number | null {
  const rgb = parseHexColor(color)
  if (!rgb) return null
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Black or white text, whichever reads better on `background` (WCAG). */
export function readableTextOn(background: string): '#ffffff' | '#111827' {
  const l = luminance(background)
  if (l === null) return '#ffffff'
  // contrast vs white: 1.05/(L+0.05); vs near-black (#111827, L≈0.009): (L+0.05)/0.059
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.059 ? '#ffffff' : '#111827'
}

/**
 * The theme as applied: only safe tokens, plus derived values — a primary
 * color without an explicit contrast color gets readable text.
 */
export function resolveTheme(theme: ThemeTokens | undefined): ThemeTokens {
  const resolved: ThemeTokens = {}
  for (const [token, value] of Object.entries(theme ?? {})) {
    if (THEME_TOKEN_PATTERN.test(token) && isSafeThemeValue(value)) resolved[token] = value
  }
  const primary = resolved['color-primary']
  if (primary && !resolved['color-primary-contrast']) {
    resolved['color-primary-contrast'] = readableTextOn(primary)
  }
  const error = resolved['color-error']
  if (error && !resolved['color-error-contrast']) {
    resolved['color-error-contrast'] = readableTextOn(error)
  }
  return resolved
}

/** WCAG contrast ratio between two hex colors (1–21), or null. */
export function contrastRatio(a: string, b: string): number | null {
  const la = luminance(a)
  const lb = luminance(b)
  if (la === null || lb === null) return null
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * The color scheme a custom background implies — native controls (select
 * arrows, date pickers, scrollbars) follow it. Undefined without a hex bg.
 */
export function themeColorScheme(theme: ThemeTokens | undefined): 'light' | 'dark' | undefined {
  const bg = resolveTheme(theme)['color-bg']
  if (!bg || !parseHexColor(bg)) return undefined
  return readableTextOn(bg) === '#ffffff' ? 'dark' : 'light'
}

/** The resolved theme as `--fg-*` custom properties (for a style binding). */
export function themeCssVariables(theme: ThemeTokens | undefined): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [token, value] of Object.entries(resolveTheme(theme))) vars[`--fg-${token}`] = value
  return vars
}

/** Inline style for a themed form root: the variables plus its color scheme. */
export function themeInlineStyle(theme: ThemeTokens | undefined): Record<string, string> {
  const scheme = themeColorScheme(theme)
  return scheme ? { ...themeCssVariables(theme), 'color-scheme': scheme } : themeCssVariables(theme)
}

/**
 * A custom background or text color defines its own color scheme, so the
 * automatic dark mode must not flip the colors the author did not set.
 */
export function pinsLightScheme(theme: ThemeTokens | undefined): boolean {
  return Boolean(theme?.['color-bg'] || theme?.['color-text'])
}

/** Value of a token, falling back to the built-in default. */
export function themeValue(theme: ThemeTokens, token: string): string {
  return theme[token] ?? THEME_DEFAULTS[token] ?? ''
}
