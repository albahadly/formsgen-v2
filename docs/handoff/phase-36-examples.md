# Phase 36: examples — one form, four stacks

## Status

Phase complete. 2026-10-07, commits on `main`: `c6f1b25` (derived ids never collide, ADR-0003), `464de9b` (the renderer export sends where the Submit setting points), `08798ff` (the examples) and the `docs(handoff)` commit carrying this file.

The user asked for an `examples` folder with subfolders for Vue, React, .NET and HTML, each implementing the same form template the way a project would. No schema change; ADR-0002 is untouched. ADR-0003 records the id-scheme fix the examples uncovered.

## What was built

- `examples/form/event-registration.formsgen.json` — the one template: heading, intro, first/last name in two columns, email, phone, ticket select, seats (1–5), a dietary choice whose "Other" reveals a required textarea, a workshops checkbox group, arrival date, notes, a required terms checkbox; submit button "Register", posts to `http://localhost:4280/submit` (the sample server).
- `examples/html/{vanilla,tailwind,bootstrap5}/event_registration.html` — the HTML + JS exports, plus a README.
- `examples/react/` — Vite + React 18 + TypeScript app (workspace package `formsgen-example-react`): `src/App.tsx` mounts one of the three exports under `src/forms/<css>/` per `?css=` (lazy import), shows a thank-you line from `onSubmit`; Tailwind v4 (`@tailwindcss/vite`, `src/tailwind.css`) and the `bootstrap` package are loaded only by their variant.
- `examples/vue/` — Vite + Vue 3 + TypeScript app (`formsgen-example-vue`): `src/App.vue` does the same for the three standalone exports and a fourth variant, `src/forms/renderer/EventRegistrationForm.vue` (the Vue renderer-package target, `@albahadly/formsgen-renderer` via `workspace:*`). Its `build` runs `vue-tsc` first; `pnpm -r build` orders it after the renderer, whose `dist` types it needs.
- `examples/dotnet/EventRegistration/` — Blazor Web App, net8.0, interactive server rendering: pages `/`, `/tailwind`, `/bootstrap5`, each `@using` one of `Components/Forms/{Vanilla,Tailwind,Bootstrap5}/EventRegistrationForm.razor`; Tailwind (Play CDN) and Bootstrap (jsDelivr) added per page with `<HeadContent>`; nav links with `data-enhance-nav="false"`; `AddHttpClient()` for the component's `@inject HttpClient`.
- `apps/builder/src/export/examples.test.ts` — generates the 16 exported files of the template with the builder's targets (`withProject`, as *Download* writes them) and fails when a committed file differs; with `FG_EXAMPLES_WRITE=1` it writes them. `examples/update.mjs` + root script `pnpm examples:update` run that. The test also checks the template equals the JSON target's output.
- `tools/proof/examples-check.sh` + `tools/proof/e2e/event-registration.mjs` — build the three apps, serve them (4180 HTML, 4181 React, 4182 Vue, 5139 Blazor), drive the 13 runtimes by labels/roles (empty submit refused, "Other" shows and "Vegan" hides the textarea, full submit stored by the sample server) and compare with HTML vanilla. The examples keep `localhost:4280` as their submit URL; the scenario routes those requests to `FG_HOST` with `context.route`. `cmp` in this script and in `run-matrix.sh` now reports `NO RESULT` for a crashed run instead of comparing two empty results as identical.
- Workspace: `pnpm-workspace.yaml` adds `examples/*`; the lockfile gained React, `@vitejs/plugin-react`, `bootstrap`, `@types/react*`. ESLint ignores the generated files (`examples/*/src/forms/**`, `examples/html/**`); `.gitignore` ignores the .NET `bin/`/`obj/`.
- Docs: `examples/README.md` (map, template, sample server, regeneration), one README per stack with run steps and integration notes, README "Examples" section and workspace row, `CLAUDE.md` §4, `tools/proof/README.md` ("Checking the examples"), ADR-0003.

### The bug the examples found: duplicate ids in every export

The template's `diet` choice with option `other` and its field `diet_other` produced two elements with the id `fg_diet_other` in the HTML, React, Vue and Blazor exports (and `fg-er-diet-other` in the renderer): the textarea's label pointed at the radio, so the scenario could not find "Other" by its accessible name and axe reports a duplicate id. Every id derived from a field id was `fg_<key>_<suffix>` (options, matrix cells, legends, tooltips, add-ons, "to" inputs, longitude, rich-text label, `fg_err_<key>`), and field names may contain `_`. Fixed in `fix(export)`: derived ids join with `-` (`fg_diet-other`, `fg_<key>-err`, …), which no field id can contain; the renderer uses `-opt-` / `-cell-` infixes. Details and consequences in ADR-0003. Snapshots, builder tests and the proof scenarios (`fg_place-lng`) were updated.

### The second finding: the renderer export never sent

The Vue example's renderer variant validated, emitted `submit` and showed the host's thank-you line, but nothing reached the sample server: the Vue (renderer package) target generated a placeholder `onSubmit` (`console.log`), so a form with a submit URL set in the builder sent nothing from that one target while the other five posted. Fixed in `464de9b`: with a URL set, the wrapper calls the renderer's `sendSubmission` (JSON, or multipart when the form has uploads) with the configured method and headers (`sendSubmission` gained a `headers` option); without one, the placeholder stays. The target's README text says which case applies.

## What was intentionally NOT done

- **Renderer suffixes other than options and cells** (`-legend`, `-tip`, `-to`, `-lng`, `-error`, `-prefix`, `-suffix`) keep a plain `-`: builder node ids are random nanoids, so only hand-written ids such as `x` beside `x-to` could clash (ADR-0003). Cut from scope.
- **`pathKey` ambiguity** (`a.b` and `a_b` both key as `a_b`): keys also name C# members and JavaScript state; left as documented in ADR-0003.
- **Tailwind in the Blazor example** uses the Play CDN (no npm pipeline in a .NET app); the README says to generate the CSS with the Tailwind CLI for real use.
- **The Vue example's renderer variant depends on the workspace package**; outside the repository the README points at `pnpm pack` until the npm publish (still parked by the user).
- The examples carry no map, signature, rich text, uploads or spam check on purpose: they show integration, not every feature; the kitchen sink and the proof demos cover those.

## Key decisions & why

- **Generated, not hand-written, and drift-checked.** The exported files in the examples are produced by the targets through a test, so a target change without `pnpm examples:update` fails `pnpm test`, and the examples are always what the builder downloads today. The project block is included (as *Download* does), so each file reopens in the builder.
- **Real projects, in the workspace.** React and Vue are Vite apps with their own `package.json`, built by `pnpm verify`; the Blazor app is a stock `dotnet new blazor` layout. A reader copies a folder, not a harness. The toolkit's `blazor-proof` host stays the proof harness; the example app is for people.
- **One variant per page load, chosen by `?css=`.** Loading Tailwind's preflight or Bootstrap's reboot globally would restyle the vanilla variant, so each variant loads its stylesheet lazily and the nav links reload the page; in Blazor, `<HeadContent>` per page with full-document navigation.
- **Tailwind and Bootstrap from npm in React/Vue, CDN in HTML/Blazor**: each the way that stack's projects normally do it (the HTML export itself links the CDNs).
- **The submit URL stays `localhost:4280`** in the committed files (what a developer runs); the proof scenario rewrites the host at the browser level instead of patching copies.
- **Labels, not ids, in the scenario**: the renderer (`fg-<nodeId>`) and the exports (`fg_<name>`) number their elements differently, and the duplicate-id bug showed why accessible names are the better contract anyway.

## How to verify

```sh
pnpm verify                                    # lint, typecheck, 197 renderer / 339 builder / 8 server tests, builds (incl. examples/react, examples/vue)
pnpm examples:update && git status --short examples   # regenerates; must leave the tree unchanged
cd examples/dotnet/EventRegistration && dotnet build   # 0 errors, 0 warnings
bash tools/proof/examples-check.sh             # 13 runtimes, every line "IDENTICAL", CHECK-DONE
bash tools/proof/export-demo.sh tools/proof/demos/location.json tools/proof/work/loc && bash tools/proof/run-matrix.sh tools/proof/work/loc LocDemoForm loc_demo tools/proof/e2e/location.mjs loc   # the renamed longitude ids in all 12 runtimes
```

Results in this phase: `pnpm verify` green; `dotnet build` 0/0; examples check 13/13 identical (HTML ×3, React ×3, Vue ×4 including the renderer variant, Blazor ×3; the React and Vue hosts show the thank-you line, `extra.host: true`); the location matrix after the id change: 12/12 identical, the three Blazor builds 0 errors 0 warnings.

Manual check: `pnpm --filter formsgen-example-react dev` (or `-vue`), open the URL, switch variants with the links, submit with the sample server running; `dotnet run` in the Blazor app, http://localhost:5200.

## Known issues / gotchas

- The examples check bundles the Vue renderer variant from `packages/renderer/dist`: build the renderer (`pnpm verify` or `pnpm --filter @albahadly/formsgen-renderer build`) before the check after changing renderer sources, or the variant runs on the old code (this bit once in this phase: a run started before `pnpm verify` rebuilt `dist` showed the old option ids).
- `pnpm -r typecheck` does not type-check the Vue example (its check runs inside `build`, after the renderer's `dist` exists); the React example has a `typecheck` script.
- The Blazor pages inject CDN tags through `<HeadContent>`; with enhanced navigation a page switch would keep the previous page's stylesheet, hence `data-enhance-nav="false"` on the links.
- Existing host pages that targeted the old derived ids (`#fg_plan_pro`, `#fg_err_email`) must change to the new ones (ADR-0003).

## Pointers for the next phase

- A new example stack (for instance Svelte or Angular if a target is added) is: a folder under `examples/`, a row in `PLACES` in `examples.test.ts`, a README, runs in `examples-check.sh`.
- Changing the template: edit `examples/form/event-registration.formsgen.json` (or open it in the builder and export the JSON over it), `pnpm examples:update`, re-run the check; the scenario fills fields by label, so renamed labels need `e2e/event-registration.mjs` updated.
- The examples' field set is small by design; the `README`s promise nothing about features outside it.
