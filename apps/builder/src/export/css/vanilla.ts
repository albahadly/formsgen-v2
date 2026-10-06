import { resolveTheme, themeColorScheme, type ThemeTokens } from '@formsgen/renderer'
import { SIZED_SLOTS, TONED_SLOTS, type CssFrameworkAdapter, type Slot, type SlotMods } from './types'
import { COMPOSITE_CSS } from '../composite'

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
  options: 'fg-options',
  option: 'fg-option',
  range: 'fg-range',
  heading: 'fg-heading',
  paragraph: 'fg-paragraph',
  htmlBlock: 'fg-html',
  richText: 'fg-rich-text',
  richBlock: '',
  richList: '',
  richListOrdered: '',
  divider: 'fg-divider',
  tabList: 'fg-tab-list',
  tabButton: 'fg-tab-button',
  tabButtonActive: 'fg-tab-button fg-tab-button--active',
  stepList: 'fg-step-list',
  stepItem: 'fg-step-item',
  stepItemActive: 'fg-step-item fg-step-item--active',
  stepActions: 'fg-step-actions',
  buttonSecondary: 'fg-button fg-button--secondary',
  tagsWrap: 'fg-tags',
  tag: 'fg-tag',
  tagRemove: 'fg-tag-remove',
  tagsInput: 'fg-tags-input',
  srOnly: 'fg-sr-only',
  switchWrap: 'fg-checkbox-row',
  switch: 'fg-switch',
  optionsBlocks: 'fg-options fg-options--blocks',
  optionBlock: 'fg-option fg-option--block',
  optionBlockInput: 'fg-checkbox',
  optionsButtons: 'fg-options fg-options--buttons',
  optionButton: 'fg-option fg-option--button',
  optionButtonInput: 'fg-sr-only',
  image: 'fg-image',
  link: 'fg-link',
  quote: 'fg-quote',
  quoteText: 'fg-quote-text',
  quoteCite: 'fg-quote-cite',
  buttonDanger: 'fg-button fg-button--danger',
  colorInput: 'fg-input fg-input--color',
  repeaterItems: 'fg-repeater-items',
  repeaterItem: 'fg-repeater-item',
  repeaterItemLabel: 'fg-repeater-item-label',
  repeaterItemActions: 'fg-repeater-item-actions',
  repeaterRemove: 'fg-repeater-remove',
  repeaterMove: 'fg-repeater-move',
  repeaterHandle: 'fg-repeater-handle',
  signature: 'fg-signature',
  signaturePad: 'fg-signature-pad',
  signatureRow: 'fg-signature-row',
  richtext: 'fg-richtext',
  richtextToolbar: 'fg-richtext-toolbar',
  richtextButton: 'fg-richtext-button',
  richtextEditor: 'fg-richtext-editor',
  location: 'fg-location',
  locationMap: 'fg-location-map',
  locationRow: 'fg-location-row',
  locationCoord: 'fg-location-coord',
  locationStatus: 'fg-location-status',
  captcha: 'fg-captcha',
  captchaHint: 'fg-captcha-hint',
  repeaterAdd: 'fg-button fg-button--secondary fg-repeater-add',
  calculated: 'fg-input fg-calculated',
  fileDrop: 'fg-file-drop',
  fileDropText: 'fg-file-drop-text',
  fileInput: 'fg-file-input',
  fileList: 'fg-file-list',
  fileItem: 'fg-file-item',
  fileThumb: 'fg-file-thumb',
  fileName: 'fg-file-name',
  fileSize: 'fg-file-size',
  fileRemove: 'fg-file-remove',
  upload: 'fg-upload',
  progress: 'fg-progress',
  progressBar: 'fg-progress-bar',
  progressText: 'fg-progress-text',
  pair: 'fg-pair',
  chipList: 'fg-chips',
  pairButton: 'fg-button fg-button--secondary fg-pair-button',
  pairSeparator: '',
  matrixWrap: 'fg-matrix-scroll',
  matrix: 'fg-matrix',
  matrixColHead: '',
  matrixRowHead: '',
  matrixRow: '',
  matrixCell: '',
  matrixRadio: '',
  phoneCountry: 'fg-select fg-phone-country',
  draft: 'fg-draft',
  draftText: 'fg-draft-text',
  draftClear: 'fg-draft-clear',
  affixGroup: 'fg-affix-group',
  affix: 'fg-affix',
  floating: 'fg-floating',
  floatingLabel: 'fg-floating-label',
  floatingControl: '',
}

/** Mirrors packages/renderer/src/styles.css for self-contained artifacts. */
function baseStylesheet(theme: ThemeTokens | undefined): string {
  // The theme goes last, at higher specificity, so the automatic dark scheme
  // never overrides a color the author chose.
  const scheme = themeColorScheme(theme)
  const overrides = [
    ...Object.entries(resolveTheme(theme)).map(([token, value]) => `  --fg-${token}: ${value};`),
    ...(scheme ? [`  color-scheme: ${scheme};`] : []),
  ].join('\n')
  const themeRule = overrides ? `.fg-form.fg-form {\n${overrides}\n}\n` : ''
  return `.fg-form {
  --fg-color-bg: #ffffff;
  --fg-color-surface: #f8fafc;
  --fg-color-text: #0f172a;
  --fg-color-muted: #64748b;
  --fg-color-border: #cbd5e1;
  --fg-color-primary: #4f46e5;
  --fg-color-primary-contrast: #ffffff;
  --fg-color-error: #dc2626;
  --fg-color-error-contrast: #ffffff;
  --fg-radius: 6px;
  --fg-space: 1rem;
  --fg-font: system-ui, sans-serif;
  font-family: var(--fg-font);
  color: var(--fg-color-text);
  background: var(--fg-color-bg);
  padding: var(--fg-space);
}
.fg-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: var(--fg-space); }
.fg-cell { min-inline-size: 0; grid-column: span var(--fg-span-sm, 12) / span var(--fg-span-sm, 12); }
@media (min-width: 768px) { .fg-cell { grid-column: span var(--fg-span, 12) / span var(--fg-span, 12); } }
@media (min-width: 1024px) { .fg-cell { grid-column: span var(--fg-span-lg, 12) / span var(--fg-span-lg, 12); } }
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
.fg-options { display: flex; flex-direction: column; gap: 0.375rem; }
.fg-option { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.9375rem; }
.fg-range { inline-size: 100%; accent-color: var(--fg-color-primary); }
.fg-heading { margin: 0; }
.fg-paragraph { margin: 0; color: var(--fg-color-muted); }
/* HTML blocks: light defaults; the author's own classes and styles win */
.fg-html { overflow-wrap: anywhere; }
:where(.fg-html) > :first-child { margin-block-start: 0; }
:where(.fg-html) > :last-child { margin-block-end: 0; }
:where(.fg-html) :where(p, ul, ol, dl, table, blockquote, figure, pre, details) { margin-block: 0.5em; }
:where(.fg-html) :where(h1, h2, h3, h4, h5, h6) { margin-block: 0.75em 0.375em; font-weight: 600; line-height: 1.3; }
:where(.fg-html) h1 { font-size: 1.5em; }
:where(.fg-html) h2 { font-size: 1.3em; }
:where(.fg-html) h3 { font-size: 1.15em; }
:where(.fg-html) ul { list-style: disc; padding-inline-start: 1.25em; }
:where(.fg-html) ol { list-style: decimal; padding-inline-start: 1.25em; }
:where(.fg-html) table { border-collapse: collapse; }
:where(.fg-html) :where(th, td) { padding: 0.25rem 0.5rem; border: 1px solid var(--fg-color-border); text-align: start; }
:where(.fg-html) img { max-inline-size: 100%; block-size: auto; }
:where(.fg-html) a { color: var(--fg-color-primary); }
/* Signature: a light pad (dark ink in any theme), the typing box and Clear */
.fg-signature { display: flex; flex-direction: column; gap: 0.5rem; }
.fg-signature-pad { display: block; inline-size: 100%; border: 1px dashed var(--fg-color-border); border-radius: var(--fg-radius); background: #fff; touch-action: none; cursor: crosshair; }
.fg-signature-row { display: flex; gap: 0.5rem; justify-content: flex-end; }
.fg-signature-row > input { flex: 1 1 auto; min-inline-size: 0; }
/* Rich text: toolbar and editor */
.fg-richtext { border: 1px solid var(--fg-color-border); border-radius: var(--fg-radius); background: var(--fg-color-bg); }
.fg-richtext:focus-within { border-color: var(--fg-color-primary); outline: 2px solid var(--fg-color-primary); outline-offset: 2px; }
.fg-richtext-toolbar { display: flex; flex-wrap: wrap; gap: 0.25rem; padding: 0.25rem; border-block-end: 1px solid var(--fg-color-border); }
.fg-richtext-button { min-inline-size: 2rem; padding: 0.25rem 0.5rem; border: 1px solid transparent; border-radius: var(--fg-radius); background: none; color: inherit; font: inherit; cursor: pointer; }
.fg-richtext-button:hover, .fg-richtext-button:focus-visible { border-color: var(--fg-color-border); background: var(--fg-color-surface); }
.fg-richtext-editor { min-block-size: 6rem; padding: 0.5rem 0.75rem; outline: none; overflow-wrap: anywhere; }
.fg-richtext-editor :where(p, ul, ol) { margin: 0 0 0.5em; }
.fg-richtext-editor :where(ul, ol) { padding-inline-start: 1.5em; }
.fg-richtext-editor a { color: var(--fg-color-primary); }
/* Location: the map (Leaflet), the coordinate boxes and buttons, messages */
.fg-location { display: flex; flex-direction: column; gap: 0.5rem; }
.fg-location-map { inline-size: 100%; border: 1px solid var(--fg-color-border); border-radius: var(--fg-radius); isolation: isolate; z-index: 0; }
.fg-location-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: flex-end; }
.fg-location-coord { display: flex; flex: 1 1 8rem; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; }
.fg-location-status { margin: 0; font-size: 0.875rem; min-block-size: 0; }
/* Spam check: the widget and its hint above the actions row */
.fg-captcha { display: flex; flex-direction: column; gap: 0.25rem; margin-block-start: 1rem; }
.fg-captcha-hint { margin: 0; font-size: 0.875rem; color: var(--fg-color-muted); }
/* Sortable items: drag handle, the dragged item, where it would land */
.fg-repeater-handle { padding: 0 0.25rem; color: var(--fg-color-muted); font-size: 1.25rem; line-height: 1; cursor: grab; user-select: none; }
[data-fg-item][data-fg-drag] { opacity: 0.5; }
[data-fg-item][data-fg-drop="before"] { box-shadow: 0 -3px 0 0 var(--fg-color-primary); }
[data-fg-item][data-fg-drop="after"] { box-shadow: 0 3px 0 0 var(--fg-color-primary); }
/* Save and continue later: the note above the form */
.fg-draft { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem 0.75rem; margin-block-end: var(--fg-space); padding: 0.5rem 0.75rem; border: 1px solid var(--fg-color-border); border-radius: var(--fg-radius); background: var(--fg-color-surface); color: var(--fg-color-muted); font-size: 0.875rem; }
.fg-draft-text { flex: 1 1 16rem; margin: 0; }
.fg-draft-clear { padding: 0; border: 0; background: none; color: var(--fg-color-primary); font: inherit; text-decoration: underline; cursor: pointer; }
/* Calculated fields: read-only, looks set apart from inputs */
.fg-calculated { background: var(--fg-color-surface); font-variant-numeric: tabular-nums; cursor: default; }
.fg-rich-text > * { margin: 0; }
.fg-rich-text > * + * { margin-block-start: 0.5em; }
.fg-rich-text ul, .fg-rich-text ol { padding-inline-start: 1.25em; }
.fg-rich-text ul { list-style: disc; }
.fg-rich-text ol { list-style: decimal; }
.fg-divider { border: none; border-block-start: 1px solid var(--fg-color-border); margin-block: 0.25rem; }
.fg-tab-list { display: flex; flex-wrap: wrap; gap: 0.25rem; border-block-end: 1px solid var(--fg-color-border); margin-block-end: var(--fg-space); }
.fg-tab-button { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 0.875rem; font: inherit; font-size: 0.875rem; font-weight: 600; color: var(--fg-color-muted); background: none; border: none; border-block-end: 2px solid transparent; cursor: pointer; }
.fg-tab-button--active { color: var(--fg-color-primary); border-block-end-color: var(--fg-color-primary); }
.fg-step-list { display: flex; flex-wrap: wrap; gap: var(--fg-space); margin: 0 0 var(--fg-space); padding: 0; list-style: none; }
.fg-step-item { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: var(--fg-color-muted); }
.fg-step-item--active { color: var(--fg-color-text); font-weight: 600; }
.fg-step-actions { display: flex; justify-content: space-between; gap: 0.5rem; margin-block-start: var(--fg-space); }
.fg-button.fg-button--secondary { background: var(--fg-color-surface); color: var(--fg-color-text); border-color: var(--fg-color-border); }
.fg-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 0.375rem; padding: 0.375rem 0.5rem; background: var(--fg-color-bg); border: 1px solid var(--fg-color-border); border-radius: var(--fg-radius); }
.fg-tags:focus-within { outline: 2px solid var(--fg-color-primary); outline-offset: 1px; }
.fg-tag { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.125rem 0.5rem; font-size: 0.8125rem; background: var(--fg-color-surface); border: 1px solid var(--fg-color-border); border-radius: 999px; }
.fg-tag-remove { border: none; background: none; padding: 0; cursor: pointer; color: var(--fg-color-muted); font-size: 0.875rem; line-height: 1; }
.fg-tags-input { flex: 1; min-inline-size: 6rem; border: none; background: none; font: inherit; color: inherit; padding: 0.125rem; }
.fg-tags-input:focus { outline: none; }
.fg-control--sm { padding: 0.25rem 0.5rem; font-size: 0.8125rem; }
.fg-control--lg { padding: 0.75rem 1rem; font-size: 1.0625rem; }
.fg-tags.fg-control--sm { padding: 0.125rem 0.375rem; font-size: 0.8125rem; }
.fg-tags.fg-control--lg { padding: 0.5rem 0.75rem; font-size: 1.0625rem; }
.fg-align-center { text-align: center; }
.fg-align-end { text-align: end; }
.fg-tone-muted { color: var(--fg-color-muted); }
.fg-tone-primary { color: var(--fg-color-primary); }
.fg-tone-danger { color: var(--fg-color-error); }
.fg-divider.fg-tone-muted { border-block-start-color: var(--fg-color-border); }
.fg-divider.fg-tone-primary { border-block-start-color: var(--fg-color-primary); }
.fg-divider.fg-tone-danger { border-block-start-color: var(--fg-color-error); }
.fg-sr-only { position: absolute; inline-size: 1px; block-size: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.fg-group { margin: 0; padding: var(--fg-space); border: 1px solid var(--fg-color-border); border-radius: var(--fg-radius); background: var(--fg-color-surface); }
.fg-group-label { padding-inline: 0.375rem; font-size: 0.875rem; font-weight: 600; color: var(--fg-color-muted); }
.fg-actions { margin-block-start: var(--fg-space); }
.fg-upload { display: flex; flex-direction: column; gap: 0.375rem; margin-block-start: var(--fg-space); }
.fg-progress { block-size: 0.5rem; overflow: hidden; background: var(--fg-color-border); border-radius: 999px; }
.fg-progress-bar { block-size: 100%; background: var(--fg-color-primary); border-radius: inherit; transition: inline-size 0.2s ease; }
.fg-progress-text { margin: 0; font-size: 0.875rem; color: var(--fg-color-muted); }
.fg-button:disabled { opacity: 0.6; cursor: not-allowed; }
.fg-button { padding: 0.5rem 1.25rem; font: inherit; font-weight: 600; border: 1px solid transparent; border-radius: var(--fg-radius); cursor: pointer; }
.fg-button--primary { background: var(--fg-color-primary); color: var(--fg-color-primary-contrast); }
.fg-payload { margin-block-start: var(--fg-space); padding: var(--fg-space); background: #0f172a; color: #86efac; border-radius: var(--fg-radius); font-size: 0.8125rem; overflow-x: auto; }
/* Phase 23 elements: switch, choice blocks/buttons, vertical slider, image, link, quote, buttons */
.fg-switch { appearance: none; position: relative; flex-shrink: 0; inline-size: 2.25rem; block-size: 1.25rem; margin: 0; border: 1px solid transparent; border-radius: 999px; background: var(--fg-color-border); cursor: pointer; transition: background-color 0.15s; }
.fg-switch::before { content: ''; position: absolute; inset-block-start: 0.0625rem; inset-inline-start: 0.0625rem; inline-size: 1rem; block-size: 1rem; border-radius: 50%; background: #ffffff; box-shadow: 0 1px 2px rgb(0 0 0 / 0.3); transition: inset-inline-start 0.15s; }
.fg-switch:checked { background: var(--fg-color-primary); }
.fg-switch:checked::before { inset-inline-start: 1.0625rem; }
.fg-switch:focus-visible { outline: 2px solid var(--fg-color-primary); outline-offset: 2px; }
.fg-options--blocks { gap: 0.5rem; }
.fg-option--block { display: flex; padding: 0.625rem 0.75rem; border: 1px solid var(--fg-color-border); border-radius: var(--fg-radius); background: var(--fg-color-bg); cursor: pointer; }
.fg-option--block:has(:checked) { border-color: var(--fg-color-primary); box-shadow: 0 0 0 1px var(--fg-color-primary); }
.fg-options--buttons { flex-direction: row; flex-wrap: wrap; gap: 0; }
.fg-option--button { position: relative; padding: 0.5rem 1rem; margin-inline-start: -1px; font-size: 0.875rem; font-weight: 600; border: 1px solid var(--fg-color-border); background: var(--fg-color-bg); cursor: pointer; }
.fg-option--button:first-child { margin-inline-start: 0; border-start-start-radius: var(--fg-radius); border-end-start-radius: var(--fg-radius); }
.fg-option--button:last-child { border-start-end-radius: var(--fg-radius); border-end-end-radius: var(--fg-radius); }
.fg-option--button:has(:checked) { z-index: 1; color: var(--fg-color-primary-contrast); background: var(--fg-color-primary); border-color: var(--fg-color-primary); }
.fg-option--button:has(:focus-visible) { z-index: 2; outline: 2px solid var(--fg-color-primary); outline-offset: 2px; }
.fg-range--vertical { writing-mode: vertical-lr; direction: rtl; align-self: flex-start; width: auto; height: 10rem; }
.fg-image { display: block; max-inline-size: 100%; block-size: auto; border-radius: var(--fg-radius); }
.fg-link { color: var(--fg-color-primary); text-decoration: underline; text-underline-offset: 2px; }
.fg-quote { margin: 0; padding-inline-start: 1rem; border-inline-start: 4px solid var(--fg-color-border); }
.fg-quote-text { margin: 0; font-size: 1.0625rem; font-style: italic; }
.fg-quote-text p { margin: 0; }
.fg-quote-cite { margin-block-start: 0.375rem; font-size: 0.875rem; color: var(--fg-color-muted); }
.fg-button--danger { background: var(--fg-color-error); color: var(--fg-color-error-contrast); }
a.fg-button { display: inline-block; text-decoration: none; }
.fg-input--color { inline-size: 4rem; block-size: 2.5rem; padding: 0.25rem; cursor: pointer; }
fieldset.fg-field { margin: 0; padding: 0; border: 0; min-inline-size: 0; }
fieldset.fg-field > legend { padding: 0; margin-block-end: 0.375rem; }
/* Repeatable sections */
.fg-repeater-items { display: flex; flex-direction: column; gap: var(--fg-space); }
.fg-repeater-item { margin: 0; padding: var(--fg-space); min-inline-size: 0; border: 1px solid var(--fg-color-border); border-radius: var(--fg-radius); background: var(--fg-color-bg); }
.fg-repeater-item-label { padding-inline: 0.375rem; font-size: 0.875rem; font-weight: 600; }
.fg-repeater-item-actions { display: flex; align-items: center; gap: 0.5rem; margin-block-start: 0.75rem; }
.fg-repeater-move { display: inline-flex; align-items: center; justify-content: center; inline-size: 2rem; block-size: 2rem; padding: 0; font: inherit; color: var(--fg-color-text); background: none; border: 1px solid var(--fg-color-border); border-radius: var(--fg-radius); cursor: pointer; }
.fg-repeater-remove { margin-inline-start: auto; padding: 0; font: inherit; font-size: 0.875rem; color: var(--fg-color-error); background: none; border: none; text-decoration: underline; cursor: pointer; }
.fg-repeater-add { margin-block-start: var(--fg-space); }
/* File uploads */
.fg-file-drop { position: relative; display: flex; align-items: center; justify-content: center; min-block-size: 4.5rem; padding: 1rem; text-align: center; font-size: 0.875rem; color: var(--fg-color-muted); background: var(--fg-color-surface); border: 2px dashed var(--fg-color-border); border-radius: var(--fg-radius); }
.fg-file-drop:hover, .fg-file-drop[data-fg-dragging] { border-color: var(--fg-color-primary); color: var(--fg-color-text); }
.fg-file-drop:has(:focus-visible) { outline: 2px solid var(--fg-color-primary); outline-offset: 2px; }
.fg-file-input { position: absolute; inset: 0; inline-size: 100%; block-size: 100%; opacity: 0; cursor: pointer; }
.fg-file-drop-text { font-weight: 500; }
.fg-file-list { display: flex; flex-direction: column; gap: 0.375rem; margin: 0; padding: 0; list-style: none; }
.fg-file-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.5rem; font-size: 0.875rem; border: 1px solid var(--fg-color-border); border-radius: var(--fg-radius); background: var(--fg-color-surface); }
.fg-file-thumb { inline-size: 2.5rem; block-size: 2.5rem; object-fit: cover; border-radius: calc(var(--fg-radius) / 2); }
.fg-file-name { flex: 1; min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fg-file-size { color: var(--fg-color-muted); font-size: 0.8125rem; }
.fg-file-remove { padding: 0 0.375rem; font-size: 1.125rem; line-height: 1; color: var(--fg-color-muted); background: none; border: none; cursor: pointer; }
.fg-file-remove:hover { color: var(--fg-color-error); }
${COMPOSITE_CSS}@media (prefers-color-scheme: dark) {
  .fg-form:not([data-fg-theme='light']) {
    --fg-color-bg: #0f172a; --fg-color-surface: #1e293b; --fg-color-text: #e2e8f0;
    --fg-color-muted: #94a3b8; --fg-color-border: #334155;
    --fg-color-primary: #818cf8; --fg-color-primary-contrast: #0f172a; --fg-color-error: #f87171;
    --fg-color-error-contrast: #0f172a;
  }
}
${themeRule}`
}

export const vanillaAdapter: CssFrameworkAdapter = {
  id: 'vanilla',
  label: 'Vanilla CSS',
  classes: (slot: Slot, mods?: SlotMods) => {
    const base = CLASSES[slot]
    if (mods?.size && SIZED_SLOTS.has(slot)) return `${base} fg-control--${mods.size}`
    if (mods?.tone && TONED_SLOTS.has(slot)) return `${base} fg-tone-${mods.tone}`
    return base
  },
  alignClass: (align) => `fg-align-${align}`,
  // All three set, so a nested cell never inherits its parent's spans.
  cell: ({ sm, md, lg }) => ({ class: 'fg-cell', style: `--fg-span: ${md}; --fg-span-sm: ${sm}; --fg-span-lg: ${lg}` }),
  choiceLayout: 'wrap',
  invalidClass: () => 'fg-invalid',
  stylesheet: (theme) => baseStylesheet(theme),
  assets: () => ({ links: [], scripts: [] }),
  readmeNote: () =>
    'Styling is fully self-contained (vanilla CSS, themeable via the --fg-* custom properties).',
}
