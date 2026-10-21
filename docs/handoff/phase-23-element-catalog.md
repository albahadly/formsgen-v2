# Phase 23 — More elements (Vueform gap: quick wins)

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-23)). Scope: the "quick wins" from the comparison with builder.vueform.com. Still parked per user direction: publishing `@albahadly/formsgen-renderer` to npm.

## What was built

11 new element types (36 total) plus two new display options. Every one works in the renderer, the builder canvas and all export targets (JSON, Vue library, Vue standalone, React, Blazor, HTML) × Vanilla / Tailwind / Bootstrap 5, in English and Arabic.

| Element | Notes |
|---|---|
| **Date & time, Month, Week, Search** | Native input types (`datetime-local`, `month`, `week`, `search`) through the text-like factory. |
| **Color** | Native color picker. Defaults to `#000000`, so the data matches what the picker shows. Has its own control class (Bootstrap's native `form-control-color`). |
| **Toggle** | A checkbox with `role="switch"` and boolean semantics (required = must be on). Styling: Bootstrap's native `form-switch`; Tailwind uses utilities; Vanilla uses `.fg-switch` with logical positioning, so it mirrors in RTL. |
| **Hidden input** | A fixed value sent with the form. It gets no grid cell. Only the HTML target emits `<input type="hidden">`; the bound targets keep the value in their state. Respects conditions. The canvas shows it as a chip (`name = "value"`). |
| **Radio / checkbox group display** | New `display` prop: List (default), **Blocks** (bordered cards; the selected one is highlighted with `:has(:checked)`) or **Buttons** (a segmented row). Options stay native, keyboard-accessible inputs: arrow keys move between radio buttons. Bootstrap uses its own `.btn-check` + `.btn` siblings, so adapters now declare `choiceLayout: 'wrap' \| 'sibling'`. |
| **Vertical slider** | New `orientation` prop on the range. Uses the standard `writing-mode: vertical-lr` (inline, so it works in every framework), with `aria-orientation="vertical"`. |
| **Image, Link, Quote** | Static elements. A link that opens a new tab gets `rel="noopener noreferrer"` and a visually hidden "(opens in a new tab)" hint (en/ar). Quote = `figure` / `blockquote` / `figcaption` (Bootstrap's own `blockquote` idiom). |
| **Button** | Static element: **reset** the form, or **open a link** styled as a button. Styles: Primary, Secondary, Danger. Reset restores the initial values, clears errors, touched state and the result, and announces "The form was reset." Each target implements it its own way: renderer `context.reset()`, Vue/React `fgReset`, HTML `form.reset()` plus chips/errors/conditions, Blazor fresh `Model` + `EditContext`. The reset code is emitted only when the form has a reset button. |

### Security

- `isSafeUrl` allows only http(s), mailto:, tel:, relative and in-page URLs.
- The parser rejects other `href`/`src` values with their paths.
- The renderer and every emitter drop unsafe URLs.
- In the canvas, an unsafe image `src` was confirmed not to render.

### Fixes found along the way (pre-existing)

- **Strict TypeScript failures in React and Vue standalone exports.**
  - React (`tsc` with `strict` + `noUnusedLocals`) and Vue standalone (`vue-tsc`) failed with 8 errors on the kitchen-sink export: required/empty checks compiled to `v === false` on string fields; the runtime helpers had untyped parameters; the Vue form state inferred `never[]`; and `forms.other` was possibly undefined.
  - Now: typed helpers (`RUNTIME_HELPERS_TS`), `fgIsBlank(v: unknown)`, a schema-derived `FormData` type shared by React and Vue, and a typed plural table. Both export kinds pass with **0 errors** in all three frameworks.
- **Blazor `@` in text.** Text containing `@` (a label like "Follow @formsgen") was pasted raw into Razor, where `@` starts C# code. The shared `esc()` now writes `&#64;`, which is decoded by HTML, Vue templates and JSX alike.
- **Bootstrap RTL.** An RTL form's HTML export now links `bootstrap.rtl.min.css`, so Bootstrap components mirror. The README note mentions the RTL build for the other targets.
- **Vanilla/renderer fieldsets.** Radio and checkbox groups showed the browser's default fieldset border (Tailwind and Bootstrap reset it; Vanilla never did).
- **Secondary buttons.** `.fg-button--secondary` lost its border to the later `.fg-button` rule in both stylesheets.
- **Builder canvas.** It now uses the renderer's shared `FIELD_COMPONENTS` map, so multiselect and tags fields finally render on the canvas. Links on the canvas select their element instead of navigating away.

## Verification

- `pnpm verify`: **305 tests** (101 renderer / 204 builder). New coverage:
  - safe URLs and parser errors;
  - every new element in the renderer (toggle validity, display classes, vertical, color, hidden payload with conditions, image/link/quote, reset);
  - per-target and per-framework emitter output (Bootstrap siblings, Tailwind/Vanilla nesting, switch role, vertical style incl. the JSX object, hidden only in HTML, `&#64;` in Razor, reset wiring only when needed, the RTL Bootstrap build);
  - typed-target code shape;
  - the Vanilla stylesheet mirrors the renderer's new rules;
  - the canvas renders new elements and links never navigate;
  - registry and i18n completeness.
- **Real runtimes**, all on the kitchen-sink form (it now uses every new element): switch on/off, segmented buttons (selected fill, one row, arrow keys), blocks highlight, color, date-time, vertical slider (16×160), quote, link, submit payload, then reset (values, errors, result, live announcement).

  | Runtime | Result |
  |---|---|
  | HTML export, Chromium, Vanilla / Tailwind / Bootstrap CDNs | all pass |
  | Vue standalone export, mounted in the builder's test environment | all pass |
  | React export, esbuild bundle in Chromium | all pass, no console errors |
  | Blazor export, .NET 8 app, Vanilla + Bootstrap 5.3 | all pass |
  | Renderer, in the built builder (canvas + Preview) | all pass |
  | Themed + RTL HTML export, 3 frameworks | teal switch / buttons / blocks, danger button in the theme's error color, mirrored switch knob and segmented corners |

## Gotchas

- Measure colors after CSS transitions settle (switch and `.btn` transitions take 0.15s), or the values are mid-animation.
- Flex-column fields stretch their children. A vertical slider needs `align-self: flex-start`, or it spans the full width.
- Vue's template compiler drops a leading space inside an element (`<span> {{ x }}</span>`). Write `{{ ` ${x}` }}` when the space matters, e.g. for accessible names.
- Blazor reports `datetime-local` / `time` values with seconds (`2026-10-04T10:30:00`); the other targets report `…T10:30`. Both are valid ISO values.
- Chromium through Playwright's proxy also proxies `localhost`. Launch without the proxy for local servers (Blazor, vite preview).
- `git stash` during verification stashes *all* uncommitted work. Pop it immediately (done once this phase, restored intact).

## Backlog (from the Vueform comparison)

- **`@albahadly/formsgen-renderer` npm publish — parked by user.**
- Medium: range slider with two handles, date range and multiple dates, matrix / matrix table, grid and table layouts, phone with a country selector.
- Large (needs a decision): repeatable list / nested list; file and image upload (payload encoding: multipart when a submit URL is set?); signature, WYSIWYG, location, captcha (third-party services); static HTML (recommend a restricted Markdown instead).
- Form-level: per-breakpoint column widths, floating placeholders, tooltips, a default size for all fields, input prefix/suffix add-ons, starter templates.
