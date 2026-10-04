# Phase 01 — Workspace scaffold & tooling

## Status

Complete — 2026-10-04, commit: (first commit of this repo; hash in `git log`).

## What was built

- pnpm workspace with two packages:
  - `packages/renderer` — `@formsgen/renderer` stub: builds as a Vue 3 library (ESM + UMD via Vite lib mode, `.d.ts` via `vue-tsc -p tsconfig.build.json`). Exports `RENDERER_VERSION` and `SCHEMA_ID` placeholders only.
  - `apps/builder` — `@formsgen/builder`: Vue 3 + Vite + Pinia + Tailwind CSS v4 (`@tailwindcss/vite` plugin, `@import 'tailwindcss'` in `src/style.css`). `src/App.vue` renders the three-panel shell (palette / canvas / properties) with `data-testid` hooks; panels are placeholders for phase 4.
- Tooling, all wired through the single gate `pnpm verify` (= lint + typecheck + test + build):
  - ESLint 9 flat config at repo root (`eslint.config.js`): JS + typescript-eslint + eslint-plugin-vue; `no-explicit-any`, `ban-ts-comment`, `no-console` (warn/error allowed) enforced as errors.
  - TypeScript strict base config `tsconfig.base.json` (incl. `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`); per-package tsconfigs extend it; typecheck via `vue-tsc --noEmit` in both packages.
  - Vitest 3 + jsdom in both packages; `@vue/test-utils` in builder. 3 tests passing (2 renderer entry, 1 builder shell smoke test).
  - GitHub Actions workflow `.github/workflows/ci.yml`: pnpm 10 + Node 22, `pnpm install --frozen-lockfile`, `pnpm verify`.
- Process scaffolding: `docs/handoff/` (this file + INDEX.md), `docs/adr/README.md`, `fixtures/README.md`, root `README.md`, `REBUILD_PROMPT.md` (the master spec) copied into the repo.

## What was intentionally NOT done

- Deferred to phase 2: FormSchema types, element registry, pilot element definitions, `fixtures/kitchen-sink.formsgen.json`.
- Deferred to phase 3: everything real in the renderer (`packages/renderer/src/index.ts` is a placeholder — see comment there).
- Deferred to phase 4: actual palette/canvas/properties panels (placeholders marked in `apps/builder/src/App.vue`).
- No Prettier: formatting is left to ESLint + editor defaults for now. Cut from scope unless friction appears; if added later, do it in its own commit with an ADR if it churns the whole tree.
- No i18n catalog yet: App.vue contains hardcoded strings. Phase 4 must introduce the catalog when the real UI starts (repo convention in REBUILD_PROMPT.md §1 requires it "from day one" of real UI work).

## Key decisions & why

- **Tailwind CSS v4** (not v3): current major; no `tailwind.config.js` / PostCSS needed — the `@tailwindcss/vite` plugin + one `@import 'tailwindcss'` line. Theme customization, when needed, goes in CSS `@theme` blocks.
- **Vitest 3 with Vite 6**: vitest 2.x bundles Vite 5 types and conflicts with Vite 6 under `exactOptionalPropertyTypes` (two UserConfig types collide). vitest ^3.2 pairs with Vite 6. Keep these majors in lockstep when upgrading.
- **Vite configs import `defineConfig` from `vitest/config`** (not `vite`): this is what types the `test` key; a triple-slash reference was not sufficient with vue-tsc.
- **Builder consumes the renderer BY SOURCE in dev**: alias `@formsgen/renderer` → `packages/renderer/src/index.ts` in both `apps/builder/vite.config.ts` and its tsconfig `paths`. So builder dev/typecheck/test never require a pre-built renderer dist, while the published package's `exports` map still points at `dist/`. If you add subpath exports to the renderer, mirror them in both aliases.
- **`.d.ts` generation via `vue-tsc --declaration --emitDeclarationOnly -p tsconfig.build.json`** instead of `vite-plugin-dts`: one less dependency; `tsconfig.build.json` flips `noEmit` and excludes tests.
- **`onlyBuiltDependencies: [esbuild, vue-demi]` in `pnpm-workspace.yaml`**: pnpm 10 blocks postinstall scripts by default; declaring approvals in-file keeps CI deterministic (no interactive `pnpm approve-builds`).
- **Named exports only; tests co-located** (`foo.test.ts` next to `foo.ts`) per repo conventions in REBUILD_PROMPT.md §1.

## How to verify

```bash
pnpm install
pnpm verify   # lint + typecheck (both pkgs) + test (3 tests) + build (both pkgs)
pnpm dev      # builder on http://localhost:5173 — three-panel shell,
              # styled by Tailwind, header shows "renderer v0.0.1"
              # (proves the workspace dependency resolves)
```

All four verify stages pass clean (0 lint errors/warnings). Builds: renderer ESM+UMD+d.ts in `packages/renderer/dist/`, builder app in `apps/builder/dist/` (CSS ~8 kB proves Tailwind compiled).

## Known issues / gotchas

- pnpm prints a deprecation warning for a transitive `whatwg-encoding` and the `eslint@9.39.5` line during install — harmless, not ours to fix.
- `pnpm verify` runs typecheck before test; vue-tsc is the slowest step. Fine at this size; revisit ordering/caching only if phases get slow.
- The renderer's UMD build warns about nothing today, but once the renderer has `.vue` files, the lib build will also emit `formsgen-renderer.css` — the `./style.css` export in its package.json already anticipates that file.
- GitHub remote not yet attached at the time this doc was written (repo creation via the integration was 403); push to `albahadly/formsgen-v2` once it exists.

## Pointers for the next phase (02 — schema + registry + pilot elements)

- Put schema types in `packages/renderer/src/schema.ts` (FormSchema, ElementNode, Rule, Condition per REBUILD_PROMPT.md §2) and re-export from `src/index.ts`; the registry contract (`ElementDefinition`, §3) also lives in the renderer package so both renderer and builder consume one source of truth. Builder-only parts of definitions (icon, propertyPanel) can be typed in renderer but provided in builder — decide and record it (likely the first real ADR: where element definitions live so the renderer stays dependency-light).
- Pilot types to implement: text, textarea, select, checkbox, group, columns.
- Start `fixtures/kitchen-sink.formsgen.json` with the pilot types and point the first renderer tests at it.
- `SCHEMA_ID = 'formsgen/v2'` in `src/index.ts` is the `$schema` value — reuse it, don't re-declare.
- ESLint/TS strictness is intentionally harsh (`exactOptionalPropertyTypes` especially) — write new types with `?: T | undefined` where optionality is assigned dynamically, rather than loosening the config.
