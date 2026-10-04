import type { CssFrameworkAdapter, Slot } from './types'

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
}

export const bootstrap5Adapter: CssFrameworkAdapter = {
  id: 'bootstrap5',
  label: 'Bootstrap 5',
  classes: (slot) => CLASSES[slot],
  cell: (span) => ({ class: `col-12 col-md-${span}` }),
  invalidClass: () => 'is-invalid',
  assets: () => ({
    links: ['https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css'],
    scripts: [],
  }),
  readmeNote: () =>
    'Markup uses Bootstrap 5 classes — the host project must include Bootstrap 5 CSS (npm package or CDN link).',
}
