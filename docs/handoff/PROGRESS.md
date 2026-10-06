# Progress — live session memory

The between-sessions memory asked for by the user: what was last done, what is
in flight, and the exact next step. A fresh session reads this first (see
`CLAUDE.md` §1–§2), updates it at every milestone, and commits it with the
work. Phase handoffs (`INDEX.md`) stay the long-form record.

## Where we are (2026-10-06)

- **Branch / remote:** `main` of `albahadly/formsgen-v2`, pushed; Phase 35
  commits `9dba1c7`, `0a9184c`, `691dfd7`, `62581ac` and the final one
  (35b + handoff) on top of the toolkit/memory commits and Phase 34.
- **State:** all planned phases (01–11) plus 10b and 12–34 are complete. A
  project-wide review after Phase 34 (12 reviewers, 68 findings: 5 high,
  11 medium, 36 low, 16 nits) is done: 60 fixed, 8 deliberately deferred
  (listed in `phase-34-new-fields.md` → "What was intentionally NOT done").
- **Gates:** `pnpm verify` green (197 renderer / 325 builder / 8 server
  tests); strict compiles 0 errors 0 warnings for the kitchen sink and the
  five demos; matrices identical for the signature, rich-text, location,
  spam-check and wizard demos (Phase 35 proof run).
- **Phase 35 (2026-10-06) complete:** the review's deferred items: spam
  check in the kitchen sink (35e), entity-decoding parity (35d), one tab
  stop for the rich-text toolbar (35a), Blazor registries forget removed
  elements with a per-render stamp (35c), no `any` in generated TypeScript
  (35b). Handoff: `phase-35-backlog-round.md`.
- **Memory and toolkit (2026-10-06):** `CLAUDE.md` + this file are the
  session memory; the verification toolkit lives in `tools/proof/` (see
  its README), proven from a cold start and used for the Phase 35 proof
  (18 strict builds clean, 51 matrix runs identical).

## In flight

- Nothing. No uncommitted work, no running checks.

## Next steps (in order)

1. Nothing is in progress. Pick the next phase with the user (36). For any
   new feature, add a demo + scenario to `tools/proof/` and run the four
   steps (README there); follow `CLAUDE.md` §1–§2 and the Phase Standard.

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
