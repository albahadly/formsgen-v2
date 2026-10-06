# FormsGen v2

A drag-and-drop form builder (Vueform-Builder-style UX) whose forms export to
**Vue, React, Blazor, and plain HTML** with **vanilla CSS, Tailwind, or
Bootstrap 5** styling — or as a framework-neutral JSON schema rendered by the
bundled `@formsgen/renderer` package.

Full product/architecture spec: `REBUILD_PROMPT.md` (the master prompt this
project is built from, phase by phase). Development history and context for
every phase: `docs/handoff/INDEX.md`.

## Workspace

| Path | What |
|---|---|
| `packages/renderer` | `@formsgen/renderer` — standalone Vue 3 library that renders a FormsGen JSON schema (ESM + UMD + d.ts + CSS) |
| `packages/submit-server` | Sample submission server: one dependency-free Node file that receives and stores what a form sends (JSON or multipart with files) and, with `TURNSTILE_SECRET` set, verifies the form's Cloudflare Turnstile token; the export dialog can add it to a ZIP |
| `apps/builder` | The builder application (Vue 3 + Vite + Pinia + Tailwind) |
| `docs/handoff` | Per-phase handoff documents — read the latest one first |
| `docs/adr` | Architecture decision records |
| `fixtures` | `kitchen-sink.formsgen.json` — every element type, rule and condition; test input, export-snapshot source and manual QA script in one |

## Commands

```bash
pnpm install
pnpm dev        # run the builder app
pnpm verify     # THE gate: lint + typecheck + test + build (CI runs this)
```

Beyond the gate, `tools/proof/` holds the browser-level verification
toolkit: it exports a demo form in all 12 runtimes, runs the strict
compilers on them and drives each runtime with the same scenario
(`tools/proof/README.md`). Session memory for AI-assisted work lives in
`CLAUDE.md` and `docs/handoff/PROGRESS.md`.

## Architecture in five sentences

1. Everything revolves around one canonical, versioned JSON format
   (`formsgen/v2`, defined in `packages/renderer/src/schema.ts`): a tree of
   `ElementNode`s with props, a closed validation-rule catalog, and
   OR-of-AND visibility conditions addressed by root-relative dot paths.
2. The renderer package owns runtime semantics (rendering, validation,
   conditions, data shape); the builder owns authoring metadata (palette,
   property panels, export emitters) — the registry refuses definitions
   that drift from renderer semantics (ADR-0001).
3. The builder's Pinia store is the single source of truth; every mutation
   goes through an action, which is what makes snapshot-based undo/redo,
   autosave and drag-and-drop guards cheap and correct.
4. Export is a plugin system: `CssFrameworkAdapter`s own every class name,
   `ExportTarget`s own file scaffolds and compile the SAME rule/condition
   catalogs to their language (JS for Vue/React/HTML, C# for Blazor), and
   element definitions contribute per-language markup emitters.
5. Correctness is enforced by one fixture: the kitchen sink drives renderer
   behavior tests, per-target-per-framework export snapshots, and
   behavioral tests that EXECUTE compiled validators against the same
   semantics table as the renderer's own tests.

## Adding an element type (one commit, ~3 files)

1. **Core semantics** — add a line to `coreElements` in
   `packages/renderer/src/elements.ts` (`hasValue`, `isContainer`, default
   value) and, if it needs new rendering, a `Fg*.vue` component + an entry
   in `components/fieldComponents.ts`. Text-like inputs just reuse `FgText`
   via `TEXT_INPUT_TYPES`.
2. **Builder definition** — one file in
   `apps/builder/src/registry/elements/` (icon, default props, declarative
   property panel, and `export` emitters for `vue` / `html` / `react` /
   `blazor` — see `textLike.ts` for the pattern, and omit a language to
   mark it unsupported), registered in `registry/index.ts`.
3. **Prove it** — add the element to `fixtures/kitchen-sink.formsgen.json`,
   run `pnpm verify`, review the snapshot diffs deliberately.

## Export targets

| Target | Output | Needs |
|---|---|---|
| JSON schema | `<name>.formsgen.json` | `@formsgen/renderer`, or re-open in the builder |
| Vue (renderer) | SFC wrapping `<FormsGenForm>` | the renderer package |
| Vue (standalone) | one zero-dependency SFC | Vue 3 only |
| React (standalone) | one typed `.tsx` (+ `.css` in vanilla mode) | React 18 only |
| Blazor | `.razor` + optional scoped CSS | .NET 8 |
| HTML + JS | one self-contained `.html` | a browser |

Every code target generates for vanilla CSS, Tailwind, or Bootstrap 5, and
the zip download bundles a README with exact install steps for the chosen
combination. Exported forms have no npm dependencies, but three features
load outside services at run time, which the README lists with the hosts a
Content-Security-Policy must allow: a **location field** loads Leaflet from
cdnjs (pinned with integrity hashes) and map tiles from OpenStreetMap or the
tile server set on the field; a **spam check** loads Cloudflare Turnstile and
needs the receiving server to verify the token with the secret key; an
**HTML block** may embed https pages in sandboxed iframes.

## Deployment

The builder deploys to **https://builder.albahadly.com** via Cloudflare
Workers Builds: Cloudflare watches this repo and on every push to `main`
runs `bash build.sh` then `npx wrangler deploy`. GitHub Actions (`ci.yml`)
independently runs `pnpm verify` on every push.

## Development process

The project is built in phases (see `REBUILD_PROMPT.md` §9) under a fixed
Phase Standard (§11): every phase starts by reading `docs/handoff/INDEX.md`,
ends with `pnpm verify` green plus a committed handoff doc, and follows the
same Definition of Done checklist.
