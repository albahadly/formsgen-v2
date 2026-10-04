import { swapClasses, type CssFrameworkAdapter, type Slot, type SlotMods } from './types'

// Proper Bootstrap 5 idioms, not renamed vanilla classes (§7a).
const CLASSES: Record<Slot, string> = {
  form: 'container py-4',
  grid: 'row g-3',
  field: 'd-flex flex-column gap-1',
  label: 'form-label fw-semibold mb-0',
  required: 'text-danger ms-1',
  input: 'form-control',
  textarea: 'form-control',
  select: 'form-select',
  checkboxWrap: 'form-check',
  checkbox: 'form-check-input',
  checkboxLabel: 'form-check-label',
  description: 'form-text mt-0',
  error: 'invalid-feedback d-block mt-0',
  group: 'border rounded p-3 bg-body-tertiary',
  groupLabel: 'fw-semibold text-secondary small px-1',
  actions: 'mt-3',
  submitButton: 'btn btn-primary',
  payload: 'mt-3 p-3 bg-dark text-success rounded small overflow-auto',
  options: 'd-flex flex-column gap-1',
  option: 'form-check',
  range: 'form-range',
  heading: 'fw-semibold',
  paragraph: 'text-secondary',
  divider: 'border-top',
  tabList: 'nav nav-tabs mb-3',
  tabButton: 'nav-link',
  tabButtonActive: 'nav-link active',
  stepList: 'nav mb-3 gap-3 small text-secondary list-unstyled d-flex flex-wrap',
  stepItem: 'd-inline-flex align-items-center gap-2',
  stepItemActive: 'd-inline-flex align-items-center gap-2 fw-semibold text-body',
  stepActions: 'mt-3 d-flex justify-content-between gap-2',
  buttonSecondary: 'btn btn-outline-secondary',
  tagsWrap: 'form-control d-flex flex-wrap align-items-center gap-1',
  tag: 'badge rounded-pill text-bg-secondary d-inline-flex align-items-center gap-1',
  tagRemove: 'border-0 bg-transparent p-0 ms-1 text-white',
  tagsInput: 'border-0 p-0 flex-grow-1 shadow-none',
  srOnly: 'visually-hidden',
}

// Bootstrap's own size modifiers are designed to be appended.
const SIZE_CLASS: Partial<Record<Slot, (size: 'sm' | 'lg') => string>> = {
  input: (size) => `form-control-${size}`,
  textarea: (size) => `form-control-${size}`,
  select: (size) => `form-select-${size}`,
  tagsWrap: (size) => `form-control-${size}`,
}

const TONE_TEXT = { muted: 'text-body-secondary', primary: 'text-primary', danger: 'text-danger' }
const TONE_BORDER = { muted: 'border-secondary-subtle', primary: 'border-primary', danger: 'border-danger' }

function bootstrapClasses(slot: Slot, mods?: SlotMods): string {
  const base = CLASSES[slot]
  const sized = mods?.size ? SIZE_CLASS[slot]?.(mods.size) : undefined
  if (sized) return `${base} ${sized}`
  if (mods?.tone) {
    // Color utilities are !important — replace the base color, never stack two.
    if (slot === 'heading') return `${base} ${TONE_TEXT[mods.tone]}`
    if (slot === 'paragraph') return swapClasses(base, 'text-secondary', TONE_TEXT[mods.tone])
    // <hr> is drawn at opacity .25 by Bootstrap; a chosen color must show fully.
    if (slot === 'divider') return `${base} ${TONE_BORDER[mods.tone]} opacity-100`
  }
  return base
}

export const bootstrap5Adapter: CssFrameworkAdapter = {
  id: 'bootstrap5',
  label: 'Bootstrap 5',
  classes: bootstrapClasses,
  alignClass: (align) => `text-${align}`,
  cell: (span) => ({ class: `col-12 col-md-${span}` }),
  invalidClass: () => 'is-invalid',
  assets: () => ({
    links: ['https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css'],
    scripts: [],
  }),
  readmeNote: () =>
    'Markup uses Bootstrap 5 classes — the host project must include Bootstrap 5 CSS (npm package or CDN link).',
}
