import { tailwindThemeCss } from './themeBridge'
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
  switchWrap: 'flex items-center gap-2',
  switch:
    "relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-gray-300 transition-colors before:absolute before:start-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:shadow before:transition-all before:content-[''] checked:bg-indigo-600 checked:before:start-[1.125rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 dark:bg-gray-600",
  optionsBlocks: 'flex flex-col gap-2',
  optionBlock:
    'flex cursor-pointer items-center gap-3 rounded-md border border-gray-300 px-3 py-2 text-sm has-[:checked]:border-indigo-600 has-[:checked]:ring-1 has-[:checked]:ring-indigo-600 dark:border-gray-600',
  optionBlockInput: 'h-4 w-4 accent-indigo-600',
  optionsButtons: 'flex flex-wrap',
  optionButton:
    'relative -ms-px cursor-pointer border border-gray-300 px-4 py-2 text-sm font-semibold first:ms-0 first:rounded-s-md last:rounded-e-md has-[:checked]:z-10 has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-600 has-[:checked]:text-white has-[:focus-visible]:z-20 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-300 dark:border-gray-600',
  optionButtonInput: 'sr-only',
  image: 'block h-auto max-w-full rounded-md',
  link: 'font-medium text-indigo-600 underline underline-offset-2 dark:text-indigo-400',
  quote: 'border-s-4 border-gray-300 ps-4 dark:border-gray-600',
  quoteText: 'text-base italic',
  quoteCite: 'mt-1.5 text-sm text-gray-500 dark:text-gray-400',
  buttonDanger:
    'rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300',
  repeaterItems: 'flex flex-col gap-4',
  repeaterItem: 'min-w-0 rounded-lg border border-gray-300 p-4 dark:border-gray-600',
  repeaterItemLabel: 'px-1 text-sm font-semibold',
  repeaterItemActions: 'mt-3 flex items-center gap-2',
  repeaterRemove: 'ms-auto text-sm text-red-600 underline hover:text-red-700 dark:text-red-400',
  repeaterMove:
    'inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600',
  repeaterAdd:
    'mt-4 rounded-md border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50',
  fileInput:
    'block w-full text-sm file:me-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white',
  fileList: 'flex flex-col gap-1.5',
  fileItem:
    'flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800/50',
  fileThumb: 'h-10 w-10 rounded object-cover',
  fileName: 'min-w-0 flex-1 truncate',
  fileSize: 'text-xs text-gray-500 dark:text-gray-400',
  fileRemove: 'px-1.5 text-lg leading-none text-gray-500 hover:text-red-600',
  pair: 'flex items-center gap-2 [&>*]:min-w-0',
  chipList: 'mt-2 flex flex-wrap gap-1.5',
  matrixWrap: 'overflow-x-auto',
  matrix: 'w-full border-collapse text-sm',
  matrixColHead: 'px-2 py-2 text-center font-semibold text-gray-500 dark:text-gray-400',
  matrixRowHead: 'px-2 py-2 text-start font-medium',
  matrixRow: 'border-t border-gray-200 dark:border-gray-700',
  matrixCell: 'px-2 py-2 text-center',
  matrixRadio: 'h-4 w-4 accent-indigo-600',
  phoneCountry:
    'w-auto min-w-0 max-w-[45%] shrink rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800',
  affixGroup:
    'flex [&>:not(:first-child)]:-ms-px [&>:not(:first-child)]:rounded-s-none [&>:not(:last-child)]:rounded-e-none',
  affix:
    'inline-flex items-center whitespace-nowrap rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  floating: 'relative',
  floatingLabel:
    'pointer-events-none absolute start-3 top-3.5 origin-[0] text-sm text-gray-500 transition-transform duration-150 peer-focus:-translate-y-2.5 peer-focus:scale-75 peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:scale-75 rtl:origin-[100%_0] dark:text-gray-400',
  floatingControl: 'peer pt-5 pb-1.5 placeholder-transparent focus:placeholder-gray-400',
  pairSeparator: '',
  pairButton:
    'shrink-0 whitespace-nowrap rounded-md border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50',
  colorInput:
    'h-10 w-16 cursor-pointer rounded-md border border-gray-300 bg-white p-1 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800',
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
  cell: ({ sm, md, lg }) => ({ class: `col-span-${sm} md:col-span-${md}${lg !== md ? ` lg:col-span-${lg}` : ''}` }),
  choiceLayout: 'wrap',
  invalidClass: () => 'border-red-500 focus:ring-red-200',
  stylesheet: (theme) => tailwindThemeCss(theme),
  assets: () => ({
    links: [],
    scripts: ['https://cdn.tailwindcss.com'],
  }),
  readmeNote: () =>
    'Markup uses Tailwind CSS utility classes — the host project must have Tailwind set up (any v3/v4 config; no plugin required). The optional @tailwindcss/forms plugin refines native control styling further.',
}
