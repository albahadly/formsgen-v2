# Progress — live session memory

The between-sessions memory asked for by the user: what was last done, what is
in flight, and the exact next step. A fresh session reads this first (see
`CLAUDE.md` §1–§2), updates it at every milestone, and commits it with the
work. Phase handoffs (`INDEX.md`) stay the long-form record.

## Where we are (2026-10-07)

- **Branch / remote:** Phase 37 lives on branch `phase-37` in the worktree
  `../formsgen-parity` (`35ead35` adapters, `821a977` parity check,
  `0909924` sized selects, `022a8ef` docs, `e457f57` invalid state, then
  the floating-labels commit); it is merged into `main` of
  `albahadly/formsgen-v2` and pushed once the final `pnpm verify` is green.
- **State:** all planned phases (01–11) plus 10b and 12–37 are complete.
  Phase 37 made the three CSS flavours render the same form (ADR-0004):
  `tools/proof/parity-check.sh` measures IDENTICAL within 1px on the
  kitchen sink, the examples form and the floating-labels demo at 1200 and
  390px (from 936 / 237 differing metrics). Handoff:
  `phase-37-css-parity.md`.
- **Gates:** parity check IDENTICAL (ks, ex, fl × 1200, 390); builder
  340/340, renderer 198/198; examples check 13/13 identical with Blazor
  0/0 (run before the floating round; the examples have no floating
  labels); final `pnpm verify` in the worktree: see "In flight".

## In flight

- Phase 37 wrap-up, in the worktree `/home/user/formsgen-parity`:
  - `pnpm verify` running on the floating-labels round (log
    `scratchpad/verify-p37-final.log`, ends with `VERIFY-EXIT=<code>`).
  - Then: commit the round on `phase-37`
    (`feat(phase-37): floating labels share Bootstrap's geometry`), in
    `/home/user/formsgen-v2`: `git fetch`, rebase or merge `phase-37`
    onto `main` (`main` has `8a6459f` on top of the branch point),
    `git push -u origin main`, confirm the CI workflow is green, remove
    the worktree (`git worktree remove ../formsgen-parity`), set this
    section to "Nothing".
- Uncommitted on the branch: the floating-labels round (composite CSS and
  `styles.css`, Tailwind strings, `SlotMods.floating`, `markup.ts`,
  `metrics.mjs`, `parity-check.sh` form `fl`, `demos/floating.json`,
  snapshots, examples, ADR/handoff/this file) until that commit lands.

## Next steps (in order)

1. Finish the wrap-up above. If this session died: `pnpm verify` and
   `ONLY=metrics bash tools/proof/parity-check.sh tools/proof/work/p` in
   the worktree must be green/IDENTICAL; commit, merge into `main`, push.
2. Then pick the next phase with the user.

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

- **2026-10-07** — Phase 37 verification: the six-reviewer verify
  workflow failed on the session limit (no findings); states reviewed by
  hand instead. Fixed the error state (`e457f57`: Bootstrap's invalid icon
  and padding, label colour) and floating labels (all three flavours on
  Bootstrap's geometry; new demo `tools/proof/demos/floating.json`, third
  form `fl` of the parity check). Parity check IDENTICAL for ks, ex, fl at
  1200 and 390; builder 340/340, renderer 198/198.
- **2026-10-07** — Phase 37 implemented: one spec for the three flavours
  (ADR-0004), renderer stylesheet mirrored, Bootstrap parity CSS, heading
  `level` modifier, per-display `choiceLayout`, HTML page scaffold,
  Tailwind dark background; parity check IDENTICAL on both forms at 1200
  and 390 (eight measured rounds from 936/237); `pnpm verify` green;
  review workflow `wf_d8fcae04-0b3` launched (journal under
  `~/.claude/projects/-home-user/…/subagents/workflows/wf_d8fcae04-0b3/`).
- **2026-10-07** — Phase 37 (CSS parity) started: measurement scripts,
  baseline metrics and screenshots, draft spec, audit workflow launched.
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
