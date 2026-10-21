# ADR-0005 — The builder's theme is its own; chrome on the form card follows the form

## Context

Until phase 38 the builder chrome was light only. The form on the canvas
already had a theme of its own (`ui.previewTheme` → `data-fg-theme`), the
one the export will have, toggled in the canvas toolbar. The user asked for
a light/dark mode for the builder itself. The chrome is Tailwind v4 utility
classes across ~30 components, and part of it is drawn inside the form card
(section tabs, container boxes, empty hints, selection rings).

## Decision

1. **The builder theme is a document attribute, not the OS.**
   `composables/theme.ts` stores the choice (`formsgen.theme`), follows the
   OS only while nothing is stored, and sets `data-theme` + `color-scheme`
   on `<html>`; `index.html` applies the same rule before first paint. The
   Tailwind `dark:` variant is bound to `[data-theme='dark']`.
2. **The form's theme stays independent**, and everything the builder draws
   inside the form card follows the *form's* theme through a second variant,
   `fg-dark:`, bound to `.fg-form[data-fg-theme='dark']`. The card pins its
   own `color-scheme` so native controls follow the form as well.
3. **Colours are explicit per component** (`dark:` / `fg-dark:` classes from
   one mapping), not a remap of the grey palette.

## Alternatives considered

- Tailwind's default media-query `dark:`: no way for a stored choice to win
  over the OS.
- One toggle for both the chrome and the form: the form's theme is content
  (it previews the export); the chrome's is a preference.
- Remapping `--color-gray-*` / `--color-white` under `[data-theme='dark']`:
  `bg-white` and `text-white` share one variable, and dark-on-light surfaces
  (toast, copy buttons, payload box) would invert silently.

## Consequences

- Every new builder component carries `dark:` variants; one rendered inside
  the form card carries `fg-dark:` instead. `tools/proof/theme-shots.mjs`
  shows gaps.
- The two theme toggles stay separate controls: the builder's in the header,
  the form's in the canvas toolbar.
