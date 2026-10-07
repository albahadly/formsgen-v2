# Progress — live session memory

The between-sessions memory asked for by the user: what was last done, what is
in flight, and the exact next step. A fresh session reads this first (see
`CLAUDE.md` §1–§2), updates it at every milestone, and commits it with the
work. Phase handoffs (`INDEX.md`) stay the long-form record.

## Where we are (2026-10-07)

- **Branch / remote:** `main` of `albahadly/formsgen-v2`, pushed. Phase 36
  commits: `c6f1b25` (derived ids), `464de9b` (renderer export sends),
  `08798ff` (examples) and the docs commit on top.
- **State:** all planned phases (01–11) plus 10b and 12–36 are complete.
  Phase 36 added `examples/` (one form in HTML, React, Vue and .NET, each
  a runnable project; exported files generated from `examples/form/` and
  drift-checked by `pnpm test`; `pnpm examples:update` regenerates) and
  fixed two things the examples exposed: duplicate ids in every export
  when a field is named `<field>_<option>` (ADR-0003) and the renderer
  export ignoring the builder's submit URL. Handoff: `phase-36-examples.md`.
- **Gates:** `pnpm verify` green (198 renderer / 340 builder / 8 server
  tests; builds include `examples/react` and `examples/vue`); the Blazor
  example builds with 0 errors 0 warnings; `tools/proof/examples-check.sh`
  13/13 identical (HTML ×3, React ×3, Vue ×4 incl. the renderer variant,
  Blazor ×3); location demo matrix 12/12 identical after the id change.
- **Memory and toolkit:** `CLAUDE.md` + this file; `tools/proof/` (README
  there) now also has `examples-check.sh` and `e2e/event-registration.mjs`.

## In flight

- Nothing. No uncommitted work, no running checks, no servers.

## Next steps (in order)

1. Nothing is in progress. Pick the next phase with the user (37). For any
   new feature, add a demo + scenario to `tools/proof/` and run the four
   steps (README there); follow `CLAUDE.md` §1–§2 and the Phase Standard.
   A new example stack goes under `examples/` + a `PLACES` row in
   `apps/builder/src/export/examples.test.ts` + a run in
   `tools/proof/examples-check.sh`.

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
