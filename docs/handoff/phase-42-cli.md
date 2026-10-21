# Phase 42: the command line

## Status

Complete (2026-10-21), on `main`; commits in `PROGRESS.md`. Gate:
`pnpm verify` green on the Windows checkout with the package in every
workspace run (lint, typecheck, renderer 212 / builder 375 / cli 12 /
server 9 tests, all builds including `dist/formsgen.mjs`); the built
binary exercised in plain Node (recorded under "How to verify").

## What was built

- **`packages/cli` — `@formsgen/cli`, bin `formsgen`**, one self-contained
  Node 20+ script (`dist/formsgen.mjs`, ~2.2 MB) that bundles the
  builder's export code, the renderer and Vue with Vite's SSR build
  (`ssr.noExternal: true`; the renderer's entry imports Vue components and
  the export code uses a `?raw` import, so the CLI is built, not run from
  source). No runtime dependencies.
- **`formsgen export <form.formsgen.json>`** writes what the builder's
  *Export* dialog puts in its "project package" ZIP (`packageFiles` mirrors
  `ExportDialog.vue`): the target's files carrying the embedded project
  (`withProject`; off with `--no-project`), the project file, the target's
  README with the "Change this form later" note, and with `--server` the
  sample submission server under `server/`. `--target <id>` (default
  `html`) or `--target all` (one sub-folder per target, `<id>-<css>` for
  framework-aware ones), `--css vanilla|tailwind|bootstrap5`, `--out <dir>`
  (default `formsgen-export`).
- **`formsgen validate <file>`** parses the project and prints what is
  wrong (exit 1), or a one-line description; **`formsgen targets`** lists
  the seven targets and the CSS flavours; `--help`, `--version`.
- Structure: `commands.ts` (the work, as functions), `run.ts` (Node's
  `parseArgs`, help, exit codes 0 / 1 for a user problem / 2 for usage),
  `cli.ts` (the entry, writes to stdout/stderr). Tests drive `run` with
  captured output and a temp folder: packages for each target, `all`
  layout, every error path, help and version.
- Workspace: the package joins `pnpm -r build/typecheck/test`, so `pnpm
  verify` covers it; `vue-tsc` typechecks it through the same `@` and
  renderer path aliases the builder uses.

## What was intentionally NOT done

- No ZIP output (`jszip` stays in the builder); a folder is what CI wants.
- No npm publish (parked with the renderer's); the README says how to run
  it from the repository.
- `export-demo.sh` and `examples/update.mjs` still drive the targets
  through vitest; switching them to the CLI is a small follow-up.
- No watch mode and no custom templates.

## Key decisions & why

- **One bundled file rather than a thin script importing the builder.**
  The export code is TypeScript with a `@` alias and a `?raw` import, and
  the renderer's entry pulls in `.vue` components; a bundle makes the CLI
  independent of the monorepo's tooling at run time.
- **The dialog's package, file for file.** A CI export and a builder ZIP
  must be interchangeable (reopen in the builder, README, server), so the
  CLI reuses `withProject`, the targets' `readme()` and `sampleServerFiles`.
- **Functions first, parsing second.** `commands.ts` has no printing; the
  tests cover the behaviour without spawning processes.

## How to verify

```sh
pnpm verify
pnpm --filter @formsgen/cli build
node packages/cli/dist/formsgen.mjs validate fixtures/kitchen-sink.formsgen.json
node packages/cli/dist/formsgen.mjs export tools/proof/demos/prefill.json --target all --out /tmp/out
```

Recorded 2026-10-21 on the Windows checkout, the built `dist/formsgen.mjs`
in plain Node 24: `validate` on the kitchen sink → `valid FormsGen project
"Kitchen Sink" (kitchen_sink), 64 elements`; `targets` lists the seven;
`export tools/proof/demos/prefill.json --target all --css tailwind` →
**21 files in seven folders** (`blazor-tailwind`, `html-tailwind`, `json`,
`react-tailwind`, `validation`, `vue-lib`, `vue-standalone-tailwind`);
`validate package.json` → exit 1 with the three reasons; `-v` → `0.1.0`.

## Known issues / gotchas

- The bundle carries Vue and the renderer's components although it never
  renders; trimming would mean a renderer entry without components.
- `parseArgs` is strict: an unknown option exits 2 with Node's message.
- On Windows the paths the command prints use forward slashes.

## Pointers for the next phase

- Phase 43 (Web Component export) is next on the user's roadmap.
