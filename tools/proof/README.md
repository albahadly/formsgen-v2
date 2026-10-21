# Verification toolkit (`tools/proof/`)

Everything needed to prove a FormsGen form in all **12 runtimes** (HTML,
React, Vue standalone and Blazor Server, each in vanilla CSS, Tailwind and
Bootstrap 5), to run the strict compilers on the exports, and to check the
builder itself in a browser. It used to live in a session scratchpad and was
rebuilt every time; now it is part of the repository (see `CLAUDE.md` §5).

Nothing here is part of `pnpm verify`: it needs a browser, the .NET 8 SDK and
network access to the CDNs the exports use (Leaflet, Tailwind, Turnstile).

## One-time setup (per machine or container)

```sh
bash tools/proof/setup.sh
```

Installs React, esbuild, TypeScript and Playwright under
`tools/proof/node_modules` (not part of the pnpm workspace; `npm install`),
checks `node` (20+), `dotnet` (8.x) and the Chromium path, and prints the
host and ports it will use. It never downloads a browser: Playwright uses
the one named by `PLAYWRIGHT_CHROMIUM` (`/opt/pw-browsers/chromium` in the
cloud container) or its own bundled one.

## The flow for one demo

```sh
# 1. a sample server that stores what the form posts (multipart, JSON)
node packages/submit-server/server.mjs --port 4280 --dir tools/proof/work/subs &

# 2. the 12 exports of a schema (uses the builder's own export targets)
bash tools/proof/export-demo.sh tools/proof/demos/wizard.json tools/proof/work/wizard

# 3. strict compilers: React tsc, vue-tsc, .NET build (0 errors, 0 warnings)
bash tools/proof/strict.sh tools/proof/work/wizard WizDemoForm

# 4. drive every runtime with the scenario and compare with HTML vanilla
bash tools/proof/run-matrix.sh tools/proof/work/wizard WizDemoForm wiz_demo tools/proof/e2e/wizard.mjs wiz
```

`run-matrix.sh` bundles the React export with esbuild and the Vue export with Vite for each CSS framework (the strict compilers are `strict.sh`'s job), serves them with `static-server.mjs`, and prints one line per runtime (`html-vanilla: IDENTICAL`,
`blazor-tailwind: DIFFERS: …`) and `CHECK-DONE` at the end; it also writes
`<outdir>/matrix.log`, `res-<run>.json` (what the scenario saw),
`err-<run>.txt` and screenshots under `<outdir>/shots/`. `ONLY=web` runs
the nine HTML/React/Vue runtimes, `ONLY=blazor` the three Blazor ones (each
Blazor build takes one to three minutes).

The component name is the form's name in PascalCase plus `Form`
(`wiz_demo` → `WizDemoForm`); the HTML basename is the form's name.

| Demo | Schema | Scenario | Component | HTML basename | Sample server |
|---|---|---|---|---|---|
| Signature pad | `demos/signature.json` | `e2e/signature.mjs` | `SignDemoForm` | `sign_demo` | 4280 |
| Rich text | `demos/richtext.json` | `e2e/richtext.mjs` | `RichDemoForm` | `rich_demo` | 4280 |
| Location (map) | `demos/location.json` | `e2e/location.mjs` | `LocDemoForm` | `loc_demo` | 4280 |
| Spam check (Turnstile) | `demos/spam.json` | `e2e/spam.mjs` | `SpamDemoForm` | `spam_demo` | 4281 with `TURNSTILE_SECRET=1x0000000000000000000000000000000AA` |
| Wizard (steps + all three fields, re-render, reset) | `demos/wizard.json` | `e2e/wizard.mjs` | `WizDemoForm` | `wiz_demo` | 4280 |
| Scores (star rating required, NPS prefilled from `?nps=3`, a box shown under 7) | `demos/scores.json` | `e2e/scores.mjs` | `ScoresDemoForm` | `scores_demo` | 4280 |

The demo schemas carry the placeholder `FG_HOST` in their submit URL;
`export-demo.sh` replaces it with the host the browser must use.

Expected, harmless differences: file sizes are normalised before the
comparison (a signature PNG's byte size depends on the pad's width in each
CSS flavour and on stroke timing). In the wizard demo, Blazor shows the
editor the cleaned markup after a re-render (`<strong>` for the typed
`<b>`); the scenario normalises that too. Anything else that differs is a
real difference between runtimes.

## Checking that the three CSS flavours render the same form

```sh
bash tools/proof/parity-check.sh              # ONLY=metrics skips the screenshots; WIDTHS=1200,390
```

Exports the kitchen sink and the examples template with the HTML target in
vanilla, Tailwind and Bootstrap 5, serves them, measures each page with
`e2e/metrics.mjs` (computed sizes, spacing and typography of the form, its
cells, controls, labels, headings, paragraphs, choice rows, buttons,
fieldsets and HTML blocks, plus the error state) and compares the flavours
with `metrics-compare.mjs`, which ignores colours, font families and the
frameworks' own artefacts. Prints `<form>@<width>: IDENTICAL` or the number
of differing metrics (table in `compare-<form>-<width>.md`), then takes the
screenshots (`e2e/shots.mjs`: 390/768/1200, dark, error state) under
`work/parity/shots/`. ADR-0004 is the spec it checks.

## Checking the examples

```sh
bash tools/proof/examples-check.sh            # ONLY=web or ONLY=blazor to split
```

Builds the example projects under `examples/` (React and Vue with their own
Vite configs, the Blazor app with `dotnet build`), serves them
(`static-server.mjs` on 4180 for the HTML pages, 4181 React, 4182 Vue; the
Blazor app on 5139) and drives all 13 runtimes with
`e2e/event-registration.mjs`: 3 HTML pages, 3 React variants, 4 Vue variants
(the fourth uses `@formsgen/renderer`), 3 Blazor pages. The sample server on
4280 is started when it is not already answering. The examples post to
`http://localhost:4280/submit` exactly as a developer runs them; the scenario
routes those requests to the sample server at `FG_HOST`. Output as for
`run-matrix.sh` (`<run>: IDENTICAL`, `CHECK-DONE`, `res-*.json`, `shots/`),
under `work/examples/` by default.

## Checking the builder itself

```sh
pnpm --filter @formsgen/builder build
pnpm --filter @formsgen/builder exec vite preview --port 4186 --host 0.0.0.0 --strictPort &
node tools/proof/builder-check.mjs http://$FG_HOST:4186/ tools/proof/work/shots
```

The script prints a JSON object: typing in a canvas editor keeps the
element (`nodesAfterTyping` equals `nodes1`), editors and maps are inert on
the canvas (`pointer-events: none`), clicking a map selects the element,
number controls clamp (height 600, zoom 1), a bad spam-check key shows a
warning and is not saved (`captchaInSchema` null) while the draft survives a
reload, the preview's submit enables with the test key, and new rich-text,
signature and location fields in an Arabic form start with Arabic labels
(`arabicLabels`). Screenshots go to the shots directory.

The design canvas must lay fields out like the preview (the renderer's
12-column grid with the element's `colSpan`, `colSpanSm`, `colSpanLg`):

```sh
node tools/proof/canvas-parity.mjs http://$FG_HOST:4186/
```

loads every template, and for each device measures every named field's cell
as a share of its own grid on the canvas and in the preview. It prints the
counts per template and device, `mismatches` (empty when the two agree
within 2.5%) and page `errors`, and exits 1 when either is not empty.

The server-side rules a form exports (the "Validation" target) are proven
against what the runtimes actually sent: after a matrix run,

```sh
node tools/proof/server-validate.mjs tools/proof/work/<demo> <submissions-dir>
```

picks the stored submissions that belong to the form and validates each with
the exported zod schema and JSON Schema; it prints the counts and any
failure and exits 1 when one fails or none matched.

The builder has its own light/dark theme (ADR-0005):

```sh
node tools/proof/theme-shots.mjs http://$FG_HOST:4186/ tools/proof/work/shots
```

screenshots every view, the three dialogs and the phone layout in both
themes (`theme-<theme>-<view>.png`) and the canvas card in the four
combinations of builder theme × form theme (`card-builder-*-form-*.png`),
and prints what it saw: `html` / `colorScheme` / `stored` / `formTheme` /
`version` per theme, `afterReload` (`dark`: the choice survives) and
`errors` (exit 1 when not empty).

## Environment knobs (all optional; `lib.sh` picks defaults)

| Variable | Default | Meaning |
|---|---|---|
| `FG_HOST` | `192.0.2.2` when `HTTPS_PROXY` is set, else `127.0.0.1` | How the browser reaches servers on this machine. In the cloud container, localhost is not reachable from the browser. |
| `FG_STATIC_PORT` | 4180 | `static-server.mjs` serving the exports |
| `FG_BLAZOR_PORT` | 5139 | the Blazor host |
| `FG_SUBMIT_PORT` / `FG_CAPTCHA_PORT` | 4280 / 4281 | the sample servers the scenarios read back from |
| `PLAYWRIGHT_CHROMIUM` | `/opt/pw-browsers/chromium` when present | the browser binary |
| `PLAYWRIGHT_CHANNEL` | unset | a browser installed on the machine (`msedge` on Windows) when no Chromium is downloaded; `PLAYWRIGHT_CHROMIUM` wins when both are set |
| `HTTPS_PROXY`, `PROXY_CA_SPKI` | from the environment / computed | when set, the browser uses the proxy for the CDNs and trusts its CA (`--ignore-certificate-errors-spki-list`), bypassing it for `FG_HOST` |

On a Windows checkout (Git Bash) `lib.sh` fills the gaps itself: no
`setsid` (servers start with `nohup … &`), `pnpm` not on PATH (an `npx
pnpm@10` function), a `python3` that is the Store stub (falls back to
`python`). Set `PLAYWRIGHT_CHANNEL=msedge` to drive Edge.

## Layout

- `lib.sh` — shared defaults and helpers (`start_bg`, `stop_bg`, `wait_http`); sourced by the scripts.
- `setup.sh`, `export-demo.sh`, `strict.sh`, `run-matrix.sh` — the four steps above.
- `examples-check.sh` — the 13-runtime check of the example projects (`examples/`).
- `parity-check.sh`, `metrics-compare.mjs`, `e2e/metrics.mjs`, `e2e/shots.mjs` — the CSS-flavour parity check (ADR-0004).
- `static-server.mjs` — serves a directory and records `/submit` posts (`/last`, `/mode?delay=&fail=1`).
- `react-harness/` — tsconfig and `*.css` module declaration for the React exports.
- `vue-harness/` — Vite config (plugin-vue and Vue from the builder's `node_modules`), `main.ts`, `index.html` template.
- `blazor-proof/FgProof/` — the .NET 8 Blazor Server host. Exports are copied into `Components/Proof/` (ignored); `Components/App.razor` and `Pages/Home.razor` are rendered per run from their `.template` files (the `<!-- FG_HEAD -->` marker takes the framework's CDN tag, `__COMPONENT__` the form's name).
- `e2e/` — the scenarios and `_browser.mjs` (browser launch from the environment knobs); `e2e/event-registration.mjs` drives the examples.
- `demos/` — the demo schemas.
- `builder-check.mjs` — the builder's browser check.
- `canvas-parity.mjs` — the design canvas lays every template out like the preview.
- `theme-shots.mjs` — the builder in light and dark, every view and dialog.
- `server-validate.mjs` — the "Validation" export (zod + JSON Schema) run against the submissions the sample server stored.
- `element-check.sh` — a demo exported as a web component by the CLI, served, driven by its scenario (kind `element`) and compared with the demo's HTML-vanilla result.
- `work/` — outputs, logs, pids, screenshots (ignored).

## Adding a demo for a new feature

1. Write `demos/<name>.json` (a small form around the feature, submit URL
   `http://FG_HOST:4280/submit`).
2. Write `e2e/<name>.mjs` with the same shape as the others: `argv = [url,
   kind, shot]`, drive the scenario, print one JSON object of what you saw,
   keep runtime-specific waits behind `kind === 'blazor'`.
3. Run the four steps; the comparison against HTML vanilla is the proof.
4. Record the scenario in the phase handoff's "How to verify".
