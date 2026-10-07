# Phase 37: one shape for the three CSS flavours

## Status

Phase complete. 2026-10-07, commits on `main`: `35ead35` (the adapters, renderer stylesheet, parity CSS, markup changes, snapshots and examples), `821a977` (the parity check in the toolkit), `0909924` (sized selects) and the `docs(handoff)` commit carrying this file; the earlier `6da8fac` added the screenshot and metrics scripts. Decision record: ADR-0004.

The user said "Vanilla CSS, Tailwind and Bootstrap 5 is not fully identical in form" after looking at the examples. They were right: measured, 936 computed-style metrics differed between the three flavours of the kitchen sink and 237 on the examples' event-registration form (page widths, type scales, control heights, line heights, gaps, choice buttons and blocks, tabs, matrix, HTML blocks, …). Now the flavours measure identical within 1px on both forms at 1200px and 390px, and look it. No schema change.

## What was built

- **A measured definition of "identical"**: `tools/proof/e2e/metrics.mjs` records the computed sizes, spacing and typography of a rendered form (form root, grid cells, every control with its label, description and required marker, headings, paragraphs, choice rows, buttons, fieldsets with their inner parts, HTML blocks, the error state); `tools/proof/metrics-compare.mjs` diffs the flavours (colours, font families and the frameworks' own artefacts such as Bootstrap's gutter model excluded); `tools/proof/parity-check.sh` exports both forms in the three flavours, measures them at 1200 and 390px, compares, and takes the screenshots (`tools/proof/e2e/shots.mjs`: 390/768/1200, dark, error state). This is the standing regression check for the adapters.
- **The spec** (ADR-0004) and its implementation in `apps/builder/src/export/css/{vanilla,tailwind,bootstrap5}.ts`, mirrored in `packages/renderer/src/styles.css`: 16px/1.5 controls 38px tall (sm 31, lg 48), 14px/20px labels, descriptions and errors, one heading scale (1.875/1.5/1.25/1.125rem, 600, line-height 1.25), 16px choice rows with 1rem boxes 1.5rem from the row start, 38px buttons with weight 600, underline tabs, 0.375rem field gaps, 1rem grid gaps and form padding, border-box file zones, editors, pads and maps, 1.5rem ranges, 3×2.375rem colour inputs, a 1px line above matrix rows, blocks as bordered rows with a visible check, choice buttons that hug their text, a flex date-range row.
- **Parity stylesheets for what stock classes cannot express** (`apps/builder/src/export/composite.ts`): `BOOTSTRAP_PARITY_CSS`, shipped with every Bootstrap export and hooked by `fg-*` classes beside the Bootstrap ones (0.375rem gaps, heading sizes, `--bs-btn-*` variables for choice buttons, toolbar buttons and the repeater remove link, the switch and matrix geometry, blocks' selected ring, the date-range pair); `HTML_BLOCK_CSS`, shipped with Tailwind and Bootstrap exports when the form has an HTML block (preflight unstyles lists and headings, reboot adds margins).
- **Markup**: the heading slot takes a `level` modifier (`SlotMods.level`, `staticElements.ts`), `choiceLayout(display)` is decided per display (`types.ts`, `choiceGroups.ts`; Bootstrap blocks now wrap the input in the label and show it), Bootstrap tabs are `nav-underline`, its date-range pair a flex row, its form root `p-3`; the HTML export centres the form at 42rem (border-box) with page padding, the same for all three (`targets/html.ts`).
- **Dark mode legibility**: the Tailwind form root paints its background (`bg-white dark:bg-gray-900`), so its light `dark:` text no longer sits on a white host page; the theme bridge knows the new class.
- Tests updated for the new class strings; snapshots and the examples regenerated (`pnpm examples:update`); the Bootstrap example projects now carry the parity stylesheet (`EventRegistrationForm.css`, `.razor.css`).

## What was intentionally NOT done

- **Bootstrap's colour mode.** Vanilla and Tailwind follow `prefers-color-scheme`; Bootstrap 5.3 switches only with `data-bs-theme`, which is the host page's choice. Making Bootstrap exports set it from the media query is a runtime feature in four targets; left out, documented as an accepted difference (ADR-0004). Deferred, not planned.
- **Bootstrap's desktop breakpoint** stays at its `col-lg` 992px against 1024px; its select chevron padding and focus ring, and 1px rounding where its 14px texts keep a 1.5 line (21px against 20px), are accepted.
- The audit workflow started for this phase (nine finder lenses) was stopped once the metric-driven loop overtook it; the review that counts is the verification pass recorded below.

## Key decisions & why

- **Numbers, not eyes, decide parity.** A screenshot comparison catches the obvious; the metrics caught 936 differences and then proved zero. The tolerance is 1px because Bootstrap's 14px texts on a 1.5 line are 21px against 20px, and forcing that everywhere would cost a rule per text class for no visible gain.
- **Colours stay the framework's.** Making Bootstrap indigo would surprise Bootstrap users more than keeping its blue surprises FormsGen users; a themed form already colours all three the same. Dark mode follows the same rule.
- **Bootstrap gets a parity stylesheet; Tailwind does not.** Tailwind's arbitrary values express every metric; Bootstrap's utility scale (0.25rem steps), responsive headings and variable-driven buttons cannot, and Bootstrap exports already shipped CSS for drop zones, rich text, maps, signatures and sortable items. The rules touch metrics only, through `--bs-*` variables where Bootstrap offers them, so the result still reads as Bootstrap.
- **Vanilla moved too.** Where Bootstrap's native metric was as good as vanilla's arbitrary one (38px controls, 1rem gutters, 0.25rem legend padding, body line-height 1.5) vanilla and the renderer adopted it; where Bootstrap's value is an accident of its scale (4px field gaps, 16px labels) the vanilla value won and Bootstrap carries a rule.
- **Content-box was a bug class.** Vanilla's drop zone, editor, pad and map were content-box while the other flavours are border-box; the renderer had the same, now `box-sizing: border-box` on each.
- **The renderer is the builder's preview**, so it changed with vanilla (`styles.css`); the composite and Phase-23 blocks are compared with the vanilla stylesheet by tests and stayed identical.

## How to verify

```sh
pnpm verify                                    # lint, typecheck, 198 renderer / 340 builder / 8 server tests, builds
bash tools/proof/parity-check.sh               # ks@1200, ks@390, ex@1200, ex@390: IDENTICAL; screenshots under tools/proof/work/parity/shots
bash tools/proof/examples-check.sh             # the 13 example runtimes still behave the same (and the Blazor example builds 0/0)
```

Results in this phase: `pnpm verify` green; parity check IDENTICAL for both forms at both widths (from 936/237 differing metrics); screenshots at 390/768/1200, dark and error state reviewed; examples check: see `PROGRESS.md` for the run's figures.

Manual check: open `examples/html/{vanilla,tailwind,bootstrap5}/event_registration.html` side by side; or `pnpm --filter formsgen-example-react dev` and switch `?css=`.

## Known issues / gotchas

- `parity-check.sh` needs the toolkit deps (`tools/proof/setup.sh`) and takes about 4 minutes (metrics only with `ONLY=metrics`, about 2.5). A stale static server on port 4180 makes it measure old pages: the script fails to bind silently and `wait_http` sees the old server; stop by pid (`ps -eo pid,args | grep static-server`).
- The spam-check hint paragraph is hidden on a timer once Turnstile's test key passes, so the metrics skip it; the renderer variant of the Vue example bundles `packages/renderer/dist`, so build the renderer before judging it.
- Bootstrap's `small` utility loses to `.btn` and `.nav-link` font sizes (they come from variables); size such elements through `--bs-btn-font-size` / `--bs-nav-link-font-size` in the parity CSS, as done.
- Host pages that styled the old Bootstrap markup (`nav-tabs` tabs, the `input-group` date range, `container` on the form root) must follow the new markup (ADR-0004).

## Pointers for the next phase

- Any adapter change: run `bash tools/proof/parity-check.sh` and keep IDENTICAL; extend `e2e/metrics.mjs` when a new element type lands (a new slot without a measurement is a parity gap waiting to happen).
- The remaining unmeasured states (focus rings, disabled, floating labels, sm/lg on every slot, RTL) are listed in the verification findings of this phase's handoff; whatever was fixed is in `0909924` and the follow-up commits, whatever was accepted is in ADR-0004.
- Bootstrap automatic dark mode, if ever wanted, belongs with the captcha/draft runtimes (a `matchMedia` check at mount in the four targets).
