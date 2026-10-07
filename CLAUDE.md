# FormsGen v2 — project memory for Claude Code

This file is loaded at the start of every session. It tells a fresh session
where the project stands, which rules the user has set, and how to run the
checks without rediscovering them. Keep it short; details live in the files
it points to.

## 1. Orient (do this first, every session)

1. Read `docs/handoff/PROGRESS.md` — the live progress memory: what was last
   done, what is in flight, the exact next step, and how to resume.
2. Read `docs/handoff/INDEX.md`, then the latest phase handoff it lists.
3. Skim `README.md` (architecture) and, for process rules,
   `REBUILD_PROMPT.md` §10–§11 (handoff format, the Phase Standard).
4. Say in a few lines where the project stands before touching code.

## 2. Progress memory protocol (user rule, 2026-10-06)

The user asked that progress is always written into the project itself so an
expired session is continued, not repeated. So:

- **Update `docs/handoff/PROGRESS.md`** at every milestone: when a task
  starts (what, plan, branch), after each sub-step lands, before any long
  run (matrix, Blazor builds, workflows) with how to check on it, and before
  ending a turn. It must always say what is uncommitted, what is running,
  and the next step. Newest log entry first.
- **Commit and push memory with the work.** Memory-only commits are fine:
  `chore(progress): …`. Never leave in-flight state only in your context or
  in the scratchpad.
- **The scratchpad is lost with the session.** Anything reusable (scripts,
  demo schemas, harnesses) goes into `tools/proof/` and is committed. Only
  outputs, logs and screenshots stay in the scratchpad.
- A phase still ends with its handoff doc + `INDEX.md` row (REBUILD_PROMPT
  §10); PROGRESS.md is the between-handoffs memory, not a replacement.

## 3. Standing rules from the user

- Never disable TLS verification, never unset `HTTPS_PROXY`.
- No model identifiers in code, commit subjects/bodies, PR text or docs.
  The commit trailers the harness asks for are the only exception.
- No pull requests unless asked. Work lands on `main` of
  `albahadly/formsgen-v2` (the user's standing practice), pushed with
  `git push -u origin main`.
- npm publish of `@formsgen/renderer` is parked ("we will come back to it").
- Every phase meets the Phase Standard: `pnpm verify` green, strict compiles
  (React `tsc`, `vue-tsc`, .NET 8 build with 0 errors 0 warnings), the
  12-runtime matrix for new behaviour, handoff doc + INDEX row, ADR for
  cross-phase decisions, kitchen-sink fixture updated.
- Conventional commits scoped to the phase (`feat(phase-35): …`,
  `fix(review): …`, `docs(handoff): …`).

## 4. Repo map

- `packages/renderer` — `@formsgen/renderer`, Vue 3 runtime (parse, rules,
  conditions, composite values, files, location, signature, captcha).
  Field components: `src/components/fields/*`, map in `fieldComponents.ts`.
- `apps/builder` — the builder. Element registry `src/registry/elements/*`;
  export targets `src/export/targets/{html,react,vue-standalone,vue-lib,blazor,json}.ts`
  with shared emitters in `src/export/*.ts`; CSS adapters `src/export/css/*`.
- `packages/submit-server/server.mjs` — sample submission server
  (`--port`, `--dir`, `TURNSTILE_SECRET`).
- `fixtures/kitchen-sink.formsgen.json` — every feature once; tests import it.
- `docs/handoff/*` — one doc per phase; `docs/adr/*` — decisions.
- `examples/` — one form in four stacks (HTML, React, Vue, .NET); the
  exported files there are generated from `examples/form/` by
  `apps/builder/src/export/examples.test.ts` (drift-checked by `pnpm test`;
  `pnpm examples:update` regenerates). `tools/proof/examples-check.sh`
  drives all 13 example runtimes.
- `tools/proof/` — the verification toolkit (see §5).
- CI: `.github/workflows/ci.yml` runs `pnpm verify`; Cloudflare build via
  `build.sh` + `wrangler.jsonc`.

## 5. Verification toolkit (`tools/proof/`)

Everything needed to prove a feature in all 12 runtimes (HTML, React, Vue,
Blazor × vanilla, Tailwind, Bootstrap 5) lives in `tools/proof/`; read its
`README.md`. In short:

- `tools/proof/setup.sh` — one-time per container: installs the harness
  deps (React, esbuild, Playwright) under `tools/proof/node_modules` with
  npm and checks node, dotnet and the Chromium path.
- `tools/proof/export-demo.sh <schema.json> <outdir>` — writes the 12
  exports of a schema (uses the builder's own targets through vitest).
- `tools/proof/strict.sh <outdir> <Component>` — strict compiles.
- `tools/proof/run-matrix.sh <outdir> <Component> <html-basename> <e2e.mjs> <tag>`
  — bundles React/Vue, serves them, drives each runtime with the e2e script
  and compares with the HTML vanilla result (`ONLY=web` / `ONLY=blazor`).
- `tools/proof/e2e/*.mjs` — the scenario scripts; `tools/proof/demos/*.json`
  — the demo schemas they drive (`FG_HOST` placeholder for the local host).
- `tools/proof/builder-check.mjs` — browser check of the builder itself.
- `tools/proof/parity-check.sh` — the three CSS flavours must measure
  IDENTICAL (ADR-0004); run it after any change to `export/css/*`,
  `composite.ts` or the renderer stylesheet.

## 6. Environment facts (cloud container)

- Outbound HTTPS goes through a proxy (`HTTPS_PROXY`, CA bundle
  `/root/.ccr/ca-bundle.crt`). Browsers started by Playwright need
  `proxy: { server: HTTPS_PROXY, bypass: <FG_HOST> }` and
  `--ignore-certificate-errors-spki-list=$PROXY_CA_SPKI` (the toolkit
  computes `PROXY_CA_SPKI` from `/root/.ccr/agent-proxy-ca.crt`) to load
  CDNs (Leaflet, Tailwind, Turnstile).
- A browser reaches servers on this machine at **192.0.2.2**, not
  localhost; bind servers on `0.0.0.0`. The toolkit's `FG_HOST` defaults to
  that when the proxy is present, else `127.0.0.1`.
- Chromium: `/opt/pw-browsers/chromium` (do not run `playwright install`).
  .NET 8 SDK: `dotnet` on PATH. Node 22, pnpm 10 (`pnpm install --offline
  --frozen-lockfile` works for a second checkout).
- Ports used by the toolkit: 4180 static files, 4186 builder preview, 4280
  sample server, 4281 sample server with `TURNSTILE_SECRET`, 5139 Blazor
  host. Turnstile test keys: site `1x00000000000000000000AA`, secret
  `1x0000000000000000000000000000000AA`.
- Kill processes by pid (`ps -eo pid,args | awk …`), never `pkill -f` with a
  pattern that matches your own shell. The git stash is shared between
  worktrees: never bare `git stash`.
- For fixes while long checks read the main checkout, work in a worktree
  (`git worktree add ../formsgen-fix -b <branch>`), then
  `git merge --ff-only` into `main` and remove the worktree.
- A stop hook expects the work committed and pushed before a turn ends.
