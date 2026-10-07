import { bootstrapThemeCss } from './themeBridge'
import { swapClasses, type CssFrameworkAdapter, type Slot, type SlotMods } from './types'

// Proper Bootstrap 5 idioms, not renamed vanilla classes (§7a).
const CLASSES: Record<Slot, string> = {
  // Fills its host like the other flavours: 1rem padding, and the row's negative gutter margins put the controls where the other flavours put them.
  form: 'p-3',
  grid: 'row g-3',
  field: 'd-flex flex-column fg-field',
  label: 'form-label fw-semibold small mb-0 fg-label',
  required: 'text-danger fg-required',
  input: 'form-control',
  textarea: 'form-control',
  select: 'form-select',
  checkboxWrap: 'form-check mb-0',
  checkbox: 'form-check-input',
  checkboxLabel: 'form-check-label',
  description: 'form-text mt-0 mb-0 fg-description',
  error: 'invalid-feedback d-block mt-0 mb-0 fg-error',
  group: 'border rounded p-3 bg-body-tertiary',
  groupLabel: 'float-none w-auto px-1 small fw-semibold text-secondary mb-0 fg-label',
  actions: 'mt-3',
  submitButton: 'btn btn-primary fw-semibold px-3',
  payload: 'mt-3 p-3 bg-dark text-success rounded small overflow-auto',
  options: 'd-flex flex-column fg-options',
  option: 'form-check mb-0',
  range: 'form-range',
  heading: 'fg-heading',
  paragraph: 'text-secondary mb-0',
  htmlBlock: 'fg-html',
  richText: 'fg-rich-text',
  richBlock: '',
  richList: '',
  richListOrdered: '',
  divider: 'border-top my-1',
  tabList: 'nav nav-underline gap-1 border-bottom mb-3 fg-tab-list',
  tabButton: 'nav-link fw-semibold px-3 py-2',
  tabButtonActive: 'nav-link active fw-semibold px-3 py-2',
  stepList: 'nav mb-3 gap-3 small text-secondary list-unstyled d-flex flex-wrap',
  stepItem: 'd-inline-flex align-items-center gap-2',
  stepItemActive: 'd-inline-flex align-items-center gap-2 fw-semibold text-body',
  stepActions: 'mt-3 d-flex justify-content-between gap-2',
  buttonSecondary: 'btn btn-outline-secondary fw-semibold px-3',
  tagsWrap: 'form-control d-flex flex-wrap align-items-center gap-1 px-2',
  tag: 'badge rounded-pill text-bg-secondary d-inline-flex align-items-center gap-1',
  tagRemove: 'border-0 bg-transparent p-0 ms-1 text-white',
  tagsInput: 'border-0 p-0 flex-grow-1 shadow-none bg-transparent',
  srOnly: 'visually-hidden',
  switchWrap: 'form-check form-switch mb-0 fg-switch-wrap',
  switch: 'form-check-input fg-switch',
  optionsBlocks: 'd-flex flex-column gap-2',
  optionBlock: 'fg-option-block d-flex align-items-center border rounded py-2 mb-0 bg-body',
  optionBlockInput: 'form-check-input m-0 flex-shrink-0',
  optionsButtons: 'btn-group flex-wrap align-self-start',
  optionButton: 'btn btn-outline-primary fg-option-button',
  optionButtonInput: 'btn-check',
  image: 'img-fluid rounded',
  link: 'link-primary',
  quote: 'mb-0 border-start border-4 ps-3',
  quoteText: 'blockquote fs-6 fst-italic mb-0',
  quoteCite: 'small text-body-secondary mt-1 mb-0',
  buttonDanger: 'btn btn-danger fw-semibold px-3',
  colorInput: 'form-control form-control-color',
  repeaterItems: 'd-flex flex-column gap-3',
  repeaterItem: 'border rounded p-3',
  repeaterItemLabel: 'float-none w-auto px-1 small fw-semibold mb-0 fg-label',
  repeaterItemActions: 'mt-2 d-flex align-items-center gap-2',
  repeaterRemove: 'btn btn-link link-danger p-0 ms-auto fg-repeater-remove',
  repeaterMove: 'btn btn-outline-secondary fg-repeater-move',
  repeaterHandle: 'px-1 fs-5 lh-1 text-body-secondary user-select-none fg-repeater-handle',
  signature: 'd-flex flex-column gap-2',
  signaturePad: 'fg-signature-pad d-block w-100 border rounded bg-white',
  signatureRow: 'd-flex justify-content-end gap-2',
  richtext: 'border rounded bg-body',
  richtextToolbar: 'd-flex flex-wrap gap-1 border-bottom p-1',
  richtextButton: 'btn btn-sm btn-light fg-richtext-button',
  richtextEditor: 'fg-richtext-editor',
  location: 'd-flex flex-column gap-2',
  locationMap: 'fg-location-map w-100 border rounded',
  locationRow: 'd-flex flex-wrap align-items-end gap-2',
  locationCoord: 'fg-location-coord d-flex flex-column gap-1 small',
  locationStatus: 'fg-location-status small mb-0',
  captcha: 'mt-3 d-flex flex-column gap-1',
  captchaHint: 'small text-body-secondary mb-0',
  repeaterAdd: 'btn btn-outline-secondary fw-semibold px-3 mt-3',
  // The (transparent) input covers the zone; see BOOTSTRAP_UPLOAD_CSS.
  calculated: 'form-control bg-body-tertiary',
  fileDrop:
    'fg-file-drop position-relative d-flex align-items-center justify-content-center border border-2 rounded p-4 text-center small text-body-secondary bg-body-tertiary',
  fileDropText: 'fw-medium',
  fileInput: 'position-absolute top-0 start-0 w-100 h-100 opacity-0',
  fileList: 'list-group mt-2',
  fileItem: 'list-group-item d-flex align-items-center gap-2',
  fileThumb: 'rounded object-fit-cover',
  fileName: 'flex-grow-1 text-truncate',
  fileSize: 'text-body-secondary small',
  fileRemove: 'btn btn-sm btn-link link-danger p-0 text-decoration-none fs-5 lh-1',
  upload: 'mt-3 d-flex flex-column gap-1',
  progress: 'progress',
  progressBar: 'progress-bar',
  progressText: 'small text-body-secondary mb-0',
  pair: 'd-flex flex-wrap align-items-center gap-2 fg-pair',
  chipList: 'd-flex flex-wrap gap-1 mt-2',
  pairButton: 'btn btn-outline-secondary fw-semibold px-3 flex-shrink-0 text-nowrap',
  pairSeparator: '',
  matrixWrap: 'table-responsive',
  matrix: 'table table-borderless table-striped align-middle small mb-0 fg-matrix',
  matrixColHead: 'text-center fw-semibold text-body-secondary',
  matrixRowHead: 'text-start fw-medium',
  matrixRow: '',
  matrixCell: 'text-center',
  matrixRadio: 'form-check-input',
  phoneCountry: 'form-select flex-grow-0 w-50',
  draft: 'alert alert-secondary d-flex flex-wrap align-items-center column-gap-3 row-gap-1 py-2 small',
  draftText: 'mb-0 flex-grow-1',
  draftClear: 'btn btn-link btn-sm p-0',
  affixGroup: 'input-group',
  affix: 'input-group-text',
  floating: 'form-floating',
  floatingLabel: '',
  floatingControl: '',
}

// Bootstrap's own size modifiers are designed to be appended.
const SIZE_CLASS: Partial<Record<Slot, (size: 'sm' | 'lg') => string>> = {
  // `rounded` keeps the one radius: Bootstrap's size variants change it.
  input: (size) => `form-control-${size} rounded`,
  textarea: (size) => `form-control-${size} rounded`,
  select: (size) => `form-select-${size} rounded`,
  tagsWrap: (size) => `form-control-${size} rounded`,
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
  // Buttons need Bootstrap's .btn-check + .btn siblings; blocks are rows with a visible check.
  choiceLayout: (display) => (display === 'buttons' ? 'sibling' : 'wrap'),
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
