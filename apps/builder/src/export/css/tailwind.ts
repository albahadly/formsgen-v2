import { tailwindThemeCss } from './themeBridge'
import { swapClasses, type CssFrameworkAdapter, type Slot, type SlotMods } from './types'

// Polished with stock Tailwind, no plugin required (§7a).
const CLASSES: Record<Slot, string> = {
  // The form paints its own background (as vanilla does), so the dark scheme stays legible on a light host page.
  form: 'bg-white p-4 font-sans text-gray-900 dark:bg-gray-900 dark:text-gray-100',
  grid: 'grid grid-cols-12 gap-4',
  field: 'flex flex-col gap-1.5 [&>legend]:mb-1.5',
  label: 'text-sm font-semibold',
  required: 'ms-0.5 text-red-600',
  input:
    'w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800 [&::-webkit-datetime-edit-fields-wrapper]:p-0',
  textarea:
    'w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800',
  select:
    'w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800 [&:not([multiple])]:h-[2.375rem]',
  checkboxWrap: 'flex items-center gap-2',
  checkbox: 'h-4 w-4 rounded border-gray-300 accent-indigo-600',
  checkboxLabel: 'text-base',
  description: 'text-sm text-gray-500 dark:text-gray-400',
  error: 'text-sm text-red-600',
  group: 'rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50',
  groupLabel: 'px-1 text-sm font-semibold text-gray-500 dark:text-gray-400',
  actions: 'mt-4',
  submitButton:
    'rounded-md border border-transparent bg-indigo-600 px-4 py-1.5 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60',
  payload: 'mt-4 overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-green-300',
  options: 'flex flex-col gap-1.5',
  option: 'inline-flex items-center gap-2 text-base',
  range: 'h-6 w-full accent-indigo-600',
  heading: 'text-2xl font-semibold leading-tight',
  paragraph: 'text-base text-gray-600 dark:text-gray-300',
  // Preflight unstyles lists, tables and headings; the HTML block rules (shipped with the export) restore them.
  htmlBlock: 'fg-html text-base [&_a]:underline',
  richText: 'space-y-2',
  richBlock: '',
  richList: 'list-disc ps-5',
  richListOrdered: 'list-decimal ps-5',
  divider: 'my-1 border-t border-gray-200 dark:border-gray-700',
  tabList: 'mb-4 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700',
  tabButton:
    '-mb-px border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700',
  tabButtonActive:
    '-mb-px border-b-2 border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-600',
  stepList: 'mb-4 flex flex-wrap gap-4 text-sm text-gray-500',
  stepItem: 'flex items-center gap-2',
  stepItemActive: 'flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100',
  stepActions: 'mt-4 flex justify-between gap-2',
  buttonSecondary:
    'rounded-md border border-gray-300 px-4 py-1.5 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50',
  tagsWrap:
    'flex flex-wrap items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800',
  tag: 'inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700',
  tagRemove: 'text-gray-500 hover:text-red-600',
  tagsInput: 'min-w-24 flex-1 border-none bg-transparent py-0 text-base focus:outline-none',
  srOnly: 'sr-only',
  switchWrap: 'flex items-center gap-2',
  switch:
    "relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-gray-300 transition-colors before:absolute before:start-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:shadow before:transition-all before:content-[''] checked:bg-indigo-600 checked:before:start-[1.125rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 dark:bg-gray-600",
  optionsBlocks: 'flex flex-col gap-2',
  optionBlock:
    'flex cursor-pointer items-center gap-3 rounded-md border border-gray-300 px-3 py-2 text-base has-[:checked]:border-indigo-600 has-[:checked]:ring-1 has-[:checked]:ring-indigo-600 dark:border-gray-600',
  optionBlockInput: 'h-4 w-4 accent-indigo-600',
  optionsButtons: 'flex flex-wrap',
  optionButton:
    'relative -ms-px cursor-pointer border border-gray-300 px-4 py-2 text-sm font-semibold first:ms-0 first:rounded-s-md last:rounded-e-md has-[:checked]:z-10 has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-600 has-[:checked]:text-white has-[:focus-visible]:z-20 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-300 dark:border-gray-600',
  optionButtonInput: 'sr-only',
  image: 'block h-auto max-w-full rounded-md',
  link: 'font-medium text-indigo-600 underline underline-offset-2 dark:text-indigo-400',
  quote: 'border-s-4 border-gray-300 ps-4 dark:border-gray-600',
  quoteText: 'text-base italic',
  quoteCite: 'mt-1 text-sm text-gray-500 dark:text-gray-400',
  buttonDanger:
    'rounded-md border border-transparent bg-red-600 px-4 py-1.5 text-base font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300',
  repeaterItems: 'flex flex-col gap-4',
  repeaterItem: 'min-w-0 rounded-md border border-gray-300 p-4 dark:border-gray-600 data-[fg-drag]:opacity-50 data-[fg-drop=before]:shadow-[0_-3px_0_0_#4f46e5] data-[fg-drop=after]:shadow-[0_3px_0_0_#4f46e5]',
  repeaterItemLabel: 'px-1 text-sm font-semibold',
  repeaterItemActions: 'mt-2 flex items-center gap-2',
  repeaterRemove: 'ms-auto text-sm text-red-600 underline hover:text-red-700 dark:text-red-400',
  repeaterMove:
    'inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600',
  repeaterHandle: 'cursor-grab select-none px-1 text-xl leading-none text-gray-500 dark:text-gray-400',
  signature: 'flex flex-col gap-2',
  signaturePad: 'block w-full touch-none cursor-crosshair rounded-md border border-dashed border-gray-300 bg-white dark:border-gray-600',
  signatureRow: 'flex justify-end gap-2 [&>input]:min-w-0 [&>input]:flex-1',
  richtext: 'rounded-md border border-gray-300 bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800',
  richtextToolbar: 'flex flex-wrap gap-1 border-b border-gray-200 p-1 dark:border-gray-700',
  richtextButton: 'min-w-8 rounded-md border border-transparent px-2 py-1 text-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300',
  location: 'flex flex-col gap-2',
  locationMap: 'isolate z-0 w-full rounded-md border border-gray-300 dark:border-gray-600',
  locationRow: 'flex flex-wrap items-end gap-2',
  locationCoord: 'flex flex-[1_1_8rem] flex-col gap-1 text-sm text-gray-700 dark:text-gray-300',
  locationStatus: 'm-0 text-sm text-gray-600 empty:hidden dark:text-gray-400',
  captcha: 'mt-4 flex flex-col gap-1',
  captchaHint: 'm-0 text-sm text-gray-600 dark:text-gray-400',
  richtextEditor: 'min-h-24 px-3 py-2 text-base outline-none [overflow-wrap:anywhere] [&_ol]:list-decimal [&_ol]:ps-6 [&_ul]:list-disc [&_ul]:ps-6 [&_a]:text-indigo-600 [&_a]:underline [&_p]:mb-2',
  repeaterAdd:
    'mt-4 rounded-md border border-gray-300 px-4 py-1.5 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50',
  calculated:
    'w-full cursor-default rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-base tabular-nums shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800/50',
  fileDrop:
    'relative flex min-h-[4.5rem] items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500 hover:border-indigo-500 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-300 data-[fg-dragging]:border-indigo-500 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  fileDropText: 'font-medium',
  fileInput: 'absolute inset-0 h-full w-full cursor-pointer opacity-0',
  fileList: 'flex flex-col gap-1.5',
  fileItem:
    'flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800/50',
  fileThumb: 'h-10 w-10 rounded object-cover',
  fileName: 'min-w-0 flex-1 truncate',
  fileSize: 'text-sm text-gray-500 dark:text-gray-400',
  fileRemove: 'px-1.5 text-lg leading-none text-gray-500 hover:text-red-600',
  upload: 'mt-4 flex flex-col gap-1.5',
  progress: 'h-2 overflow-hidden rounded-full bg-gray-300 dark:bg-gray-600',
  progressBar: 'h-full rounded-full bg-indigo-600 transition-[width]',
  progressText: 'text-sm text-gray-500 dark:text-gray-400',
  pair: 'flex flex-wrap items-center gap-2 [&>input]:w-auto [&>input]:min-w-0 [&>input]:flex-[1_1_10rem]',
  chipList: 'mt-2 flex flex-wrap gap-1.5',
  matrixWrap: 'overflow-x-auto',
  matrix: 'w-full border-collapse text-sm',
  matrixColHead: 'px-2 py-2 text-center font-semibold leading-5 text-gray-500 dark:text-gray-400',
  matrixRowHead: 'px-2 py-2 text-start font-medium leading-5',
  matrixRow: 'border-t border-gray-200 dark:border-gray-700',
  matrixCell: 'px-2 py-2 text-center leading-5',
  matrixRadio: 'h-4 w-4 align-middle accent-indigo-600',
  phoneCountry:
    'w-auto min-w-0 max-w-[45%] shrink rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800',
  draft:
    'mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300',
  draftText: 'm-0 flex-[1_1_16rem]',
  draftClear: 'font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400',
  affixGroup:
    'flex [&>:not(:first-child)]:-ms-px [&>:not(:first-child)]:rounded-s-none [&>:not(:last-child)]:rounded-e-none',
  affix:
    'inline-flex items-center whitespace-nowrap rounded-md border border-gray-300 bg-gray-50 px-3 text-base text-gray-500 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  floating: 'relative',
  floatingLabel:
    'pointer-events-none absolute start-3 top-3.5 origin-[0] text-sm text-gray-500 transition-transform duration-150 peer-focus:-translate-y-2.5 peer-focus:scale-75 peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:scale-75 rtl:origin-[100%_0] dark:text-gray-400',
  floatingControl: 'peer pt-5 pb-1.5 placeholder-transparent focus:placeholder-gray-400',
  pairSeparator: '',
  pairButton:
    'shrink-0 whitespace-nowrap rounded-md border border-gray-300 px-4 py-1.5 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50',
  colorInput:
    'h-[2.375rem] w-12 cursor-pointer rounded-md border border-gray-300 bg-white p-1.5 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-800',
}

// Size and color are swapped in place: two padding or color utilities on
// one element resolve by stylesheet order, not attribute order.
const CONTROL_SIZE = {
  md: 'px-3 py-1.5 text-base',
  sm: 'px-2 py-1 text-sm',
  lg: 'px-4 py-2 text-xl leading-normal',
}
const TAGS_SIZE = { md: 'px-2 py-1.5', sm: 'px-1.5 py-1 text-sm', lg: 'px-3 py-2 text-xl' }
// A native select ignores line-height for its height; the class fixes it (38 / 31 / 48px).
const SELECT_HEIGHT = { md: '[&:not([multiple])]:h-[2.375rem]', sm: '[&:not([multiple])]:h-[1.9375rem]', lg: '[&:not([multiple])]:h-12' }
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

/** Heading sizes per level (the base string carries the h2 size). */
const HEADING_SIZE = { 1: 'text-3xl', 2: 'text-2xl', 3: 'text-xl', 4: 'text-lg', 5: 'text-base', 6: 'text-sm' }

function tailwindClasses(slot: Slot, mods?: SlotMods): string {
  let base = CLASSES[slot]
  if (slot === 'heading' && mods?.level) base = swapClasses(base, 'text-2xl', HEADING_SIZE[mods.level])
  if (mods?.size) {
    if (slot === 'select') {
      // Native selects take their height from the class (see SELECT_HEIGHT).
      return swapClasses(swapClasses(base, CONTROL_SIZE.md, CONTROL_SIZE[mods.size]), SELECT_HEIGHT.md, SELECT_HEIGHT[mods.size])
    }
    if (slot === 'input' || slot === 'textarea') {
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
  choiceLayout: () => 'wrap',
  invalidClass: () => 'border-red-500 focus:ring-red-200',
  stylesheet: (theme) => tailwindThemeCss(theme),
  assets: () => ({
    links: [],
    scripts: ['https://cdn.tailwindcss.com'],
  }),
  readmeNote: () =>
    'Markup uses Tailwind CSS utility classes — the host project must have Tailwind set up (any v3/v4 config; no plugin required). The optional @tailwindcss/forms plugin refines native control styling further.',
}
