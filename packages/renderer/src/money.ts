// Money (phase 45b): a `currency` field holds a number; the control shows it
// with the form locale's separators and reads back what people type. The
// same two routines are emitted into every runtime (export/money.ts), so a
// value formats and parses alike everywhere.
import type { ElementNode } from './schema'

export interface MoneySeparators {
  group: string
  decimal: string
}

const SEPARATORS: Record<string, MoneySeparators> = {
  en: { group: ',', decimal: '.' },
  ar: { group: ',', decimal: '.' },
  fr: { group: ' ', decimal: ',' },
  es: { group: '.', decimal: ',' },
  de: { group: '.', decimal: ',' },
}

/** The grouping and decimal separators for a locale (`fr-CA` → fr); English otherwise. */
export function moneySeparators(locale: string): MoneySeparators {
  const lang = locale.toLowerCase().split(/[-_]/)[0] ?? ''
  return SEPARATORS[lang] ?? SEPARATORS['en']!
}

/** props.decimals within 0..4; 2 by default. */
export function moneyDecimals(node: ElementNode): number {
  const raw = Math.round(Number(node.props['decimals']))
  return Number.isFinite(raw) ? Math.min(4, Math.max(0, raw)) : 2
}

/** props.currency as an upper-case three-letter code; USD by default. */
export function currencyCode(node: ElementNode): string {
  const raw = node.props['currency']
  return typeof raw === 'string' && /^[A-Za-z]{3}$/.test(raw.trim()) ? raw.trim().toUpperCase() : 'USD'
}

const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', INR: '₹', KRW: '₩', BRL: 'R$' }

/** The sign shown before the amount: a symbol for the common codes, else the code. */
export function currencySymbol(code: string): string {
  return SYMBOLS[code] ?? code
}

/** `1234.5` → `1,234.50` (en) / `1.234,50` (de); '' for anything but a finite number. */
export function formatMoney(value: unknown, locale: string, decimals: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ''
  const { group, decimal } = moneySeparators(locale)
  const [whole = '0', fraction = ''] = Math.abs(value).toFixed(decimals).split('.')
  let grouped = whole
  for (let i = whole.length - 3; i > 0; i -= 3) grouped = grouped.slice(0, i) + group + grouped.slice(i)
  return (value < 0 ? '-' : '') + grouped + (fraction ? decimal + fraction : '')
}

/**
 * What people type, read without knowing the locale: the last `.` or `,`
 * followed by one to `decimals` digits is the decimal mark, every other
 * separator and space groups digits; signs and currency marks are ignored.
 * Null when there are no digits. The result is rounded to `decimals`.
 */
export function parseMoney(text: string, decimals: number): number | null {
  const trimmed = text.trim()
  const negative = trimmed.startsWith('-')
  const digits = trimmed.replace(/[^\d.,]/g, '')
  if (!/\d/.test(digits)) return null
  const mark = Math.max(digits.lastIndexOf('.'), digits.lastIndexOf(','))
  const tail = mark === -1 ? '' : digits.slice(mark + 1)
  const isDecimal = mark !== -1 && decimals > 0 && tail.length >= 1 && tail.length <= decimals && /^\d+$/.test(tail)
  const whole = (isDecimal ? digits.slice(0, mark) : digits).replace(/[.,]/g, '')
  const scale = 10 ** decimals
  const amount = Math.round(Number(`${whole === '' ? '0' : whole}.${isDecimal ? tail : '0'}`) * scale) / scale
  return negative ? -amount : amount
}
