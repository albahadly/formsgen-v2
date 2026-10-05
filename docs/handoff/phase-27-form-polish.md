# Phase 27 — Form-level polish

## Status

Complete — 2026-10-05.

- **27a:** help tooltips, text add-ons (prefix/suffix), a form-wide field size. Commit: feat(phase-27a).
- **27b:** column widths per screen size, floating labels, starter templates. Commit: feat(phase-27b).

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

## 27b — what was built

### Column widths per screen size
`layout.colSpanSm` (phones, below 768px, default full width) and `layout.colSpanLg` (desktops, 1024px and up, default = `colSpan`) join `colSpan`, which now means tablets and up. Allowed values: 1, 2, 3, 4, 6, 12. The parser now validates all three.

**Builder.** The panel's "Column span" shows Phone / Tablet / Desktop selects. The Preview's Mobile/Tablet buttons force that layout through `<FormsGenForm viewport="sm|md">` (`data-fg-viewport`), so the device preview shows real stacking.

**Per target:**

| Target | How |
|---|---|
| Tailwind | `col-span-{sm} md:col-span-{md} lg:col-span-{lg}` |
| Bootstrap | `col-{sm} col-md-{md} col-lg-{lg}` |
| Renderer / vanilla | CSS custom properties `--fg-span(-sm/-lg)` plus media queries, matching the framework breakpoints. All three properties are set on every cell, so nested cells never inherit a parent's. React gets them as a typed style object (`as React.CSSProperties`). |

**Behaviour change.** The renderer and vanilla exports now stack fields on phones, as Tailwind/Bootstrap always did; before, they kept desktop columns at every width.

### Floating labels (`meta.floatingLabels`, Settings)

**Which fields.** The label sits inside single-line controls and floats up on focus or when filled: text, email, password, URL, plain phone, search, number and select. These keep the normal label above:
- textarea and date-like inputs;
- fields with a prefix, suffix or tooltip;
- fields with a hidden label.

**Placeholders.** Floating needs a placeholder (an empty `" "` when none is set) for `:placeholder-shown`. A real placeholder appears only while the field is focused.

**Per target:**
- Bootstrap: `form-floating`, plus a one-line rule shipped so the hint shows on focus.
- Tailwind: `peer` utilities.
- Vanilla / renderer: `fg-floating`.

### Starter templates (toolbar → Templates)

| Template | Contents |
|---|---|
| Contact form | Name/email side by side, phone with the country selector, topic, message, consent with a tooltip |
| Registration | Three-step wizard: `@` username, password with a tooltip and a confirm (same-as), plan blocks, newsletter toggle, terms |
| Feedback survey | Ratings matrix, 0–10 recommendation slider, button-style checkboxes, a conditional email |

**Language.** Templates follow the builder's language: English, or Arabic with RTL.

**Loading** replaces the form and asks first when the form has elements. It works like opening a project: undo history is reset.

## Also fixed (27b)

- **Unused helpers in typed exports.** React/Vue exports no longer ship unused helper functions. Before, `fgSize` without size rules and `fgMultipart` without a submit URL failed `noUnusedLocals` in a strict project. `pruneUnusedHelpers` drops uncalled top-level `fg*` helpers.

## Verification (27b)

**`pnpm verify`** passes with **377 tests** (129 renderer / 248 builder). The kitchen-sink fixture's city/zip now set phone and desktop widths.

**Strict compilers.** Covered: the kitchen-sink with floating labels and size `sm`, all three templates, and the Arabic registration template.

| Check | Result |
|---|---|
| React `tsc` | 0 errors |
| `vue-tsc` | 0 errors |
| .NET 8 build of the Blazor export, all 3 frameworks | 0 warnings / 0 errors |

**Real runtimes.** One layout demo ran in **12 runtimes**. All 12 results are **identical**. The scenario measured every cell's column share:

| Field | Phone (375px) | Tablet (820px) | Desktop (1280px) |
|---|---|---|---|
| name, email | 12 | 6 | 4 |
| city | 6 | 6 | 4 |
| postcode | 6 | 6 | 12 |
| age (suffix), notes (textarea) | 12 | 12 | 12 |

It also checked floating labels:
- the label comes after the control and sits inside it, rises on focus and stays up when filled;
- the select's label is always up;
- the placeholder hint shows on focus;
- the add-on field and the textarea keep their labels above.

It ended with a submit.

**Builder.** The Templates dialog works in English and Arabic: Arabic titles, RTL wizard. The device preview gives Desktop 6/6 and Mobile 12/12.

## Backlog

- A key handler so Escape dismisses a tooltip.
- Floating labels for textarea and date-like inputs.
- Per-screen widths in the editor canvas: today only Preview shows the layout.
- More templates.
