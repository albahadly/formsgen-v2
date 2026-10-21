# FormsGen

[![CI](https://github.com/albahadly/formsgen-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/albahadly/formsgen-v2/actions/workflows/ci.yml)
[![npm: renderer](https://img.shields.io/npm/v/%40albahadly%2Fformsgen-renderer?label=%40albahadly%2Fformsgen-renderer)](https://www.npmjs.com/package/@albahadly/formsgen-renderer)
[![npm: cli](https://img.shields.io/npm/v/%40albahadly%2Fformsgen-cli?label=%40albahadly%2Fformsgen-cli)](https://www.npmjs.com/package/@albahadly/formsgen-cli)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A drag-and-drop form builder whose forms export to **Vue, React, Blazor
(.NET 8) and plain HTML**, styled with **vanilla CSS, Tailwind or
Bootstrap 5** — or shipped as one JSON schema rendered at run time by the
Vue 3 renderer or by a framework-neutral web component.

**Try it: https://builder.albahadly.com** — build a form, switch the
preview between viewports, light and dark, then *Export* the stack you
use. Nothing is uploaded; your project stays in the browser.

## Install

```sh
# Vue 3 apps: render a schema at run time
npm i @albahadly/formsgen-renderer vue

# Any other page or framework (React, Angular, Svelte, plain HTML, a CMS)
# — the same renderer as a web component, Vue bundled inside
import '@albahadly/formsgen-renderer/element'
<formsgen-form src="./contact.formsgen.json"></formsgen-form>

# Generate code from a schema, for CI and scripts
npx @albahadly/formsgen-cli export form.formsgen.json --target react --css tailwind --out src/forms
npx @albahadly/formsgen-cli validate form.formsgen.json
npx @albahadly/formsgen-cli targets
```

React, Blazor and HTML projects need no library at all: the export (or
the CLI) writes a self-contained component with the validation,
conditions and submit logic inside. `packages/renderer/README.md` and
`packages/cli/README.md` have the details.

## What a form becomes

| Target | Output | Needs |
|---|---|---|
| Vue (renderer) | an SFC wrapping `<FormsGenForm>` | `@albahadly/formsgen-renderer` |
| Vue (standalone) | one zero-dependency SFC | Vue 3 |
| React (standalone) | one typed `.tsx` (+ `.css` for vanilla and Bootstrap, and for Tailwind when the form needs framework-neutral rules) | React 18+ |
| Blazor | a `.razor` component + scoped CSS (`EditForm`, DataAnnotations, `IValidatableObject`) | .NET 8 |
| HTML + JS | one self-contained `.html` | a browser |
| Web Component | `<name>.html` + `formsgen-element.js` | any page: `<formsgen-form src="…">` (ADR-0006) |
| Validation | `<name>.zod.ts`, `<name>.schema.json` | a server: zod, or any JSON Schema validator — the form's rules mirrored |
| JSON schema | `<name>.formsgen.json` | the renderer, the CLI, or re-open in the builder |

Every code target generates for vanilla CSS, Tailwind or Bootstrap 5, and
the ZIP download bundles a README with the exact install steps for the
chosen combination. The three flavours render the same form (one spec for
sizes, spacing and typography, ADR-0004); only colours and each
framework's control skin differ, and a themed form colours all three
alike — `tools/proof/parity-check.sh` measures it.

Exported forms have no npm dependencies, but three features load outside
services at run time, which each README lists with the hosts a
Content-Security-Policy must allow: a **location field** loads Leaflet
from cdnjs (pinned with integrity hashes) and map tiles from OpenStreetMap
or the tile server set on the field; a **spam check** loads Cloudflare
Turnstile and needs the receiving server to verify the token with the
secret key; an **address field** asks its suggestion provider (Nominatim
by default); an **HTML block** may embed https pages in sandboxed iframes.

**Field types**: text, email, phone (with country codes), password, URL,
search, number, currency, slider and two-handle range, date, time,
date-time, month, week, date range, multiple dates, color, select,
multi-select, radio and checkbox groups (list, blocks or buttons),
checkbox, toggle, tags, star rating, NPS scale, matrix, address with
suggestions, file and image upload, signature, location (map), rich
text, calculated value, hidden; groups, columns, tabs, wizard steps and
repeaters for structure; headings, paragraphs (Markdown), quotes, images,
links, HTML blocks and buttons. Validation rules, OR-of-AND visibility
conditions, answers piped into text, URL prefill, saved drafts, a
thank-you message or redirect after submit, themes and dark mode.

The builder's UI comes in English, Arabic (right-to-left), French,
Spanish and German; forms validate in those languages by their own
locale. Eleven starter templates (English and Arabic) show every element
type.

## Workspace

| Path | What |
|---|---|
| `apps/builder` | The builder (Vue 3 + Vite + Pinia + Tailwind), deployed at builder.albahadly.com |
| `packages/renderer` | `@albahadly/formsgen-renderer` — the Vue 3 runtime (ESM + UMD + d.ts + CSS) and the `<formsgen-form>` web component build |
| `packages/cli` | `@albahadly/formsgen-cli` — the builder's exports from the command line, one bundled Node script |
| `packages/submit-server` | A sample submission server: one dependency-free Node file that stores what a form sends (JSON or multipart with files), verifies Cloudflare Turnstile with `TURNSTILE_SECRET`, forwards to a webhook, and answers address suggestions for demos |
| `examples` | One form (event registration) as runnable HTML, React, Vue and .NET projects around the exported files; generated from `examples/form/` and drift-checked by the tests |
| `fixtures` | `kitchen-sink.formsgen.json` — every element type, rule and condition once; test input, export-snapshot source and manual QA script |
| `tools/proof` | The browser-level verification toolkit: exports a demo in all 12 runtimes, strict-compiles them and drives each with the same scenario (`tools/proof/README.md`) |
| `docs/handoff`, `docs/adr` | The development history, one document per phase, and the architecture decision records |

## Development

```bash
pnpm install
pnpm dev        # the builder at http://localhost:5173
pnpm verify     # the gate: lint + typecheck + test + build (CI runs this)
```

Node 22 and pnpm 10 (`packageManager` in `package.json`); the Blazor
export and the examples need the .NET 8 SDK. `pnpm examples:update`
regenerates `examples/` after a change to a target or the example form.

### Architecture in five sentences

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

### Adding an element type (one commit, ~3 files)

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
   run `pnpm verify`, review the snapshot diffs deliberately, and run the
   12-runtime matrix in `tools/proof/` for new behaviour.

### Examples

`examples/` shows the same form, *Event registration*, integrated in each
stack: three self-contained HTML pages, a Vite + React app, a Vite + Vue
app (standalone exports and the renderer export) and a Blazor Web App.
`examples/README.md` has the map, each folder's README the steps and the
integration notes.

## Contributing

`main` only takes pull requests: open one from a branch, CI must pass
`pnpm verify`, and the maintainer reviews and merges (`.github/CODEOWNERS`).
Bugs and ideas go to the issues; security problems to `SECURITY.md`, not
to a public issue. The project is built in phases, each recorded in
`docs/handoff/` with a handoff document and, for cross-cutting decisions,
an ADR — reading the latest handoff is the fastest way into the code.
`CLAUDE.md` and `docs/handoff/PROGRESS.md` are the working notes that
AI-assisted sessions keep; they are part of the repository on purpose.

## Deployment and releases

The builder deploys to **https://builder.albahadly.com** through
Cloudflare Workers Builds: every merge into `main` runs `bash build.sh`
then `npx wrangler deploy`. GitHub Actions (`ci.yml`) runs `pnpm verify`
on every push and pull request.

`@albahadly/formsgen-renderer` and `@albahadly/formsgen-cli` are released
by `.github/workflows/release.yml` (Actions → Release → Run workflow, or
a `v*` tag): it runs `pnpm verify`, then *stages* each package whose
version is not live on npm yet with a stage-only npm token; nothing goes
live until the maintainer approves the staged version on npmjs.com with
2FA. Each version carries an npm provenance attestation. To release: bump
`version` in `packages/renderer/package.json` and
`packages/cli/package.json`, merge, run the workflow, approve.
`docs/handoff/phase-47-npm-release.md` has the steps.

## License

MIT — see `LICENSE`.
