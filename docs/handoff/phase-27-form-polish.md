# Phase 27 — Form-level polish

## Status

- **27a: complete** (2026-10-05). Help tooltips, text add-ons (prefix/suffix) and a form-wide field size.
- **27b: next.** Column widths per screen size, floating labels, starter templates.

Still parked: npm publish.

## 27a — what was built

### Help tooltips (`props.tooltip`, every field)
- **What it is.** A small "?" button beside the label (Arabic: مزيد من المعلومات). Its tip text shows on hover and on focus. It uses pure CSS, so it behaves the same in every target.
- **Accessibility.** The tip `describes` the button and never joins the field's accessible name:
  - Labelled fields put the tip **outside** the `<label>`, in a `fg-label-row`.
  - Groups (radio/checkbox groups, matrix) keep it inside the `<legend>`, and the `fieldset` is named by `aria-labelledby` pointing at the legend text alone.
  - Single checkboxes and toggles place it after their label.
- **Styles.** The CSS (`fg-tip*`) is framework-neutral. Tailwind/Bootstrap exports ship it only when the form has a tooltip.

### Text add-ons (`props.prefix` / `props.suffix`)
- **Where.** On text, email, password, URL, phone (without the country selector), search and number fields, e.g. "$ … USD" or "@ …".
- **Accessibility.** The add-ons are spans with ids, listed in the control's `aria-describedby`, so screen readers announce them.
- **Styles:**
  - Bootstrap uses `input-group` / `input-group-text`.
  - Tailwind uses a flex row whose inner corners are squared with arbitrary variants.
  - Vanilla and the renderer use `fg-affix-group` / `fg-affix`.

### Form-wide field size (`meta.fieldSize`: sm / md / lg)
- **Where it's set.** In Settings ("Field size (all fields)").
- **How fields follow it.**
  - Every sized control follows the form-wide size.
  - A field's own size wins. The Appearance size list is now "Form default / Small / Medium / Large", and `style.size: 'md'` means explicitly medium.
- **Implementation:**
  - In the exports, the markup walker resolves the size, so the CSS adapters never see `md`.
  - In the renderer, `useField` falls back to the form context's `fieldSize()`.

### Refactor
Renderer field components now share `FgFieldLabel` (label + required mark + tooltip), `FgTip` and `FgAffix`.

## Verification (27a)

**`pnpm verify`** passes with **366 tests** (126 renderer / 240 builder). The kitchen-sink fixture gained:
- tooltips on seats, plan and terms;
- a "people" suffix on seats;
- an "@" prefix on username.

**Strict compilers** (kitchen-sink export):

| Check | Result |
|---|---|
| React `tsc` | 0 errors |
| `vue-tsc` | 0 errors |
| .NET 8 build of the Blazor export, all 3 frameworks | 0 warnings / 0 errors |

**Real runtimes.** One scenario ran in all **12 runtimes**; all 12 results are **identical**. It checked:
- **Accessible names:** "Price" is the spinbutton, "Plan" the group, "I agree" the checkbox, and 3 "More information" buttons.
- **Tooltips:** hidden at first, shown on hover, hidden after the pointer leaves, shown on keyboard focus.
- **Add-ons:** in order around the input and aligned with it, with the expected `aria-describedby`.
- **Field size:** the large form-wide size applies, and the explicit-medium field stays smaller.
- **Submit:** the payload is correct.

## Gotchas (27a)

- **CSS-only tooltips can't be dismissed with Escape.** They hide when the pointer leaves or focus moves. Backlog: an Escape key handler.
