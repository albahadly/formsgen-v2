# Phase 21 — Theme options in Settings

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-21)). Still parked per user direction: publishing `@formsgen/renderer` to npm.

## What was built

A **Theme** section in Form settings (en + ar: السمة):

| Option | Control | Token |
|---|---|---|
| Primary, text, background, border and error colors | color pickers, each with its own "Reset" link | `color-primary`, `color-text`, `color-bg`, `color-border`, `color-error` |
| Font | System (default) / Sans-serif / Serif / Monospace / Arabic-friendly (Tahoma) / Custom… | `font` |
| Corner radius | None / Small / Medium (default) / Large / Custom… | `radius` |
| Spacing | Compact / Normal (default) / Relaxed / Custom… | `space` |
| Reset theme | button (disabled when nothing is set) | removes `meta.theme` |

Picking a default preset clears the token, so untouched forms keep no theme. A "Custom…" value is committed only when it is a safe CSS value; otherwise an inline error shows and the schema is unchanged. Undo/redo works as for every other store action.

### The theme now reaches every export

Before this phase, theme tokens styled only the renderer and vanilla exports; Tailwind and Bootstrap exports ignored them.

- **Renderer and canvas.**
  - `themeCssVariables()` turns the theme into `--fg-*` variables, used by `FormsGenForm` and, new, by the builder's design canvas.
  - A primary color without an explicit contrast color gets readable text (`readableTextOn`, WCAG; e.g. yellow → dark text).
- **Vanilla.** Overrides are emitted as `.fg-form.fg-form { --fg-…: … }` after the automatic dark-scheme block, so the author's colors win in dark mode too.
- **Tailwind and Bootstrap.** A generated *theme bridge* (`export/css/themeBridge.ts`) is shipped only when the form has a theme, scoped to the form root's `fg-themed` class.
  - **Bootstrap**: native `--bs-*` variables, plus `.btn-primary` (via variables *and* direct values, since host CSS such as the Blazor template's `app.css` restyles `.btn-primary` directly), focus rings, checked checks, range thumbs, tabs and grid gutters.
  - **Tailwind**: concrete values on exactly the palette classes the adapter emits (`bg-indigo-600`, `focus:ring-indigo-200`, `rounded-md`, `gap-4`, …).
  - A guard test fails if the Tailwind adapter starts emitting a palette class that is neither themed nor explicitly listed as left alone.
- **Pinned light scheme.** A custom background or text color defines its own scheme, so automatic dark mode must not flip the colors the author left alone:
  - the form root gets `data-fg-theme="light"`;
  - Tailwind's `dark:` variants fall back to their light values;
  - the builder's dark preview toggle respects it.
- **Where each target ships the bridge**:
  - HTML: a `<style>` element;
  - Vue standalone: `<style scoped>`;
  - React: `Name.css`;
  - Blazor: `Name.razor.css`.

  READMEs now mention the stylesheet whenever one is actually emitted.

### Security

Theme values are written into generated CSS. They used to pass through unchecked, so a crafted `.formsgen.json` could inject CSS or, through `</style>`, markup.

- `parse.ts` now rejects unsafe token names and values, with paths (ADR-0002 log updated).
- `resolveTheme` drops unsafe tokens as defense in depth.
- `store.setThemeToken` refuses them.

### Blazor scoped-CSS fix (pre-existing since phase 9)

Blazor CSS isolation stamps only the component's own plain elements, so the `.razor.css` never styled elements rendered by child components: `InputText`'s `<input>` (it had the browser default padding of 1px 2px) and the `EditForm`'s `<form>`, which held `.fg-form`. The fix has two parts:

- The form-root classes moved from `<EditForm>` to the inner wrapper `<div>`, which used to be `display: contents`, and the result `<pre>` moved inside it.
- `scopeForBlazor()` rewrites the stylesheet:
  - rules starting at the root become `.fg-themed ::deep .x`;
  - every other rule becomes `::deep .x`;
  - `@media` blocks are handled too.

## Verification

- `pnpm verify`: **274 tests** (85 renderer / 189 builder). New coverage:
  - injection attempts are rejected (parser, store, resolver);
  - contrast derivation;
  - pinning;
  - the bridge output for both frameworks;
  - the Tailwind palette guard;
  - the vanilla override order;
  - every target marks the root and ships the bridge, and unthemed output is unchanged;
  - the Blazor `::deep` rewrite;
  - the Settings UI end-to-end (colors, presets, invalid custom value, per-token and full reset, canvas follows, pin under dark preview);
  - Arabic names for every preset.
- **Real browsers.** The HTML export of the kitchen-sink form was loaded in Chromium with the Tailwind and Bootstrap CDNs, under both light and dark OS schemes. Theme: teal `#0f766e`, cream `#fffbeb`, dark text, border `#a8a29e`, error `#be123c`, radius 0, Georgia.

  | | Vanilla | Tailwind | Bootstrap 5 |
  |---|---|---|---|
  | Primary button bg / text / radius | `#0f766e` / white / 0 | same | same |
  | Form bg / text / font | cream / `#1c1917` / Georgia | same | same |
  | Input border / radius | `#a8a29e` / 0 | same | same |
  | Error message color | `#be123c` | same | same |
  | Dark OS scheme | unchanged (pinned) | unchanged | unchanged |
  | Unthemed export | identical to before | identical | identical |
  | Yellow primary `#fde047` | dark button text `#111827` | same | same |

- **Real Blazor (.NET 8, stock template)**:
  - unthemed vanilla input padding is now `8px 12px` (was `1px 2px`);
  - themed vanilla: cream / Georgia / teal button / 0 radius, also under dark OS;
  - themed Bootstrap (5.3.3): teal button. Before the direct-value fix it was the template's `#1b6ec2`.
- **Real builder**: the Theme section was used through the UI in English and Arabic. The canvas follows: cream background, Georgia, square inputs, pinned light.
- Also fixed on the way: the Bootstrap tags input showed a white inner box on tinted backgrounds; it is now `bg-transparent`.

## Gotchas

- **Chromium in the sandbox**: with the proxy configured, even `localhost` goes through it, and the proxy answers plain HTTP with a 405. Launch without the proxy for local servers (the Blazor app), and with proxy plus SPKI pin only when CDNs are needed. Bootstrap 5.3.3 was fetched with curl into the proof app's `wwwroot`, because the template ships 5.1, which lacks the `--bs-btn-*` variables.
- Tailwind bridge selectors use specificity `(0,2,0)` / `(0,3,0)` so they beat the Play CDN's runtime `<style>` regardless of injection order.

## Backlog

- **`@formsgen/renderer` npm publish — parked by user.**
- Muted text and surface colors (`color-muted`, `color-surface`) are tokens the renderer and vanilla understand, but they aren't in the Settings UI. Tailwind/Bootstrap leave greys alone (listed in the guard test).
- Theme presets ("Ocean", "Forest", …) could be offered as one-click combinations of the tokens.
