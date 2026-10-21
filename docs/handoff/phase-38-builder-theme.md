# Phase 38: the builder's own light/dark mode, and its version

## Status

Complete (2026-10-21), on `main`; commits are listed in `PROGRESS.md`.
Gate: `pnpm verify` green on the local Windows checkout (lint, typecheck,
renderer 199 / builder 346 / server 8 tests, all builds). Both themes were
reviewed in Edge: every view, the three dialogs, the phone layout and the
canvas card in the four builder-theme × form-theme combinations
(`tools/proof/theme-shots.mjs`).

## What was built

- **A theme for the builder chrome** — toolbar, palette, outline, canvas
  surround, properties, dialogs, toasts, phone tab bar.
  `apps/builder/src/composables/theme.ts` holds the `theme` ref; the choice
  is stored per browser under `formsgen.theme`, and until one is stored the
  builder follows the OS (`prefers-color-scheme`, including live changes).
  `applyThemeToDocument` puts `data-theme` and `color-scheme` on `<html>`;
  `index.html` runs the same rule inline before the app paints, so a dark
  user never sees a light flash.
- **Two Tailwind v4 variants** in `apps/builder/src/style.css`: `dark:`
  bound to `[data-theme='dark']` (a stored choice wins over the OS), and
  `fg-dark:` bound to `.fg-form[data-fg-theme='dark']` for the canvas chrome
  drawn inside the form card (ADR-0005).
- **`dark:` variants on every colour utility of the chrome** — 284
  additions over 27 components from one mapping (panels `bg-white` →
  `dark:bg-gray-900`, app background `dark:bg-gray-950`, text one or two
  steps lighter, borders 600/700, tints `-50` → `-950`, rings 200 → 900),
  plus the cases a mapping cannot know: the draft toast is inverted (light
  on dark), the view/device pills get a lighter active segment.
- **The header toggle** (`theme-toggle`: ☀️ Light / 🌙 Dark, `aria-pressed`,
  titles in English and Arabic) beside the language toggle.
- **The form on the canvas keeps its own theme** (`ui.previewTheme` →
  `data-fg-theme`, the existing ☀️/🌙 in the canvas toolbar): it previews the
  export. `color-scheme` is scoped to the card so its native controls follow
  the form, not the builder. The chrome inside the card now follows the
  form too, so a dark form no longer gets light boxes and tabs.
- **Versions.** The header shows `v0.1.0 · renderer v0.1.0`
  (`app-version`). The builder reads its own `package.json`; the renderer's
  `RENDERER_VERSION` stays a literal that `version.test.ts` keeps equal to
  its `package.json` (importing the JSON from the library source would move
  the declaration output under `dist/src/`). Root, builder and renderer went
  from the scaffold's `0.0.1` to `0.1.0`.
- Tests: the toggle darkens the chrome, stores the choice, leaves the form's
  theme alone and is restored by a new session; the header shows both
  versions; the renderer constant matches `package.json`.

## What was intentionally NOT done

- No "system" entry in the toggle. The builder follows the OS until a choice
  is stored; returning to "follow the OS" means clearing `formsgen.theme`.
- The form's theme does not follow the builder's, on purpose (see above).
- The code view keeps its dark highlight theme in both modes, as before.
- Exports and their READMEs do not carry the builder version (it would
  change every example and the drift check).
- No palette remap: see the decisions.

## Key decisions & why

- **`data-theme` on `<html>` and a custom `dark` variant** instead of
  Tailwind's default media-query variant: a stored choice must win over the
  OS, and the no-flash script needs one attribute to set.
- **Two variants, not one.** Chrome inside the card sits on the form's
  colours; keying it to the builder theme painted a dark box inside a white
  form. `fg-dark:` keys it to the form instead (ADR-0005).
- **Explicit `dark:` classes rather than remapping the grey palette** under
  `[data-theme='dark']`: `bg-white` and `text-white` share one variable, and
  several surfaces are dark-on-light by design (toast, copy buttons, the
  submitted payload); a remap breaks them silently, a mapping is reviewable.
- **`0.1.0`** says "usable, the API may still change". The schema keeps its
  own version (`formsgen/v2`, ADR-0002).

## How to verify

```sh
pnpm verify
# visual, with the dev server on 4186 (PLAYWRIGHT_CHANNEL=msedge on Windows):
node tools/proof/theme-shots.mjs http://$FG_HOST:4186/ tools/proof/work/shots
```

The script prints both themes' `html`/`colorScheme`/`stored`/`formTheme`/
`version`, the four card combinations, `afterReload` (`dark`: the choice
survives) and `errors` (empty), and writes `theme-*.png` / `card-*.png`.

## Known issues / gotchas

- A new builder component must carry `dark:` variants (and `fg-dark:` when
  it renders inside the form card); nothing adds them automatically. The
  screenshot script is the way to spot gaps.
- `color-scheme: dark` on `<html>` would darken the light form's native
  controls; the card pins its own (`style.css`).
- jsdom has no `matchMedia`, so tests start light; `startThemeTracking`
  returns a no-op there.

## Pointers for the next phase

- A three-way system / light / dark control, perhaps in Settings.
- Carrying the builder version into the export READMEs when the drift check
  can absorb it (one `pnpm examples:update`).
- Backlog unchanged otherwise: see phase 35–37 handoffs; the renderer npm
  publish stays parked.
