# Progress — live session memory

The between-sessions memory asked for by the user: what was last done, what is
in flight, and the exact next step. A fresh session reads this first (see
`CLAUDE.md` §1–§2), updates it at every milestone, and commits it with the
work. Phase handoffs (`INDEX.md`) stay the long-form record.

## Where we are (2026-10-21)

- **Branch / remote:** `main` of `albahadly/formsgen-v2`, pushed with
  `git push -u origin main`. Phase 37 landed as `f3f73a6` (adapters),
  `78845f8` (parity check), `5ae40ae` (sized selects), `9319fca` (docs),
  `bf3902d` (invalid state), `0ca1735` (floating labels); the `phase-37`
  worktree is removed. Since then on `main`: `d5b7ac1` (design canvas on
  the renderer's column grid), `2c9f4fe` (`.gitattributes` pins LF), then
  the review round of 2026-10-21 (drop direction fix,
  `tools/proof/canvas-parity.mjs`, `PLAYWRIGHT_CHANNEL`), then **phase 38**
  (builder light/dark mode, version `0.1.0` beside the title).
- **State:** phases 01–11, 10b and 12–45 are complete.
- **Where sessions run now:** the user's local Windows checkout
  (`CLAUDE.md` §6, last bullet), not the cloud container. `pnpm verify`
  via `npx --yes pnpm@10 verify` is green there on `2c9f4fe` (198 renderer /
  341 builder / 8 server tests, all builds).
- **State:** all planned phases (01–11) plus 10b and 12–37 are complete.
  Phase 37 made the three CSS flavours render the same form (ADR-0004):
  `tools/proof/parity-check.sh` measures IDENTICAL within 1px on the
  kitchen sink, the examples form and the floating-labels demo at 1200 and
  390px (from 936 / 237 differing metrics). Handoff:
  `phase-37-css-parity.md`.
- **Gates:** `pnpm verify` green on `0ca1735` (198 renderer / 340
  builder / 8 server tests, builds incl. the examples); parity check
  IDENTICAL (ks, ex, fl × 1200, 390); examples check 13/13 identical with
  Blazor 0/0 (run on the branch before the floating round; the examples
  have no floating labels). CI on `main`: check the Actions run for the
  memory commit.

## In flight

- **Phase 45 — field types (started 2026-10-21, on `main`).** Four new
  element types, each through the renderer, the registry, the four code
  targets in three CSS flavours (ADR-0004 parity), the validation export,
  the kitchen sink and a template, with a matrix demo: 45a a star
  `rating` and an `nps` scale (choice-like, radios underneath), 45b a
  `currency` amount with locale formatting and an `address` field with
  suggestions. Phase 44 shipped before it (`f5318ef`): verify green
  (renderer 218 / builder 379 / cli 12 / server 9), reviewed in Edge.
  - **45a shipped** (2026-10-21): `feat(phase-45)` `2b0242c` + the
    `fix(phase-45)` and `docs(handoff)` commits after it (see the log).
    Gates: verify green (renderer 221 / builder 383 / cli 12 / server 9),
    matrix 12/12 IDENTICAL, parity IDENTICAL ×6, builder reviewed in Edge.
  - **45b shipped** (2026-10-21, see the log): `currency` and `address`
    through the renderer, the registry, the four targets, prefill, the
    validation export, the kitchen sink, the order template, five
    locales, the sample server's `/suggest`, demo + e2e. Gates:
    verify green (renderer 228 / builder 388 / cli 12 / server 9), matrix
    12/12 IDENTICAL after two fixes the first run found (TS narrowing in
    the suggestion script, the Blazor `FgField` helper gated on money),
    builder reviewed in Edge.
  - **Phase 45 is complete.** Next on the roadmap: **Phase 46** — a
    three-way system/light/dark control and copy/paste of elements
    between projects (ADR-0005 for the theme).

## Next steps (in order) — the roadmap the user chose on 2026-10-21

The user picked these from a list of ideas and asked for them in sequence
(skipped on purpose: hosted forms/responses, multi-language forms, the
audit panel, print/PDF). Each is a phase under the Phase Standard.

1. **Phase 39 — prefill from the URL**: query parameters fill matching
   fields; hidden fields can take their value from a named parameter.
   Renderer + all 12 runtimes, builder settings/panel, kitchen sink.
2. **Phase 40 — after submit**: thank-you message / redirect in the schema
   and every runtime; the sample server forwards submissions to a webhook.
3. **Phase 41 — server-side validation export**: the form's rules as a
   `zod` schema and as JSON Schema (DataAnnotations already exist).
4. **Phase 42 — CLI**: `formsgen export <schema> --target … --css …` from
   the JSON, usable in CI.
5. **Phase 43 — Web Component export**: `<formsgen-form>` wrapping the
   renderer, a single script for any host page.
6. **Phase 44 — more templates and more UI languages.**
7. **Phase 45 — field types**: star rating, NPS scale, address
   autocomplete, currency with locale formatting.
8. **Phase 46 — small wins**: three-way system/light/dark control,
   copy/paste of elements between projects.

## Open backlog (pointer)

- npm publish of `@formsgen/renderer` — parked by the user.
- Still deferred on purpose: a keyboard way to draw a signature when typing
  is off; Bootstrap 5 contrast on tertiary backgrounds; legacy entities
  without a semicolon (see `phase-35-backlog-round.md`).

## How to resume

```sh
pnpm install --offline --frozen-lockfile || pnpm install --frozen-lockfile
pnpm verify                                   # the single gate
bash tools/proof/setup.sh                     # once per container
bash tools/proof/export-demo.sh tools/proof/demos/wizard.json /tmp/out
bash tools/proof/strict.sh /tmp/out WizDemoForm
bash tools/proof/run-matrix.sh /tmp/out WizDemoForm wiz_demo tools/proof/e2e/wizard.mjs wiz
```

Sample servers for the demos: `node packages/submit-server/server.mjs --port 4280 --dir /tmp/subs`
and, for the spam demo, `TURNSTILE_SECRET=1x0000000000000000000000000000000AA node packages/submit-server/server.mjs --port 4281 --dir /tmp/subs-captcha`.

## Log (newest first)

- **2026-10-21** — **Phase 45b: currency and address** (handoff
  `phase-45-field-types.md`, 45b section). `currency`: a number typed in
  a decimal text control, the sign as a prefix add-on, formatted with the
  form locale's separators on blur; one parse rule in JS/TS/C# (last
  separator + up to `decimals` digits = decimal mark) so the runtimes
  agree. `address`: a text input with a datalist filled by one shared
  script from a provider URL template (`{q}`; Nominatim by default; the
  sample server's `/suggest` for demos). Both excluded from repeaters.
  Demo `demos/money.json` (German) + `e2e/money.mjs`. Found on the way:
  a `vitest -u` run while `export-demo.sh` runs the builder's vitest can
  lose its snapshot update.

- **2026-10-21** — **Phase 45a: star rating and NPS scale** (handoff
  `phase-45-field-types.md`). `rating` (1..max stars) and `nps` (0..10
  with end words) as radios underneath, one `FgScore.vue`, one
  `scores.ts` with the four emitters, one `SCORE_CSS` block in every
  flavour mirrored in the renderer stylesheet, numbers in the typed
  models, C#, prefill and the validation export; feedback template and
  kitchen sink carry both. Demo `demos/scores.json` + `e2e/scores.mjs`.
  Found on the way: (1) the React runtime's `touch()` after `setField()`
  validated the stale closure, so a required radio kept its error after
  a pick following a rejected submit — fixed for every control via
  `formRef.current`; (2) a shared CSS block must give every `--fg-*`
  token the `--bs-*`/literal fallback chain and say `border-box` itself,
  or Tailwind/Bootstrap drop the declarations (parity caught 26 → 15 → 0
  differing metrics); (3) `run-matrix.sh` needs the sample server on
  4280 started by hand. Gates: verify green (221 / 383 / 12 / 9), matrix
  12/12 IDENTICAL, parity IDENTICAL ×6.

- **2026-10-21** — **Phase 44: more templates, more UI languages**
  (handoff `phase-44-templates-languages.md`). French, Spanish and
  German builder UIs (`i18n/locales/*.ts`: 213 keys + 96 `element.*` +
  66 phrases each), a language picker (`locale-select`, `LOCALES`,
  `localeDir`), `tText` on per-locale phrase maps, renderer messages in
  the three languages (`messagesExtra.ts`, `resolveMessages` by
  language). Four templates in `templates/more.ts` (rsvp, order,
  appointment, quote), helpers in `templates/shared.ts`,
  `templateLocale` for UI languages without templates. Completeness test
  sweeps every locale (a phrase may read the same). Reviewed in Edge.
  Found on the way: the Arabic catalog's 96 `element.*` keys have no
  English counterpart (the registry is the English), so a new locale
  must carry them or the palette shows English names.
- **2026-10-21** — **Phase 43: the form as a web component** (handoff
  `phase-43-web-component.md`, ADR-0006). Renderer `src/element.ts`
  (`defineCustomElement`, light DOM, `useHost`, the stylesheet via
  `?inline` added once; `src` / `schema` property or attribute; events
  `formsgen-change/submit/sent/ready/error`; sends with `sendSubmission`
  unless `formsgen-submit` is prevented; after-submit honoured) built by
  `vite.config.element.ts` into `dist/element/` (ES + IIFE, ~325 kB, Vue
  inside; `build:element`, package export `./element`). Builder: Vite
  plugin serving `element/*.js` in dev and copying into `dist/element/`
  on build; `build.sh` builds the bundle first; the Export dialog fetches
  its own copy (`ExportContext.assets`). Target `web-component`: host
  page + bundle (`ExportedFile.project: false` keeps the project off
  prebuilt files). CLI reads the bundle from `dist/element/` or the
  renderer build. Toolkit `element-check.sh` (the 13th runtime); the
  `thanks`/`prefill` scenarios carry an `ID` map per runtime (renderer
  `fg-<node id>` vs exports `fg_<path>`; aligning the renderer would touch
  16 + 35 test assertions), `thanks` reads a value only while shown.
- **2026-10-21** — **Phase 42: the command line** (handoff `phase-42-cli.md`).
  `packages/cli`: Vite SSR bundle of the builder's export code + renderer +
  Vue (`ssr.noExternal`), `commands.ts` (`packageFiles` mirrors the Export
  dialog's ZIP: files with the project, project file, README, optional
  `server/`), `run.ts` (`parseArgs`, exit 0/1/2), tests with a temp
  folder. `formsgen export|validate|targets`. Joined `pnpm -r
  build/typecheck/test`; README and CLAUDE.md repo map updated.
- **2026-10-21** — **Phase 41: server-side validation export** (handoff
  `phase-41-server-validation.md`). New target `validation`:
  `export/validation.ts` builds a typed property tree (`validationModel`)
  and emits `zodSource` (refinements that skip empty values, the exports'
  own `fgIsEmpty`/`fgSize` helpers pruned in, `superRefine` for
  conditional required / same-as / date order, compiled conditions over
  `data?.x`) and `jsonSchemaOf` (draft 2020-12; `anyOf [{maxLength:0},…]`
  for optional sized values; limitations in the description). Tests
  transpile and run the zod with real zod and the JSON Schema with ajv.
  Toolkit `server-validate.mjs` validates stored submissions (prefill 12,
  thanks 24, 0 failures); `export-demo.sh` writes the validation files.
  Builder devDeps: zod, ajv, ajv-formats. The reopen test now counts `.ts`
  among the code files that carry the project.
- **2026-10-21** — **Phase 40: after submit** (handoff
  `phase-40-after-submit.md`, ADR-0002 log). Renderer `afterSubmit.ts`
  (`afterSubmitOf`, `isRedirectUrl`), `FormsGenForm` prop `sent` + event
  `again` (the thank-you replaces the form body, piped through `pipeText`),
  message key `sendAnother`. Exports: `export/afterSubmit.ts` — the block
  per language from `pipeMarkup`, `data-fg-sent` on the root plus one CSS
  rule hiding the rest (HTML `<style>` in head, React a `<style>` child,
  Vue the scoped block, Blazor a `<style>` child), success hooks in the
  three send branches of each target (the draft goes first; the output is
  byte-identical when nothing is configured, so no example drifted), the
  reset function emitted whenever a message exists; vue-lib host sets
  `sent`. Builder: Settings fields (the redirect is kept only when valid),
  preview shows the thank-you or a note for a redirect. Sample server
  `--webhook` + `WEBHOOK_SECRET` (HMAC), tested. Kitchen sink carries a
  piped message; 12 snapshots refreshed. Matrices `thanks` and `redirect`
  12 × IDENTICAL each; the first `thanks` run exposed a dead selector in
  the Vue Tailwind flavour (`undefined[data-fg-sent]`), fixed (`b96a8d9`).
- **2026-10-21** — **Phase 39: prefill from the page address** (first of
  the roadmap the user chose). Renderer `prefill.ts` (kinds, conversions,
  `queryPrefill`), `FormsGenForm` prop `prefillSearch`, `meta.prefillFromQuery`
  and hidden `param` (ADR-0002 log). Exports: one emitter module
  `apps/builder/src/export/prefill.ts` feeding the HTML runtime
  (`fgPrefill` after `fgDraftStart`), typed readers for React (functional
  `setForm` after the draft effect) and Vue (`onMounted` after the draft
  restore), and Blazor (`FgPrefill` in `OnInitialized` and again after a
  draft load; `NavigationManager` injected). Builder: settings checkbox,
  the hidden element's "URL parameter" control, a test string in the
  preview. Kitchen sink carries both; 12 snapshots refreshed. Toolkit:
  `demos/prefill.json`, `e2e/prefill.mjs`; `lib.sh` gained Windows shims
  (no `setsid`, `pnpm` via npx, `python3` fallback), and the whole matrix
  ran on Windows for the first time: strict clean, 12 × IDENTICAL. Gotcha
  met: the harness collapses `\` in heredocs — scripts with backslashes
  go in a file.
- **2026-10-21** — Phase 38 follow-up asked by the user: the version sits
  beside the "FormsGen Builder" title (`app-version`, always visible) and
  the `renderer v…` text left the header; `RENDERER_VERSION` stays exported.
- **2026-10-21** — **Phase 38: builder light/dark mode + version**
  (handoff `phase-38-builder-theme.md`, ADR-0005). The chrome gets its own
  theme: `composables/theme.ts` (stored `formsgen.theme`, OS until chosen,
  `data-theme` + `color-scheme` on `<html>`, no-flash script in
  `index.html`), Tailwind `dark:` bound to `[data-theme='dark']` and
  `fg-dark:` bound to the form card's own theme for the chrome drawn inside
  it (first pass keyed it to the builder and painted a dark box inside the
  white form — caught in the Edge screenshots), 284 `dark:` variants over 27
  components from one mapping plus three special cases, header toggle with
  en/ar strings. Versions: header `v0.1.0 · renderer v0.1.0`; builder from
  its `package.json`, renderer literal test-enforced (JSON import would
  shift the d.ts output); root/builder/renderer bumped to `0.1.0`, lockfile
  unchanged. Tests: builder 346, renderer 199. Toolkit:
  `tools/proof/theme-shots.mjs`. Not done on purpose: no "system" entry in
  the toggle; form theme stays independent; exports carry no version.
- **2026-10-21** — Review round after the canvas fix. Verified `d5b7ac1`
  in Edge (playwright-core, `channel: 'msedge'`): the Registration
  template's two password cells measure the same in the editor and the
  preview at desktop (290 vs 356px wide on a narrower card, both half
  width), tablet (`md`, side by side) and mobile (`sm`, stacked); drag
  and drop on the grid list still reorders. Fixed the 15 CRLF-only test
  failures for good: `.gitattributes` (`* text=auto eol=lf`) and
  `.editorconfig` (`2c9f4fe`), index already LF so nothing renormalised;
  the tree was re-checked out (`git rm -r --cached . && git reset --hard`
  on a clean tree) and `verify` is fully green on Windows. `CLAUDE.md` §6
  gained a local-Windows bullet. A reviewer pass over `d5b7ac1` found no
  correctness bug but one behaviour change, reproduced in Edge: SortableJS
  reads the 12-column grid as horizontal, so a palette item dropped on the
  lower-left of the last field landed *before* it. Fixed with a `direction`
  callback (`dropDirection` in `useDropList.ts`, unit-tested) on the three
  canvas lists: full-row targets are vertical, cells sharing a row are
  horizontal. New toolkit script `tools/proof/canvas-parity.mjs` compares
  every template's cells between canvas and preview per device (102
  fields, 0 mismatches); `_browser.mjs` gained `PLAYWRIGHT_CHANNEL` so the
  toolkit runs on Edge without a Chromium download. Not changed on
  purpose: the canvas does not apply `style.className` to the cell as
  `FgNode` does (a user class such as `hidden` would make the element
  unselectable on the canvas).
- **2026-10-21** — Fix: the design canvas ignored `layout.colSpan*` (every
  drop list was a flex column), so half-width fields such as the
  registration template's two passwords stacked in the editor while the
  preview put them side by side. Canvas drop lists are now the renderer's
  `.fg-grid`, each `BuilderNode` is an `.fg-cell` with the same
  `--fg-span*` properties (columns children default to 12 / count), and the
  canvas card carries `data-fg-viewport` like the preview. Builder test
  added. On the Windows checkout (`core.autocrlf=true`) 15 builder tests
  that compare files on disk (examples drift, stylesheet mirror) fail on
  CRLF only; unrelated to this change.

- **2026-10-07** — Phase 37 verification: the six-reviewer verify
  workflow failed on the session limit (no findings); states reviewed by
  hand instead. Fixed the error state (`bf3902d`: Bootstrap's invalid icon
  and padding, label colour) and floating labels (all three flavours on
  Bootstrap's geometry; new demo `tools/proof/demos/floating.json`, third
  form `fl` of the parity check). Parity check IDENTICAL for ks, ex, fl at
  1200 and 390; builder 340/340, renderer 198/198.
- **2026-10-07** — Phase 37 implemented: one spec for the three flavours
  (ADR-0004), renderer stylesheet mirrored, Bootstrap parity CSS, heading
  `level` modifier, per-display `choiceLayout`, HTML page scaffold,
  Tailwind dark background; parity check IDENTICAL on both forms at 1200
  and 390 (eight measured rounds from 936/237); `pnpm verify` green;
  review workflow `wf_d8fcae04-0b3` launched (journal under
  `~/.claude/projects/-home-user/…/subagents/workflows/wf_d8fcae04-0b3/`).
- **2026-10-07** — Phase 37 (CSS parity) started: measurement scripts,
  baseline metrics and screenshots, draft spec, audit workflow launched.
- **2026-10-07** — Phase 36 done: `examples/` (template, 4 projects, 5
  READMEs, drift test, `examples-check.sh` + scenario), ADR-0003 and the
  derived-id fix in every export (`c6f1b25`), the renderer export now
  sends to the submit URL with `sendSubmission` + headers (`464de9b`),
  examples commit `108d2ed`. Checks: verify green (198/340/8), Blazor 0/0,
  examples check 13/13 identical (three runs: the first caught the
  duplicate-id bug, the second a stale renderer `dist`, the third was
  clean), location demo matrix 12/12 identical with the renamed
  `fg_place-lng` ids.
- **2026-10-06** — Phase 36 (examples folder) started; plan under "In
  flight".

- **2026-10-06** — CI fix: `pnpm/action-setup@v4` refuses a `version` input
  when `package.json` has `packageManager` (added by the review fixes); the
  workflow now takes the version from `package.json` only.

- **2026-10-06** — Phase 35 (review backlog round) done and pushed: 35e,
  35d, 35a, 35c, 35b with handoff. The proof's three takes caught tsc
  errors in the typed runtimes and a race in the first pruning design.

- **2026-10-06** — User rule added: keep progress memory in the project.
  Wrote `CLAUDE.md` and this file (`6281e04`), then moved the verification
  toolkit from the scratchpad into `tools/proof/` (setup, export-demo,
  strict, run-matrix, five scenarios + demo schemas, Blazor host template,
  builder check) and proved it cold: wizard demo identical in 12/12
  runtimes, strict compiles clean, builder check green.
- **2026-10-06** — Review wrap-up merged to `main` (`29f0817`, `44cae87`,
  `7831f23`): 60 findings fixed, handoff updated, matrices and strict
  compiles rerun, verify green. Judge workflow confirmed findings 1–12
  before the session limit; the rest were verified while fixing.
- **2026-10-06** — Phase 34 (`8a1b1b8`): signature pad, rich text, location
  on a map (Leaflet + OSM), Turnstile spam check, sandboxed iframes.
- Earlier phases: see `INDEX.md`.
