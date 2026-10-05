import { bootstrapThemeCss } from './themeBridge'
import { swapClasses, type CssFrameworkAdapter, type Slot, type SlotMods } from './types'

// Proper Bootstrap 5 idioms, not renamed vanilla classes (§7a).
const CLASSES: Record<Slot, string> = {
  form: 'container py-4',
  grid: 'row g-3',
  field: 'd-flex flex-column gap-1',
  label: 'form-label fw-semibold fs-6 mb-0',
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
  tagsInput: 'border-0 p-0 flex-grow-1 shadow-none bg-transparent',
  srOnly: 'visually-hidden',
  switchWrap: 'form-check form-switch',
  switch: 'form-check-input',
  optionsBlocks: 'd-grid gap-2',
  optionBlock: 'btn btn-outline-primary text-start',
  optionBlockInput: 'btn-check',
  optionsButtons: 'btn-group flex-wrap',
  optionButton: 'btn btn-outline-primary',
  optionButtonInput: 'btn-check',
  image: 'img-fluid rounded',
  link: 'link-primary',
  quote: 'mb-0',
  quoteText: 'blockquote',
  quoteCite: 'blockquote-footer mb-0',
  buttonDanger: 'btn btn-danger',
  colorInput: 'form-control form-control-color',
  repeaterItems: 'd-flex flex-column gap-3',
  repeaterItem: 'border rounded p-3',
  repeaterItemLabel: 'float-none w-auto px-1 fs-6 fw-semibold mb-0',
  repeaterItemActions: 'mt-2 d-flex justify-content-end',
  repeaterRemove: 'btn btn-link link-danger p-0',
  repeaterAdd: 'btn btn-outline-secondary mt-3',
  fileInput: 'form-control',
  fileList: 'list-group mt-2',
  fileItem: 'list-group-item d-flex align-items-center gap-2',
  fileThumb: 'rounded object-fit-cover',
  fileName: 'flex-grow-1 text-truncate',
  fileSize: 'text-body-secondary small',
  fileRemove: 'btn btn-sm btn-link link-danger p-0 text-decoration-none fs-5 lh-1',
  pair: 'd-flex align-items-center gap-2',
  chipList: 'd-flex flex-wrap gap-1 mt-2',
  pairButton: 'btn btn-outline-secondary flex-shrink-0 text-nowrap',
  matrixWrap: 'table-responsive',
  matrix: 'table table-sm table-striped align-middle mb-0',
  matrixColHead: 'text-center fw-semibold text-body-secondary',
  matrixRowHead: 'text-start fw-medium',
  matrixRow: '',
  matrixCell: 'text-center',
  matrixRadio: 'form-check-input',
  phoneCountry: 'form-select w-auto flex-shrink-0',
  affixGroup: 'input-group',
  affix: 'input-group-text',
  floating: 'form-floating',
  floatingLabel: '',
  floatingControl: '',
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
  cell: ({ sm, md, lg }) => ({ class: `col-${sm} col-md-${md}${lg !== md ? ` col-lg-${lg}` : ''}` }),
  choiceLayout: 'sibling',
  invalidClass: () => 'is-invalid',
  stylesheet: (theme) => bootstrapThemeCss(theme),
  // Bootstrap mirrors its components only in its RTL build.
  assets: (dir) => ({
    links: [
      `https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap${dir === 'rtl' ? '.rtl' : ''}.min.css`,
    ],
    scripts: [],
  }),
  readmeNote: () =>
    'Markup uses Bootstrap 5 classes — the host project must include Bootstrap 5 CSS (npm package or CDN link; for right-to-left forms, its RTL build `bootstrap.rtl.min.css`).',
}
