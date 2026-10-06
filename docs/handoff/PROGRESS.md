# Progress — live session memory

The between-sessions memory asked for by the user: what was last done, what is
in flight, and the exact next step. A fresh session reads this first (see
`CLAUDE.md` §1–§2), updates it at every milestone, and commits it with the
work. Phase handoffs (`INDEX.md`) stay the long-form record.

## Where we are (2026-10-06)

- **Branch / remote:** `main` of `albahadly/formsgen-v2`, pushed; last code
  commit `7831f23` (docs) on top of `44cae87` (tests) and `29f0817`
  (review fixes) after the Phase 34 commit `8a1b1b8`.
- **State:** all planned phases (01–11) plus 10b and 12–34 are complete. A
  project-wide review after Phase 34 (12 reviewers, 68 findings: 5 high,
  11 medium, 36 low, 16 nits) is done: 60 fixed, 8 deliberately deferred
  (listed in `phase-34-new-fields.md` → "What was intentionally NOT done").
- **Gates:** `pnpm verify` green (195 renderer / 324 builder / 8 server
  tests); strict compiles 0 errors 0 warnings for the kitchen sink and the
  five demos; 12-runtime matrices identical for the signature, rich-text,
  location, spam-check and wizard demos.
- **Memory and toolkit (2026-10-06):** `CLAUDE.md` + this file are the
  session memory; the verification toolkit lives in `tools/proof/` (see
  its README) and was proven from a cold start: setup, export, strict
  compiles, the 12-runtime wizard matrix (all identical) and the builder
  browser check all pass from the repository copy.

## In flight

- **Phase 35 — backlog round (the review's deferred items), started
  2026-10-06 on `main`.** Plan, in order; each lands as its own commit:
  1. 35e `meta.captcha` in the kitchen-sink fixture (test site key); the
     renderer form tests get a Turnstile stand-in; export snapshots update.
  2. 35d entity parity: the renderer's cleaner decodes named entities like
     the browser parser the exports use (DOM-backed when a DOM exists).
  3. 35a rich-text toolbar roving tabindex (one tab stop, arrows/Home/End,
     RTL-aware) in the renderer and the four code targets + scenario step.
  4. 35c Blazor interop registries forget rich-text/location/signature
     entries of elements no longer rendered (pruned after each render).
  5. 35b no explicit `any` in the generated TypeScript (signature, rich
     text, location, captcha runtimes): typed with small interfaces.
  6. Handoff `phase-35-backlog-round.md`, INDEX row, this file; proofs:
     `pnpm verify`, strict compiles (kitchen sink + demos), richtext and
     wizard matrices through `tools/proof/`.
- Deliberately still deferred: keyboard drawing on a signature pad when
  typing is off; Bootstrap 5 contrast on tertiary backgrounds.
- Uncommitted: nothing yet (plan only).

## Next steps (in order)

1. Work the Phase 35 list above; after each item: tests, commit, update
   this file.
2. Then pick the next phase with the user.

## Open backlog (pointer)

- npm publish of `@formsgen/renderer` — parked by the user.
- Deferred review items: editor toolbar roving tabindex; keyboard way to
  draw a signature when typing is off; `meta.captcha` in the kitchen-sink
  fixture; Bootstrap 5 contrast on tertiary backgrounds; `any` in generated
  TypeScript of the Phase 34 runtimes; entity-decoding parity for unknown
  named entities; Blazor interop registries keeping removed entries. All
  described in `phase-34-new-fields.md`.

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
