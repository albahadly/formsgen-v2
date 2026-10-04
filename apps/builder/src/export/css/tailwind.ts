import { swapClasses, type CssFrameworkAdapter, type Slot, type SlotMods } from './types'

// Polished with stock Tailwind, no plugin required (§7a).
const CLASSES: Record<Slot, string> = {
  form: 'mx-auto max-w-2xl p-6 font-sans text-gray-900 dark:text-gray-100',
  grid: 'grid grid-cols-12 gap-4',
  field: 'flex flex-col gap-1.5',
  label: 'text-sm font-semibold',
  required: 'ms-0.5 text-red-600',
  input:
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800',
  textarea:
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800',
  select:
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800',
  checkboxWrap: 'flex items-center gap-2',
  checkbox: 'h-4 w-4 rounded border-gray-300 accent-indigo-600',
  checkboxLabel: 'inline-flex items-center gap-2 text-sm',
  description: 'text-xs text-gray-500 dark:text-gray-400',
  error: 'text-xs text-red-600',
  group: 'rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50',
  groupLabel: 'px-1 text-sm font-semibold text-gray-500 dark:text-gray-400',
  actions: 'mt-4',
  submitButton:
    'rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300',
  payload: 'mt-4 overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-green-300',
  options: 'flex flex-col gap-1.5',
  option: 'inline-flex items-center gap-2 text-sm',
  range: 'w-full accent-indigo-600',
  heading: 'font-semibold',
  paragraph: 'text-sm text-gray-600 dark:text-gray-300',
  divider: 'border-t border-gray-200 dark:border-gray-700',
  tabList: 'mb-4 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700',
  tabButton:
    '-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700',
  tabButtonActive:
    '-mb-px border-b-2 border-indigo-600 px-3 py-2 text-sm font-semibold text-indigo-600',
  stepList: 'mb-4 flex flex-wrap gap-4 text-sm text-gray-500',
  stepItem: 'flex items-center gap-2',
  stepItemActive: 'flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100',
  stepActions: 'mt-4 flex justify-between gap-2',
  buttonSecondary:
    'rounded-md border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50',
  tagsWrap:
    'flex flex-wrap items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800',
  tag: 'inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700',
  tagRemove: 'text-gray-500 hover:text-red-600',
  tagsInput: 'min-w-24 flex-1 border-none bg-transparent text-sm focus:outline-none',
  srOnly: 'sr-only',
}

// Size and color are swapped in place: two padding or color utilities on
// one element resolve by stylesheet order, not attribute order.
const CONTROL_SIZE = {
  md: 'px-3 py-2 text-sm',
  sm: 'px-2 py-1 text-xs',
  lg: 'px-4 py-3 text-base',
}
const TAGS_SIZE = { md: 'px-2 py-1.5', sm: 'px-1.5 py-1 text-xs', lg: 'px-3 py-2 text-base' }
const TONE_TEXT = {
  muted: 'text-gray-500 dark:text-gray-400',
  primary: 'text-indigo-600 dark:text-indigo-400',
  danger: 'text-red-600 dark:text-red-400',
}
const TONE_BORDER = {
  muted: 'border-gray-300 dark:border-gray-600',
  primary: 'border-indigo-500',
  danger: 'border-red-500',
}

function tailwindClasses(slot: Slot, mods?: SlotMods): string {
  const base = CLASSES[slot]
  if (mods?.size) {
    if (slot === 'input' || slot === 'textarea' || slot === 'select') {
      return swapClasses(base, CONTROL_SIZE.md, CONTROL_SIZE[mods.size])
    }
    if (slot === 'tagsWrap') return swapClasses(base, TAGS_SIZE.md, TAGS_SIZE[mods.size])
  }
  if (mods?.tone) {
    if (slot === 'heading') return `${base} ${TONE_TEXT[mods.tone]}`
    if (slot === 'paragraph') {
      return swapClasses(base, 'text-gray-600 dark:text-gray-300', TONE_TEXT[mods.tone])
    }
    if (slot === 'divider') {
      return swapClasses(base, 'border-gray-200 dark:border-gray-700', TONE_BORDER[mods.tone])
    }
  }
  return base
}

export const tailwindAdapter: CssFrameworkAdapter = {
  id: 'tailwind',
  label: 'Tailwind CSS',
  classes: tailwindClasses,
  alignClass: (align) => `text-${align}`,
  cell: (span) => ({ class: `col-span-12 md:col-span-${span}` }),
  invalidClass: () => 'border-red-500 focus:ring-red-200',
  assets: () => ({
    links: [],
    scripts: ['https://cdn.tailwindcss.com'],
  }),
  readmeNote: () =>
    'Markup uses Tailwind CSS utility classes — the host project must have Tailwind set up (any v3/v4 config; no plugin required). The optional @tailwindcss/forms plugin refines native control styling further.',
}
