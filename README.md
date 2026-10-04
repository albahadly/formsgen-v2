# FormsGen v2

A drag-and-drop form builder (Vueform-Builder-style UX) whose forms export to
**Vue, React, Blazor, and plain HTML** with **vanilla CSS, Tailwind, or
Bootstrap 5** styling — or as a framework-neutral JSON schema rendered by the
bundled `@formsgen/renderer` package.

Full product/architecture spec: `REBUILD_PROMPT.md` (the master prompt this
project is built from, phase by phase).

## Workspace

| Path | What |
|---|---|
| `packages/renderer` | `@formsgen/renderer` — standalone Vue 3 library that renders a FormsGen JSON schema (buildable as ESM + UMD + d.ts) |
| `apps/builder` | The builder application (Vue 3 + Vite + Pinia + Tailwind) |
| `docs/handoff` | Per-phase handoff documents — read the latest one first |
| `docs/adr` | Architecture decision records |
| `fixtures` | Kitchen-sink fixture form (grows from phase 2) |

## Commands

```bash
pnpm install
pnpm dev        # run the builder app
pnpm verify     # THE gate: lint + typecheck + test + build (CI runs this)
```

## Development process

The project is built in phases (see `REBUILD_PROMPT.md` §9) under a fixed
Phase Standard (§11): every phase starts by reading `docs/handoff/INDEX.md`,
ends with `pnpm verify` green plus a committed handoff doc, and follows the
same Definition of Done checklist.
