# Phase 41: server-side validation export

## Status

Complete (2026-10-21), on `main`; commits in `PROGRESS.md`. Gate:
`pnpm verify` green on the Windows checkout; the generated schemas proven
against payloads in the tests and against the runtimes' real submissions
by the toolkit (recorded under "How to verify").

## What was built

- **A new export target, "Validation"** (`apps/builder/src/export/targets/validation.ts`,
  not framework-aware): `<name>.zod.ts` (zod 3.22+, also zod 4) and
  `<name>.schema.json` (JSON Schema draft 2020-12), with a README on how
  to use each and what each covers.
- **One model, two emitters** (`apps/builder/src/export/validation.ts`):
  the form becomes a tree of typed properties with their rules —
  text-likes strings (dates with `format: date`), numbers nullable
  (ranges not), booleans, choices as enums (plus `''`/`null` when not
  required), lists as arrays of enums or strings, uploads as lists of
  `{ name, size, type }` with the per-file size and count limits, range
  sliders and date ranges as `{ from, to }`, a location as `{ lat, lng }`
  or null, a matrix as an object of rows, named groups nested, repeaters
  as arrays of item objects with their min/max, the spam token as an
  optional string.
- **The renderer's semantics, mirrored** (`rules.ts`): a rule other than
  `required` is skipped while the value is empty; a size is a string's
  length, a list's item count or the number itself; a required checkbox
  must be `true`; rich text is judged by its visible text. zod reuses the
  exports' runtime helpers (`fgIsEmpty`, `fgIsBlank`, `fgSize`,
  `fgDateOrder`, `fgContains`, pruned to the ones used) so emptiness and
  sizes are literally the same code as in the HTML/React/Vue exports.
- **Conditions**: a field hidden by a condition may be absent from a
  submission (`pickVisibleData` leaves it out), so it is optional in both
  schemas; zod re-checks `required` in a `superRefine` when the compiled
  condition chain holds (`compileConditions`, the same compiler the
  exports use). `same-as` and a date range's order are zod refinements.
  JSON Schema has none of those three; the README and the schema's
  `description` say so.
- **Messages** come from the rule or the locale's defaults
  (`defaultRuleMessage`), so a server's error list reads like the form's.
- **Tests** (`targets/validation.test.ts`): the generated zod is
  transpiled with TypeScript and evaluated with the real zod, the JSON
  Schema compiled by ajv (+ formats); a valid payload passes both; blank
  required values, sizes, email/url/regex, enums, conditional required,
  same-as, date order, repeater and file limits, the map point and the
  spam token are each checked for the right paths. The kitchen sink
  generates, transpiles and compiles. The registry test counts seven
  targets; the Arabic phrase map has the label and description.
- **Toolkit**: `export-demo.sh` also writes `validation-<file>`;
  `tools/proof/server-validate.mjs <outdir> <submissions-dir>` picks the
  submissions the sample server stored for that form and validates each
  with both schemas (esbuild transpiles the zod module; zod, ajv and
  ajv-formats live in `tools/proof`). Builder dev dependencies gained
  `zod`, `ajv`, `ajv-formats` for the tests.

## What was intentionally NOT done

- No `if/then` in JSON Schema for conditional requireds: the condition
  language (contains, empty, greater-than on strings) does not map onto
  JSON Schema cleanly; the zod schema carries it, the README says so.
- Conditions inside repeater items are not re-checked in zod (item-scoped
  paths); the item fields are optional when conditional.
- Rich-text size rules are left out of JSON Schema (it cannot strip
  markup); zod strips tags with a simple expression, not the renderer's
  full parser.
- `additionalProperties` is not set: a server may accept extra keys (zod
  drops them by default).
- No CLI yet (phase 42 will expose this target too).

## Key decisions & why

- **A separate target, not files bolted onto React/Vue/Blazor.** The
  server is a different deliverable with a different owner; one download
  gives both formats, framework choice does not apply.
- **Refinements that skip empty values rather than zod's own `.min()`
  etc.** zod's `z.string().min(3)` rejects `''`, the form does not; the
  refinement form reproduces `rules.ts` exactly and reads as one rule per
  line.
- **`anyOf: [{ maxLength: 0 }, …]` for optional sized strings in JSON
  Schema**, for the same reason: fidelity over brevity. Required fields
  get the plain keywords.
- **Proof against real submissions.** The matrices already store what
  each of the 12 runtimes posts; validating those records is the closest
  thing to a server-side matrix.

## How to verify

```sh
pnpm verify
# the export, then the stored submissions of a matrix run:
bash tools/proof/export-demo.sh tools/proof/demos/prefill.json tools/proof/work/prefill
node tools/proof/server-validate.mjs tools/proof/work/prefill <submissions-dir>
```

Recorded 2026-10-21 on the Windows checkout against the submissions the
sample server stored during the phase 39 and 40 matrices: `prefill` —
48 records in the store, **12 matched (one per runtime), 0 failures**
under zod and under JSON Schema (text, number, select, two lists, a
toggle, a nested group, an empty password, a hidden field, a
conditional field); `thanks` — **24 matched (two runs × 12 runtimes), 0
failures**. The first run of the proof matched the 12 `redirect`
records against the prefill form (it has no required rules); the filter
now uses the zod shape's non-optional keys, which a real submission
always carries.

## Known issues / gotchas

- The zod file imports `zod`; the proof script resolves it from
  `tools/proof/node_modules` because the transpiled module is written
  next to the export under `tools/proof/work`.
- A new element type needs a case in `leafShape` (it falls back to a
  string) and, if its value is a new shape, a branch in both emitters.
- The record filter in `server-validate.mjs` matches a form by its field
  names; two demos with identical field sets would both match.

## Pointers for the next phase

- Phase 42 (CLI) is next on the user's roadmap: `formsgen export
  <schema> --target validation` should reuse this target unchanged.
