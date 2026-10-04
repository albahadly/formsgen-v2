# Phase 02 — Schema types, element registry, pilot elements

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-02)).

## What was built

- **Canonical schema types** — `packages/renderer/src/schema.ts`: `FormSchema`, `FormMeta`, `ElementNode`, `Rule`/`RuleName`, `Condition`/`ConditionOperator`/`ConditionGroups`, `LayoutConfig`/`ColSpan`, `ThemeTokens`, `SubmitConfig`, `NAME_PATTERN`, `SCHEMA_ID`.
- **Core element semantics** — `packages/renderer/src/elements.ts`: `coreElements` map for the six pilot types (text, textarea, select, checkbox, group, columns) with `hasValue` / `isContainer` / `defaultValue`.
- **Tree helpers** — `packages/renderer/src/tree.ts`: `walkTree`, `findNodeById`, `findParent`, `collectNames`, `uniqueName`, `buildDefaultData` (named containers nest objects; unnamed containers are transparent; `props.default` overrides type defaults).
- **Schema parser** — `packages/renderer/src/parse.ts`: `parseFormSchema(unknown)` structural validator with path-precise errors (used later by project open/import, phase 6); re-exports the closed catalogs as `KNOWN_RULE_NAMES` / `KNOWN_CONDITION_OPERATORS`.
- **Builder registry** — `apps/builder/src/registry/`: `types.ts` (`ElementDefinition`, declarative `PanelControl`/`PanelSection`, `commonFieldSections()` helper), `index.ts` (register/get/list; registration refuses types without core semantics), `factory.ts` (`createNode` — fresh id via nanoid, cloned defaults, unique name, empty children for containers), `elements/<type>.ts` — one file per pilot type with icon + defaultProps + property panel.
- **Kitchen-sink fixture** — `fixtures/kitchen-sink.formsgen.json`: all six pilot types, nested named group (`account`), transparent columns, required/min/max/between/email/regex rules, an equals-condition (`contact_other` shows when `contact_method` = other), a `props.default` (newsletter).
- **Tests** — 25 passing (17 renderer: tree walking, parent lookup, unique names, default-data building against the fixture, parser accept/reject cases with path assertions; 8 builder: registration, category filter, renderer-semantics consistency, panel/icon completeness, createNode behavior).
- **ADR-0001** — element knowledge split between renderer and builder (read it before touching the registry).

## What was intentionally NOT done

- Deferred to phase 3: validation rule EVALUATION, condition EVALUATION, and all rendering (`<FormsGenForm>`); `parse.ts` only checks structure.
- Deferred to phase 4: palette/canvas/properties UI consuming the registry; the i18n catalog (registry labels are plain strings for now — phase 4 must route them through the catalog it introduces).
- Deferred to phase 8: `export` emitters on `ElementDefinition` (field documented in `types.ts` as a comment).
- `conditions` panel control (`kind: 'conditions'`) is declared in the control union and used by definitions, but no UI exists yet (phase 4/5).
- No max-nesting-depth enforcement yet (REBUILD_PROMPT.md says depth 5) — belongs in phase 5 drag-and-drop rules, noted here so it isn't forgotten.

## Key decisions & why

- **ADR-0001**: runtime semantics live in the renderer (`coreElements`), authoring metadata in the builder registry; `registerElement` enforces consistency at startup, and a test re-checks it.
- **Conditions shape is `Condition[][]`** (outer OR, inner AND) rather than a flat list with and/or flags: unambiguous to evaluate and to compile per export target. This refines the master prompt's `Condition[]` sketch — recorded here as the schema is being defined for the first time (no migration needed).
- **Select items are an ARRAY of `{value, label}`** (not a keyed object): preserves order, survives JSON round-trips, and maps cleanly to every export target.
- **`name` uniqueness is per-sibling-scope** (parser enforces); the same name may recur inside different named containers because data nesting disambiguates.
- **Parser is hand-rolled, no zod** — the renderer must stay dependency-free (vue peer only).
- **`structuredClone` for default props** (Node 22 / all modern browsers) instead of JSON round-trip cloning.

## How to verify

```bash
pnpm verify   # 25 tests, lint/typecheck clean, both packages build
```

Quick spot-check: `packages/renderer/src/tree.test.ts` asserts the exact default-data object produced from the kitchen-sink fixture — read that test to understand the data-shape semantics in one place.

## Known issues / gotchas

- Renderer tests import the fixture via relative path (`../../../fixtures/…`); if the fixture moves, three test files break — move them together.
- `exactOptionalPropertyTypes` is why optional interface fields are written as `prop?: T | undefined`; keep doing that or assignment through intermediate objects fails to compile.
- `tsconfig.build.json` excludes `*.test.ts`, so d.ts emit does not see the JSON import — don't import fixtures from non-test renderer sources without adding JSON handling to the build.

## Pointers for the next phase (03 — renderer: render pilots + validation + conditions)

- Build `rules.ts` (evaluators for the 8 rule names) and `conditions.ts` (evaluator for `ConditionGroups` against a flat field-value lookup) in the renderer; export both — the builder's live preview and (much later) export targets' shared-semantics tests reuse them.
- Condition `field` references a `name`; with nested named groups, decide and document lookup semantics (suggestion: nearest-scope first, then root-down path like `account.username` — write it into the schema doc comment when implemented).
- `<FormsGenForm :schema :modelValue>` renders the tree with an internal `type -> component` map (see ADR-0001), validates on blur + submit, hides nodes per conditions, and EXCLUDES hidden fields from data and validation (master prompt §4).
- Vanilla CSS with `fg-` class prefix and CSS variables; remember the lib build will start emitting `formsgen-renderer.css` — the package.json `./style.css` export already points at it.
- Use `buildDefaultData` for initial model values; keep checkbox `required` meaning "must be true".
