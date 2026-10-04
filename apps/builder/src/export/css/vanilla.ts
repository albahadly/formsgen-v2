import type { ThemeTokens } from '@formsgen/renderer'
import type { CssFrameworkAdapter, Slot } from './types'

const CLASSES: Record<Slot, string> = {
  form: 'fg-form',
  grid: 'fg-grid',
  field: 'fg-field',
  label: 'fg-label',
  required: 'fg-required',
  input: 'fg-input',
  textarea: 'fg-textarea',
  select: 'fg-select',
  checkboxWrap: 'fg-checkbox-row',
  checkbox: 'fg-checkbox',
  checkboxLabel: 'fg-checkbox-label',
  description: 'fg-description',
  error: 'fg-error',
  group: 'fg-group',
  groupLabel: 'fg-group-label',
  actions: 'fg-actions',
  submitButton: 'fg-button fg-button--primary',
  payload: 'fg-payload',
}

/** Mirrors packages/renderer/src/styles.css for self-contained artifacts. */
function baseStylesheet(theme: ThemeTokens = {}): string {
  const overrides = Object.entries(theme)
    .map(([token, value]) => `  --fg-${token}: ${value};`)
    .join('\n')
  return `.fg-form {
  --fg-color-bg: #ffffff;
  --fg-color-surface: #f8fafc;
  --fg-color-text: #0f172a;
  --fg-color-muted: #64748b;
  --fg-color-border: #cbd5e1;
  --fg-color-primary: #4f46e5;
  --fg-color-primary-contrast: #ffffff;
  --fg-color-error: #dc2626;
  --fg-radius: 6px;
  --fg-space: 1rem;
  --fg-font: system-ui, sans-serif;
${overrides ? `${overrides}\n` : ''}  font-family: var(--fg-font);
  color: var(--fg-color-text);
  background: var(--fg-color-bg);
  padding: var(--fg-space);
}
.fg-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: var(--fg-space); }
.fg-cell { min-inline-size: 0; }
.fg-field { display: flex; flex-direction: column; gap: 0.375rem; }
.fg-label { font-size: 0.875rem; font-weight: 600; }
.fg-required { color: var(--fg-color-error); margin-inline-start: 0.125rem; }
.fg-input, .fg-textarea, .fg-select {
  inline-size: 100%; box-sizing: border-box; padding: 0.5rem 0.75rem; font: inherit;
  color: inherit; background: var(--fg-color-bg);
  border: 1px solid var(--fg-color-border); border-radius: var(--fg-radius);
}
.fg-input:focus-visible, .fg-textarea:focus-visible, .fg-select:focus-visible {
  outline: 2px solid var(--fg-color-primary); outline-offset: 1px; border-color: var(--fg-color-primary);
}
.fg-invalid { border-color: var(--fg-color-error); }
.fg-checkbox-row { display: inline-flex; align-items: center; gap: 0.5rem; }
.fg-checkbox-label { font-size: 0.9375rem; }
.fg-checkbox { inline-size: 1rem; block-size: 1rem; accent-color: var(--fg-color-primary); }
.fg-description { margin: 0; font-size: 0.8125rem; color: var(--fg-color-muted); }
.fg-error { margin: 0; font-size: 0.8125rem; color: var(--fg-color-error); }
.fg-group { margin: 0; padding: var(--fg-space); border: 1px solid var(--fg-color-border); border-radius: var(--fg-radius); background: var(--fg-color-surface); }
.fg-group-label { padding-inline: 0.375rem; font-size: 0.875rem; font-weight: 600; color: var(--fg-color-muted); }
.fg-actions { margin-block-start: var(--fg-space); }
.fg-button { padding: 0.5rem 1.25rem; font: inherit; font-weight: 600; border: 1px solid transparent; border-radius: var(--fg-radius); cursor: pointer; }
.fg-button--primary { background: var(--fg-color-primary); color: var(--fg-color-primary-contrast); }
.fg-payload { margin-block-start: var(--fg-space); padding: var(--fg-space); background: #0f172a; color: #86efac; border-radius: var(--fg-radius); font-size: 0.8125rem; overflow-x: auto; }
@media (prefers-color-scheme: dark) {
  .fg-form:not([data-fg-theme='light']) {
    --fg-color-bg: #0f172a; --fg-color-surface: #1e293b; --fg-color-text: #e2e8f0;
    --fg-color-muted: #94a3b8; --fg-color-border: #334155;
    --fg-color-primary: #818cf8; --fg-color-primary-contrast: #0f172a; --fg-color-error: #f87171;
  }
}
`
}

export const vanillaAdapter: CssFrameworkAdapter = {
  id: 'vanilla',
  label: 'Vanilla CSS',
  classes: (slot) => CLASSES[slot],
  cell: (span) => ({ class: 'fg-cell', style: `grid-column: span ${span} / span ${span}` }),
  invalidClass: () => 'fg-invalid',
  stylesheet: (theme) => baseStylesheet(theme),
  assets: () => ({ links: [], scripts: [] }),
  readmeNote: () =>
    'Styling is fully self-contained (vanilla CSS, themeable via the --fg-* custom properties).',
}
