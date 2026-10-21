# formsGen — Rebuild Plan & Master Prompt

This document contains two things:

1. **An honest analysis of the current project** — what exists, what works, and what's holding it back.
2. **A master prompt** you can paste into Claude (or any capable AI coding agent) to rebuild the form builder from scratch with a much better architecture, inspired by [builder.vueform.com/demo](https://builder.vueform.com/demo).

---

## Part 1 — Analysis of the current project

### What the current app is

A Vue 3 + Webpack app (~1,300 lines) with:

| Piece | File | Role |
|---|---|---|
| Palette | `ComponentPalette.vue` | ~60 element blueprints in 3 tabs (Fields / Static / Structure), search, drag source |
| Canvas | `FormCanvas.vue` | Flat drop list via `vuedraggable`, editor/preview/code toggle |
| Properties | `PropertiesPanel.vue` | Edits the selected element using a Vueform form |
| Preview | `LivePreview.vue` | Renders the schema with `<Vueform>` |
| Export | `ExportControls.vue` | JSON schema, `.vue` SFC string, standalone HTML file |
| State | `store/formBuilder.js` | Pinia store, flat `elements[]` array |

### What's good (keep these ideas)

- The three-panel layout (palette → canvas → properties) is the right UX, same as Vueform's builder.
- The palette catalog is rich: ~37 field types, static elements, structure elements, with icons and descriptions.
- Export already targets three useful formats (JSON / SFC / HTML).
- Schema-driven rendering via a real form engine for live preview.

### What's broken or limiting (why a rebuild is justified)

1. **Flat data model — the biggest limitation.** `elements` is a flat array. Containers (tabs, steps, groups, columns, lists) are just frozen blueprint JSON; you cannot drag a field *into* a container, reorder inside one, or nest. A real builder needs a **tree**.
2. **Properties panel covers only 4 of ~37 types** (`text`, `textarea`, `select`, `checkbox`). Every other element is uneditable. Property definitions are hardcoded in the panel instead of living with the element definition.
3. **Dirty schema on export.** Property edits merge the whole properties-form model into the element schema, so internal keys (like `name`) leak into the exported Vueform schema.
4. **Actual bugs:** the store imports `nanoid` but it's not in `package.json` (app crashes on load); the export language `<select>` has two `value="html"` options; dead files (`test.vue` is empty, `HelloWorld.vue` is leftover); two duplicate unique-name generators in the store; README describes Vite but the build is Webpack.
5. **No builder-grade features:** no undo/redo, no save/load (persistence), no duplicate-element, no conditional logic, no validation-rule UI beyond a raw text field, no form-level settings (name, width, submit endpoint), no keyboard support, no i18n/RTL.
6. **Everything is coupled to Vueform's schema format internally**, which makes adding non-Vueform export targets awkward. Better: an internal canonical format + export adapters.

**Verdict:** the current code is a good prototype and a useful requirements document (especially the palette catalog), but the flat model and hardcoded property panel make incremental fixing more expensive than rebuilding on a tree-based, registry-driven architecture.

---

## Part 2 — The Master Rebuild Prompt

> Copy everything between the lines below into a fresh session/repo. It is self-contained.
> If you prefer to build incrementally, use the **phase prompts** at the end instead — each phase is independently shippable.

---

```
You are going to build "FormsGen v2" — a professional drag-and-drop form builder
web application, from scratch. The UX benchmark is Vueform Builder
(https://builder.vueform.com/demo): three-panel layout, nested drag-and-drop,
rich per-element configuration, live preview, device preview, and one-click
export. The key product goal: a form designed in the builder must be exportable
and usable in ANY new project — with or without a specific form library.

## 1. Tech stack (fixed — do not substitute)

- Vue 3 (Composition API, `<script setup>`) + TypeScript (strict)
- Vite for build/dev
- Pinia for state
- Tailwind CSS for styling (builder UI), CSS variables for theming
- SortableJS via `vuedraggable@next` for drag-and-drop (nested groups)
- `nanoid` for IDs
- Vitest + Vue Test Utils for tests
- NO commercial/licensed dependencies. The live preview is rendered by our own
  schema renderer (see §4), not by a third-party form library.

Project layout (single repo, two packages via pnpm workspaces):

  packages/renderer/   -> "@albahadly/formsgen-renderer": a small standalone Vue 3 library
                          that renders a form from a FormsGen JSON schema.
                          Zero dependencies except Vue. Published/buildable as
                          an npm library (ESM + UMD). This is what makes forms
                          reusable in any Vue project.
  apps/builder/        -> the builder application (imports @albahadly/formsgen-renderer
                          for live preview, so preview === production rendering).
  docs/handoff/        -> per-phase handoff docs (§10)
  docs/adr/            -> architecture decision records (§11)
  fixtures/            -> kitchen-sink.formsgen.json + sample forms (§11)

Repo conventions (fixed, so every phase produces identical-looking code):
- Components `PascalCase.vue`; composables `useX.ts`; one element
  definition per file in `elements/<type>.ts`; export targets in
  `export-targets/<id>.ts`; CSS adapters in `css-adapters/<id>.ts`.
- Tests co-located: `foo.ts` -> `foo.test.ts` next to it.
- Named exports only (no default exports) except .vue SFCs.
- All user-facing builder strings go through the i18n catalog from day one.

## 2. Canonical schema (the heart of the system)

Define a versioned, renderer-agnostic JSON format. Everything in the app reads
and writes this format. Export adapters translate FROM it.

```ts
interface FormSchema {
  $schema: 'formsgen/v2'
  meta: {
    name: string            // machine name
    title?: string
    description?: string
    locale: string           // default 'en'
    dir: 'ltr' | 'rtl'       // full RTL support is required
    submit?: { url?: string; method?: 'POST'|'PUT'; headers?: Record<string,string> }
    theme?: ThemeTokens      // colors, radius, spacing scale, font
  }
  tree: ElementNode[]        // ordered tree — THE source of truth
}

interface ElementNode {
  id: string                 // nanoid, stable for the node's lifetime
  type: string               // registry key, e.g. 'text', 'select', 'group'
  name?: string              // data key (inputs only); unique among siblings
  props: Record<string, unknown>   // label, placeholder, items, min/max, ...
  validation?: Rule[]        // [{rule:'required'},{rule:'min',value:3},...]
  conditions?: Condition[]   // visibility logic: {field,'operator',value}+and/or
  layout?: { colSpan?: 1|2|3|4|6|12; width?: string }
  children?: ElementNode[]   // containers only
}
```

Data values never live in the schema; submitted data is a separate object keyed
by the `name` path (nested containers with a name create nested objects; list
elements create arrays).

## 3. Element registry (the extensibility mechanism)

Every element type is ONE self-contained definition object registered in a
central registry. Nothing about a type is hardcoded anywhere else — the
palette, the canvas chrome, the properties panel, the renderer, and the
exporters all read from the registry.

```ts
interface ElementDefinition {
  type: string
  category: 'fields' | 'static' | 'structure'
  label: string
  description: string
  icon: Component | string        // inline SVG component
  isContainer?: boolean           // accepts children
  hasValue?: boolean              // participates in form data
  defaultProps: Record<string, unknown>
  defaultValidation?: Rule[]
  propertyPanel: PanelSection[]   // declarative config UI (see below)
  renderPreview: Component        // used by @albahadly/formsgen-renderer
  export: Record<TargetId, ElementEmitter>
  // per-export-target markup emitters, e.g.
  // { vue: (node, ctx) => string, react: ..., blazor: ..., html: ...,
  //   vueform?: (node, ctx) => object }
  // A type may omit a target; the target then reports it as unsupported
  // with a clear comment in the generated code instead of failing.
}
```

Export targets themselves are plugins too (see §7b): an `ExportTarget`
contributes the file scaffolding (SFC / .tsx / .razor / .html shell), the
state + submit wiring, and the compiled validation/condition logic in that
target's language; the element emitters above only produce each element's
markup snippet.

`ctx` passed to every emitter includes `ctx.css: CssFrameworkAdapter`
(see §7a) — emitters NEVER hardcode class names; they ask the adapter
(`ctx.css.classes('input')`, `ctx.css.classes('label')`, `ctx.css.wrapRow(...)`)
so the same emitter works for Tailwind, Bootstrap, or vanilla-CSS markup —
and `ctx.target` for target-specific syntax helpers (e.g. how to bind a
value: `v-model` / `value+onChange` / `@bind-Value`).

`PanelSection` is a declarative description of the properties panel for that
type: sections (Properties / Data / Layout / Validation / Conditions /
Attributes — same grouping as Vueform Builder) each containing typed controls
(text, number, toggle, select, key-value-list editor for options/items, rule
builder, condition builder). Build ~8 reusable panel control components and
compose every element's panel from them.

Initial element set (match the old project's catalog):
- Fields: text, number, email, phone, password, url, textarea, rich hint of
  editor (plain textarea with toolbar placeholder is fine), checkbox,
  checkbox-group (list/blocks/tabs views), radio, radio-group (list/blocks/tabs
  views), select, multiselect, tags, toggle, date, datetime, time, date-range,
  slider, range-slider, file, multi-file, image, multi-image, hidden, rating,
  signature-placeholder, captcha-placeholder, matrix (radio grid).
- Static: submit/reset/custom buttons, h1–h4, paragraph, quote, image, link,
  divider, raw HTML, alert/info box.
- Structure: container (group), 2/3/4 columns (containers with column layout),
  tabs, steps (wizard with next/prev + per-step validation), repeating list,
  nested-object list.

## 4. The renderer package (@albahadly/formsgen-renderer)

A standalone library: `<FormsGenForm :schema="..." v-model="data" @submit>`.
- Recursively renders the tree; applies validation on blur + on submit;
  evaluates conditions reactively (hidden fields are excluded from data and
  validation); supports steps/tabs navigation; emits typed events.
- Ships its own minimal, themeable CSS (CSS variables, light/dark, RTL-aware
  logical properties). No Tailwind dependency in the package output.
- Supports **class presets**: `<FormsGenForm :schema="s" preset="vanilla" />`
  where preset is 'vanilla' (default, uses the shipped CSS), 'tailwind', or
  'bootstrap'. A preset is a plain mapping object { slot -> class string }
  covering every render slot (wrapper, row, label, input, select, checkbox,
  error, help, button, tabs, steps, ...). The tailwind/bootstrap presets ship
  with the package but reference the host project's framework (the package
  never bundles Bootstrap or Tailwind itself); consumers can also pass a
  custom preset object to match any design system.
- Buildable with `vite build --mode lib` producing ESM + UMD + .d.ts, so a
  consumer can `npm i @albahadly/formsgen-renderer` (or copy the dist file) and render
  any exported JSON schema.

## 5. Builder application features

Layout: header toolbar + three resizable panels (palette | canvas | properties)
+ collapsible bottom drawer for export. Persist panel sizes.

Palette:
- Tabs by category + fuzzy search across label/description.
- Drag to canvas (clone), or double-click / press Enter to append.

Canvas (editor mode):
- Renders the real form via @albahadly/formsgen-renderer in "design mode": each element
  wrapped with selection chrome (hover outline, selected ring, type badge,
  drag handle, duplicate + delete buttons).
- NESTED drag-and-drop: drop into containers, reorder anywhere, move between
  containers. Empty containers show a labeled dropzone. Max nesting depth 5.
- Click selects; Esc deselects; Delete removes; Ctrl/Cmd+D duplicates (deep
  clone with new ids and auto-renamed `name`s); arrow keys move selection.
- Element tree sidebar toggle (outline view of the tree, click-to-select,
  drag-to-reorder) like Vueform Builder's tree.

Canvas toolbar:
- View: Editor / Preview (fully interactive, no chrome) / Code (live JSON with
  syntax highlighting, read-only + "copy").
- Device: mobile (375px) / tablet (768px) / desktop (100%) — constrains the
  canvas width in all views.
- Theme toggle for the PREVIEWED FORM (light/dark) independent of builder UI.
- Undo / Redo buttons with history depth ≥ 50 (see §6).
- Form settings dialog: meta fields (name, title, locale, dir, submit config,
  theme tokens with color pickers).

Properties panel:
- Driven entirely by the registry's `propertyPanel` definition.
- Common sections for all value elements: Properties (label, placeholder,
  description, hint), Data (name — validated unique + slug format — default
  value), Layout (column span 1–12, visibility per device), Validation (rule
  builder: add/remove rules from a catalog — required, min, max, between,
  email, url, regex, same-as — with value inputs where needed), Conditions
  (visual condition builder: field picker from other named elements, operator,
  value, AND/OR groups), Attributes (id, class, autocomplete, readonly,
  disabled).
- Changes apply immediately (live preview updates) and are undoable.

## 6. State, history, persistence

- Pinia store holds `schema` (the tree), `selectedId`, `clipboard`.
- All mutations go through named actions; wrap them in a history layer
  (immutable snapshots or patch-based) for undo/redo with keyboard shortcuts
  Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z. Drag operations = one history entry.
- Autosave the whole project to localStorage (debounced 500ms); restore on
  load with a "restored draft" toast + "start fresh" option.
- Project file: "Save" downloads `<name>.formsgen.json` (the FormSchema);
  "Open" imports and validates it (with schema version check + friendly
  errors). This is distinct from export.

## 7. Export & reuse in a new project (the product's purpose)

An "Export" dialog with two global options at the top, then target tabs:

- **Global option A — CSS framework:** `Vanilla CSS` (default) | `Tailwind` |
  `Bootstrap 5`. Applies to every code-generating target (Vue SFC, React,
  Blazor, HTML, and the preset used in library-mode snippets). See §7a.
- **Global option B — download mode:** `Single file` (just the code) or
  **`Project package (.zip)`** — a ready-to-drop-in folder containing the
  generated code PLUS a tailored `README.md` with exact, copy-paste install
  steps for that target and framework (npm commands, import lines, where to
  register styles, how to receive submitted data). "Use it in a new project"
  must never require guesswork: the README is generated from the actual
  export choices.

Every target tab shows highlighted code (use `highlight.js` or `shiki`), a
Copy button, and the Download button:

1. **JSON schema** — the canonical FormSchema. Round-trips: the builder's
   Import accepts this same file, so a form exported from one machine/project
   can be re-imported and edited anywhere. Zip mode adds a README showing the
   3-line @albahadly/formsgen-renderer usage.
2. **Vue 3 SFC (library mode)** — a small .vue file importing
   @albahadly/formsgen-renderer with the schema inlined and the chosen class preset
   applied. Zip mode: component + README (`npm i @albahadly/formsgen-renderer`, style
   import, v-model/submit wiring example).
3. **Vue 3 SFC (standalone)** — a ZERO-DEPENDENCY .vue file: plain template
   markup generated per element from the registry's `vueTemplate` using the
   chosen CssFrameworkAdapter, reactive data object, hand-rolled validation
   functions from the rules, conditions compiled to computed properties.
   With Vanilla CSS the styles are included as scoped CSS; with
   Tailwind/Bootstrap the markup carries framework classes and the README
   states the framework prerequisite. Must compile as-is in a fresh
   `npm create vue@latest` project.
4. **Plain HTML + JS** — one self-contained .html file: semantic form markup,
   vanilla JS validation + conditions + steps logic. Vanilla CSS = embedded
   stylesheet, opens from disk with no network. Tailwind/Bootstrap = framework
   classes in the markup plus a clearly marked CDN `<link>`/`<script>` block
   at the top that the user can swap for their local build.
5. **React component (standalone)** — a ZERO-DEPENDENCY `.tsx` file (React
   18+, function component): `useState` for form data, the same validation
   rules compiled to plain TS functions, conditions as derived values,
   controlled inputs, steps/tabs as local state. CSS framework option applies
   (vanilla CSS emitted as a co-located `.css` file in zip mode / a `<style>`
   injection in single-file mode). Must compile as-is in a fresh
   `npm create vite@latest -- --template react-ts` project.
6. **Blazor component** — a `.razor` file (+ optional `.razor.css`) targeting
   .NET 8: an `@code` block with a POCO model class generated from the
   schema's named fields (typed: string/int/decimal/bool/DateTime/List<T>),
   `EditForm` + `@bind-Value` wiring, validation emitted as C# — standard
   `DataAnnotations` attributes where a rule maps 1:1 (Required, Range,
   EmailAddress, RegularExpression, MinLength/MaxLength) and a generated
   `IValidatableObject` section for the rest (same-as, conditional rules).
   Conditions become computed C# properties. Works in both Blazor Server and
   WebAssembly; README explains adding it to a fresh `dotnet new blazor`
   project.
7. **Vueform schema (optional adapter)** — for users who already use Vueform:
   emit the equivalent Vueform JSON schema where a mapping exists; list
   unsupported elements in a warning comment.

Export correctness is tested: for a fixture form covering every element type,
snapshot-test each generator's output **per CSS framework** (code targets ×
three frameworks), run the generated JS/TS validation logic against sample
data in unit tests, and compile-check the generated artifacts in CI where
toolchains allow (`vue-tsc` for the SFC, `tsc --jsx` for the React file;
Blazor output is covered by snapshot tests plus a `dotnet build` smoke test
job that is allowed to be optional/skipped when the SDK is absent).

## 7a. CSS framework adapters

One `CssFrameworkAdapter` interface, three built-in implementations
(vanilla, tailwind, bootstrap5), used in BOTH places styling decisions occur:
the renderer's class presets (§4) and the export generators (§3). Keep the
two in sync by deriving both from the same mapping tables.

```ts
interface CssFrameworkAdapter {
  id: 'vanilla' | 'tailwind' | 'bootstrap5'
  classes(slot: Slot, node?: ElementNode): string   // e.g. 'input' ->
    // vanilla: 'fg-input'  | tailwind: 'block w-full rounded-md border ...'
    // bootstrap5: 'form-control'
  wrapRow(colSpan: number, inner: string): string   // grid: fg grid /
    // tailwind grid-cols-12 col-span-N / bootstrap row + col-N
  stylesheet?(): string   // vanilla only: the full generated CSS (uses the
    // form's ThemeTokens as CSS variables); undefined for the others
  assets?(): { links: string[]; scripts: string[] } // CDN refs for HTML export
}
```

Rules:
- Element generators never contain a literal class name — adapter only.
- Bootstrap mapping must use proper idioms (form-label, form-control,
  form-select, form-check, is-invalid + invalid-feedback, btn btn-primary,
  nav-tabs for tabs, etc.), not vanilla classes renamed.
- Tailwind mapping must produce a form that looks polished with stock
  Tailwind (no plugin required; if @tailwindcss/forms is detected-worthy,
  mention it as optional in the README).
- Vanilla CSS output is BEM-ish (`fg-` prefix), themeable via the schema's
  ThemeTokens, dark-mode and RTL aware.
- The canvas preview always renders with the vanilla preset; an optional
  preview dropdown lets the user preview tailwind/bootstrap (loaded via CDN
  inside the preview iframe only — the builder itself never depends on them).
- Adding a 4th framework (e.g. Bulma) must require only: one new adapter file
  + one renderer preset + snapshot tests. Document this in the README.

## 7b. Export target plugins (multi-framework codegen)

Code-generating targets share one plugin interface so new UI frameworks
(Svelte, Angular, ...) can be added without touching element definitions
beyond adding their emitter:

```ts
interface ExportTarget {
  id: TargetId                    // 'vue' | 'vue-lib' | 'react' | 'blazor' | 'html' | 'json' | 'vueform'
  label: string
  language: 'vue' | 'tsx' | 'razor' | 'html' | 'json'
  scaffold(form: FormSchema, body: string, ctx: Ctx): ExportedFile[]
    // the component shell: imports/usings, state (reactive refs / useState /
    // POCO model), submit handler, steps/tabs navigation, emitted styles
  compileRules(rules: Rule[], field: FieldRef, ctx: Ctx): string
    // validation in the TARGET'S language: TS functions for vue/react/html,
    // DataAnnotations + IValidatableObject C# for blazor
  compileCondition(cond: Condition[], ctx: Ctx): string
    // computed property / derived value / C# bool property
  readme(form: FormSchema, ctx: Ctx): string   // install steps for zip mode
}
```

Rules that keep per-target cost low (follow these strictly):
- The validation rule catalog and condition operator set are CLOSED, small
  lists defined once in core. Each target implements each rule/operator
  exactly once — so a new target is ~(rules + operators + ~40 element
  emitters + 1 scaffold), roughly the cost of the HTML target, not a rewrite.
- Element emitters are dumb string builders: all logic (validation,
  visibility, data shape) lives in the scaffold/compilers. An element
  emitter only renders markup + the target's binding syntax from
  `ctx.target.bind(name)`.
- The fixture-form snapshot suite runs automatically for EVERY registered
  target × CSS framework, so a new target ships with full coverage by
  construction.
- Semantics must match across targets: one shared spec test table (input
  data -> expected validity/visibility) is executed against the JS targets
  directly and encoded into the Blazor snapshot expectations, so a form
  behaves identically wherever it is exported.

## 8. Quality bar

- TypeScript strict; no `any` in src.
- i18n-ready builder UI (simple message catalog, en included) and full RTL
  support in both builder UI and rendered forms (use CSS logical properties).
- Accessibility: every input labeled/associated, drag-and-drop has keyboard
  alternative (move up/down/into/out via menu or shortcuts), focus management
  in dialogs, ARIA on tabs/steps.
- Tests: unit tests for store actions + history, name-uniqueness, condition
  evaluation, rule validation, every export adapter; a few component tests for
  palette→canvas add and properties editing. CI runs the single gate
  command `pnpm verify` (= lint + typecheck + test + build, see §11) via a
  GitHub Actions workflow added in phase 1.
- README with architecture diagram, "add a new element type in one file"
  guide, and export usage instructions for each target.

## 9. Build order (implement in this sequence, keep it compiling at each step)

1. Workspace scaffold, Tailwind, lint/typecheck/test wiring.
2. Schema types + element registry + 6 pilot types (text, textarea, select,
   checkbox, group, columns).
3. Renderer package rendering the pilot types + validation + conditions.
4. Builder shell: three panels, palette, flat canvas add/select/delete,
   registry-driven properties panel.
5. Nested drag-and-drop + tree sidebar + duplicate + keyboard support.
6. History (undo/redo) + autosave + project save/open.
7. Preview/code/device/theme toolbar + form settings.
8. CSS framework adapters (vanilla + tailwind + bootstrap5) and renderer
   class presets, then the ExportTarget plugin interface (§7b) and the
   export dialog with the core targets (JSON, Vue SFC library + standalone,
   HTML), the framework selector, zip "project package" mode with generated
   READMEs, and per-framework export tests.
9. Add the React and Blazor export targets as §7b plugins (emitters for
   every element, rule/condition compilers, scaffolds, READMEs, snapshot +
   compile-check tests). This step must not require touching core code —
   if it does, fix the plugin interface first.
10. Fill in the full element catalog (every type from §3), including each
   type's emitters for all registered targets.
11. Polish: a11y pass, RTL pass, README, demo fixture form.

Do not skip steps. After each step, state what works and how to verify it
manually in the browser.

## 10. Phase handoff documents (required after EVERY step)

At the end of each build-order step, before starting the next one, write
`docs/handoff/phase-NN-<short-name>.md` and commit it with that phase's
code. Its purpose: the next phase (possibly a fresh AI session with zero
memory of this one) must be able to continue with full context from the
handoff alone. Keep it factual and current — an outdated handoff is worse
than none.

Required sections (use exactly these headings):

1. **Status** — one line: phase complete / partially complete, date,
   commit hash.
2. **What was built** — bullet list of features/files delivered, with
   paths (e.g. `packages/renderer/src/conditions.ts — condition evaluator,
   all operators`).
3. **What was intentionally NOT done** — deferred items, stubs, TODOs,
   and WHERE they live in the code (path + marker comment). Distinguish
   "deferred to phase N" from "cut from scope".
4. **Key decisions & why** — anything a future contributor might re-ask:
   chosen libraries, data-shape choices, naming conventions, workarounds
   for upstream bugs (with links).
5. **How to verify** — exact commands (`pnpm test`, `pnpm dev` + what to
   click) proving this phase works; current test count and coverage areas.
6. **Known issues / gotchas** — failing or flaky anything, surprising
   behaviors, things that look wrong but are intentional.
7. **Pointers for the next phase** — which files the next step will touch,
   extension points prepared for it, and anything learned this phase that
   changes the plan for later phases (if the plan changed, say what and why).

Also maintain a single `docs/handoff/INDEX.md` table (phase | status |
doc link) updated each phase. When starting any phase, FIRST read
`INDEX.md` and the latest handoff doc, and say so before writing code.

## 11. The Phase Standard (identical workflow for every phase)

Every phase — no exceptions — runs the same lifecycle:

1. **Orient.** Read `docs/handoff/INDEX.md`, the latest handoff, and any
   ADRs touched by this phase (see below). Summarize project state in a
   few lines before writing code.
2. **Plan.** List the files you will create/modify, the tests you will
   add, and this phase's slice of the kitchen-sink fixture (below). If the
   plan deviates from the build order or an earlier decision, write an ADR
   first.
3. **Implement** in small, compiling increments.
4. **Verify.** Run `pnpm verify` and do the manual browser check from the
   phase goal.
5. **Hand off.** Write the phase handoff doc (§10), update INDEX.md.
6. **Commit.** Conventional-commit style, scoped to the phase:
   `feat(phase-04): registry-driven properties panel`. One phase may have
   several commits; the last one adds the handoff.

**Single gate command.** `pnpm verify` = lint + typecheck + all tests +
build of both packages. Define it in phase 1 and never weaken it. A phase
is NOT done while `pnpm verify` fails — "it works in the browser" does not
override a red gate.

**Definition of Done — all boxes checked before a phase is complete:**
- [ ] `pnpm verify` passes clean (no skipped tests, no new warnings)
- [ ] New code has tests (logic: unit tests; UI: at least smoke tests)
- [ ] No `any`, no `@ts-ignore`, no `console.log` left in src
- [ ] Every TODO in code carries a phase tag: `// TODO(phase-07): ...`
      — untagged TODOs fail review
- [ ] Kitchen-sink fixture updated and loads without errors
- [ ] Handoff doc written, INDEX.md updated
- [ ] Manual verification steps from the phase goal performed and
      recorded in the handoff ("How to verify" section)

**Scope control.** A phase implements ITS step only:
- Don't refactor earlier phases' code in passing. If a refactor is truly
  needed, do it as a separate commit, justify it in the handoff under
  "Key decisions", and keep it minimal.
- Don't pre-build later phases "while you're at it". Prepare extension
  points only where the build order says so.
- Found a bug in earlier work? Fix it in its own `fix(phase-NN): ...`
  commit and record it in the handoff.

**ADRs for cross-phase decisions.** Decisions that outlive one phase
(schema shape changes, library swaps, plugin interface changes) get a
numbered record in `docs/adr/NNNN-title.md`: Context / Decision /
Alternatives considered / Consequences — half a page max. Handoffs
reference ADRs instead of restating them. Changing the FormSchema format
after phase 2 REQUIRES an ADR plus a version bump and a migration note.

**Kitchen-sink fixture as living acceptance artifact.** Maintain
`fixtures/kitchen-sink.formsgen.json` from phase 2 onward: every element
type, validation rule, condition, and container pattern implemented so
far appears in it at least once. Tests import it (renderer tests, export
snapshots); manual QA loads it in the builder. If a feature isn't in the
kitchen sink, it isn't done.
```

---

## Part 3 — Optional phase-by-phase prompts

If you'd rather drive the build in smaller sessions, paste the master prompt's §1–§3 (stack + schema + registry) **and §10–§11 (handoffs + the Phase Standard)** as context every time. Then start each phase with this uniform kickoff template — same shape every time, only the bracketed parts change:

```
PHASE [NN] — [name from the build order]

Follow the Phase Standard (§11) lifecycle exactly:
1. Read docs/handoff/INDEX.md + the latest handoff; summarize project state.
2. Post your plan: files to create/change, tests to add, kitchen-sink
   fixture additions.
3. Goal: [the build-order step text]
4. Acceptance: [1–3 concrete things I can do in the browser afterward,
   e.g. "drag a text field into a 2-column group and see it in preview"]
5. Done = Definition of Done checklist (§11) fully checked, `pnpm verify`
   green, handoff doc committed.

Out of scope: everything in later build-order steps. If you believe the
plan must change, write an ADR and say so in the handoff — do not silently
deviate.
```

Phase goals to drop into that template, one at a time:

1. *"Implement build-order steps 1–3: workspace, schema types, registry with the 6 pilot element types, and the @albahadly/formsgen-renderer package with validation and conditions. Include unit tests for condition evaluation and rule validation."*
2. *"Implement step 4: the builder shell with palette, canvas (flat), selection, and the registry-driven properties panel for the pilot types."*
3. *"Implement step 5: nested drag-and-drop into containers, the element tree sidebar, duplicate, and keyboard interactions."*
4. *"Implement step 6: undo/redo history, localStorage autosave with restore toast, and project save/open as .formsgen.json."*
5. *"Implement step 7: preview/code view, device widths, form theme toggle, and the form settings dialog."*
6. *"Implement step 8: the CSS framework adapters (vanilla, Tailwind, Bootstrap 5) with renderer class presets, the ExportTarget plugin interface, and the export dialog with the core targets (JSON, Vue SFC library + standalone, HTML), the framework selector, and the zip project-package mode with generated per-target READMEs — with snapshot tests per target per framework and behavioral tests for the generated standalone validation logic."*
7. *"Implement step 9: the React (.tsx standalone) and Blazor (.razor, .NET 8) export targets as plugins — element emitters, validation compiled to TS and to C# DataAnnotations/IValidatableObject respectively, condition compilers, scaffolds, generated READMEs, and the shared-semantics test table run against both."*
8. *"Implement step 10: extend the registry to the full element catalog, with emitters for all registered export targets."*
9. *"Implement step 11: accessibility pass, RTL pass, README, and a demo fixture form covering every element."*

---

## Key architectural decisions (and why)

| Decision | Why |
|---|---|
| **Tree, not flat list** | Nesting (tabs/steps/columns/groups/lists) is the core of a real builder; the current flat model made containers fake. |
| **Element registry** | The current app hardcoded property panels for 4/37 types. With a registry, adding a type = one file; palette, panel, renderer, exports all come for free. |
| **Own renderer package** | "Use it in any new project" means not depending on a commercial builder/runtime. Preview and production render identically, and the npm package makes JSON-schema forms portable. |
| **Canonical schema + export adapters** | Internal format stays stable; Vueform (or React, or Laravel validation rules…) become adapters you can add later without touching the core. |
| **Standalone SFC/HTML exports** | For consumers who want zero dependencies — the form survives even if FormsGen disappears. |
| **CSS framework adapters** | One adapter interface drives both preview presets and code generation, so Tailwind / Bootstrap 5 / vanilla CSS output stays consistent and a new framework is one file away. |
| **Zip "project package" export** | Exporting code is not enough — each download bundles a generated README with the exact install/import steps for that target + framework, so dropping a form into a brand-new project requires zero guesswork. |
| **ExportTarget plugins (React, Blazor, …)** | The schema is UI-framework-neutral and the validation/condition catalogs are closed lists, so each new framework costs one plugin (emitters + rule compiler + scaffold) — roughly the effort of the HTML target — never a core rewrite. Blazor proves the pattern works across languages (C#), not just across JS frameworks. |
| **Per-phase handoff docs** | The build spans many sessions (human or AI). A committed `docs/handoff/phase-NN.md` after every step — what's done, what's deferred and where, decisions, verify commands, pointers — means any fresh session can resume with full context instead of re-discovering (or contradicting) earlier work. |
| **One Phase Standard + Definition of Done** | Every phase runs the identical lifecycle (orient → plan → implement → `pnpm verify` → handoff → conventional commit) against the same checklist, with scope-control rules and ADRs for cross-phase decisions. Uniform process is what keeps ten phases built in ten different sessions looking like one codebase. |
| **Kitchen-sink fixture** | One growing `.formsgen.json` containing every implemented feature doubles as test input, export-snapshot source, and manual QA script — "if it's not in the kitchen sink, it isn't done" makes completeness checkable. |
| **Undo/redo + autosave from day one** | Builders are editing tools; losing work is the one unforgivable bug. |
| **RTL + i18n as requirements** | Cheap if designed in, expensive to retrofit. |
