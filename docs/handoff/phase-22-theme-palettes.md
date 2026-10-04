# Phase 22 — Theme palettes, muted and surface colors

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-22)). Still parked per user direction: publishing `@formsgen/renderer` to npm.

## What was built

- **Two more theme colors in Settings**:
  - **Surface** (`color-surface`): group panels, tag chips, the secondary button hover;
  - **Muted text** (`color-muted`): descriptions, paragraphs, group labels, inactive tabs and steps.

  They now reach every export:
  - **Tailwind**: `text-gray-500/600` and their `dark:` variants map to muted; `bg-gray-50/100` and their `dark:` variants map to surface. `text-gray-700` and `hover:text-gray-700` map to the text color. The Tailwind guard's allowlist is down to the debug payload and two specially-handled classes.
  - **Bootstrap**: `--bs-secondary-color/-rgb` (`.form-text`, `.text-secondary`, placeholders), `--bs-tertiary-bg/-rgb` (group `.bg-body-tertiary`) and `--bs-secondary-bg`. Tag chips (`.text-bg-secondary`, which forces white text) get computed readable text, and `.btn-outline-secondary` is re-tinted with muted.
- **One-click color palettes** (`THEME_PALETTES` in the renderer): Default, Ocean, Forest, Sunset, Rose, Graphite and Midnight (dark).
  - A row of swatch buttons sits above the color pickers, each with `aria-pressed` showing which palette is active.
  - A palette replaces only the colors (`store.applyThemeColors`); font, radius and spacing are kept.
  - Editing any single color afterwards simply un-highlights the palette.
  - A test enforces WCAG AA (≥ 4.5:1) for text, muted, primary and error on **both** background and surface, and for the primary button text, in every palette. It caught Forest's first primary color (4.39:1 on its surface), which was darkened to `#166534`.
- **`color-scheme` follows a custom background**: `themeColorScheme()` returns `dark` for a dark hex background, otherwise `light`. Native controls (select arrows, date pickers, checkboxes, radios, scrollbars) then match the theme. It is applied:
  - in the renderer and canvas, via `themeInlineStyle()`;
  - in the vanilla `.fg-form.fg-form` rule;
  - on both bridge roots.

  Bootstrap's select chevron (a background image) is redrawn in the theme's text color.
- **Bootstrap fixes found along the way**:
  - `--bs-body-color-rgb`: the active step's `.text-body` kept Bootstrap's default text color;
  - `--bs-emphasis-color`;
  - `--bs-border-color-translucent`: check and radio borders were invisible on dark backgrounds.

## Verification

- `pnpm verify`: **283 tests** (92 renderer / 191 builder). New coverage:
  - contrast checks for each palette;
  - `color-scheme` derivation;
  - Bootstrap muted / surface / `text-body` / chevron output (with no `<` or `>` in the CSS);
  - Tailwind muted / surface;
  - the store's `applyThemeColors` keeps non-color tokens;
  - palette UI end-to-end (apply, pressed state, canvas `color-scheme`, un-highlight on edit, back to Default);
  - Arabic names for every palette.
- **Real browsers.** The HTML export of the kitchen-sink form was measured in Chromium with the frameworks' CDNs:

  | | Vanilla | Tailwind | Bootstrap 5 |
  |---|---|---|---|
  | Midnight: form bg / text / color-scheme | `#0f172a` / `#e2e8f0` / dark | same | same |
  | Midnight: group surface / description | `#1e293b` / `#94a3b8` | same | same |
  | Midnight: select bg / text | `#0f172a` / `#e2e8f0` | same | same |
  | Forest: bg / group / description | `#f6fbf4` / `#e8f3e4` / `#4a5d50` | same | same |
  | Tag chip | surface + text | surface + text | muted fill + computed readable text (Bootstrap's filled-badge idiom) |

  In the screenshots, Midnight's date picker, checkboxes and radios render dark.
- **Real builder**: picking Midnight presses its swatch and turns the canvas dark, with `color-scheme: dark` (screenshot in session).

## Gotchas

- Again: never `pkill -f <pattern>` from a Bash call. The pattern matches the calling shell's own command line and kills it (exit 144). Select PIDs with `ps -eo pid,comm,args | awk '$2=="node" && …'`.
- `vitest run --root /` scans the whole filesystem. Put throwaway test files inside the package's `src` and delete them afterwards.

## Backlog

- **`@formsgen/renderer` npm publish — parked by user.**
- The renderer's own palette for the HTML debug payload (`<pre>`) stays dark in every theme, by design.
