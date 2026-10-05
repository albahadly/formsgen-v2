# ADR-0002 — Additive optional schema fields (element `style`, `meta.submitButton`)

## Context

The README rule requires an ADR, a schema version bump and a migration note for any FormSchema change after phase 2. Phase 13 added `meta.submitButton` without one, and phase 20 needs per-element appearance settings. Both are *optional additions*:
- every existing `formsgen/v2` document stays valid and renders exactly as before;
- older renderers ignore keys they don't know (the parser doesn't reject unknown node or meta keys).

Bumping `$schema` to `formsgen/v3` would make every existing document fail `parseFormSchema` (it requires the exact id), forcing a migration for zero semantic change.

## Decision

- **Additive, optional, default-preserving fields do not bump `$schema`.** A field qualifies when it is optional, its absence means exactly the previous behavior, and older consumers can ignore it safely. Each such field gets an entry in this ADR's log below.
- **Anything else still requires a version bump plus a migration**: removing or renaming a field, changing its meaning, or making it required.
- The parser validates the *shape* of every additive field when present, so a malformed value is reported rather than silently half-applied.

### Log of additive fields

| Field | Phase | Absent means |
|---|---|---|
| `meta.submitButton` `{ text, align, variant, fullWidth, onLastStepOnly }` | 13 (recorded retroactively) | "Submit", start-aligned, primary, natural width, hidden until the last wizard step |
| `ElementNode.style` `{ size: 'sm'\|'lg', hideLabel, align: 'center'\|'end', tone: 'muted'\|'primary'\|'danger', className }` | 20 | medium size, visible label, start alignment, default color, no extra class |
| `meta.theme` token set (not new; its values became *validated*) — `color-text`, `color-bg`, `color-border`, `color-error`, `font`, `space` join `color-primary` / `radius` in the Settings UI | 21 | the built-in look. Token names must match `[a-z][a-z0-9-]*`; values must be plain CSS (no `; { } < > \ @`, backticks or line breaks, balanced quotes, ≤ 120 chars), because they are written into generated CSS |
| New element types `datetime`, `month`, `week`, `color`, `search`, `toggle`, `hidden`, `image`, `link`, `quote`, `button`; new props `display` (radio/checkbox groups: `list`\|`blocks`\|`buttons`) and `orientation` (range: `vertical`) | 23 | the previous catalog (older builds report an unknown type as unsupported); `display` absent = list, `orientation` absent = horizontal. `href`/`src` props must be http(s), mailto:, tel: or relative URLs |
| Element type `repeater` (props `itemLabel`, `addText`, `minItems`, `maxItems`, `initialItems`): an array-of-objects value; children's conditions may name siblings by template path (`people.name`, resolved per item) | 24 | n/a (older builds report the type as unsupported). The parser requires a name and rejects containers and tags inside |
| Element types `file` and `imageupload` (props `multiple`, `accept`, `maxSizeMb`, `maxFiles`): the value is a list of files; `toSubmission` / the exports post multipart form data (`data` = JSON answers with each file as `{ name, size, type }`, then one part per file named by data path) | 25 | n/a (older builds report the types as unsupported). `maxSizeMb` and `maxFiles` absent or 0 = no limit (new builder elements start at 10 MB per file). Not allowed inside repeaters |
| Element types `rangeslider` (props `min`, `max`, `step`, `defaultFrom`, `defaultTo`; value `{ from, to }` numbers), `daterange` (value `{ from, to }` ISO dates, built-in end ≥ start check) and `dates` (value: sorted ISO date list). A composite object value counts as empty while any part is | 26a | n/a (older builds report the types as unsupported). Not allowed inside repeaters |
| Element type `matrix` (props `rows`, `columns`: `{ value, label }` lists; value: row → chosen column or null) and phone props `countrySelect`, `defaultCountry` (ISO code), `countries` (ISO list); a country phone's value stays one string, `"+<code> <number>"` | 26b | n/a for the matrix (older builds report the type as unsupported; not allowed in repeaters). A phone without `countrySelect` (or inside a repeater) is the plain tel input |
| Props `tooltip` (every field), `prefix` / `suffix` (text-likes, number); `meta.fieldSize` (`sm`\|`md`\|`lg`) and `style.size: 'md'` (explicit medium) | 27a | no tooltip / add-ons; medium fields. `meta.fieldSize` is validated by the parser |
| `layout.colSpanSm` (phones) and `layout.colSpanLg` (desktops) beside `colSpan` (tablets up); `meta.floatingLabels` (boolean) | 27b | phones full width, desktops = `colSpan`; labels above controls. All spans are validated (1, 2, 3, 4, 6, 12) |
| Repeater prop `sortable` (boolean, move up / move down). Repeater children may now be any field type (tags, uploads, range slider, date range, multiple dates, matrix, phone with country); containers are still not allowed | 28a | no move buttons. Older builds' parsers reject the newly allowed child types inside a repeater |
| Repeater items may hold unnamed groups/columns (layout only) and one inner repeater (two levels); an inner repeater's conditions may name its outer item's fields (`travellers.has_bags`), an inner field's its own siblings (`travellers.bags.fragile`) | 28b | n/a: older builds' parsers reject containers inside a repeater. The parser enforces: no tabs/steps in items, at most two repeater levels, no named group inside an item |
| Matrix prop `multiple` (boolean): each row takes several answers (checkboxes); the value maps each row to its chosen columns in column order (`[]` = none), and "required" means every row has at least one | 29b | one answer per row (radios). Older builds ignore the prop and show radios, reading a list value as unanswered |
| Paragraph prop `format: 'markdown'`: simple formatting in `text` (`**bold**`, `*italics*`/`_italics_`, `[text](url)`, `- ` / `1. ` lists, blank line = new paragraph). It is parsed into a tree, never injected as HTML; links keep only safe URLs | 29b | plain text. Older builds show the markers as typed |
| Element type `html` (prop `html`: the author's HTML). It is parsed into allowed tags and attributes (`parseSafeHtml`), never injected as a string: scripts, styles, frames, media, SVG and form controls go with their content; unknown tags are unwrapped; `on*`, `id` and unknown attributes, unsafe `href`/`src` and style declarations with `url()`/`expression()` are dropped | 30 | n/a (older builds report the type as unsupported) |
| Element type `calculated` (props `formula`, `decimals` 0–6, default 2, plus `prefix` / `suffix`): a read-only number worked out from other answers by a small formula language (fields as `{path}`, + − × ÷ %, `round` `floor` `ceil` `abs` `min` `max` `if` with comparisons, `days` between dates, `sum` / `avg` / `count` over top-level repeaters). The value (number or null) is submitted; it is never evaluated as code | 32a | n/a (older builds report the type as unsupported). A formula with a problem leaves the value empty |
| Answers inside text: `{path}` and `{path|fallback}` in field `label` / `description` and heading / paragraph `text` show the current answer (choices as their option labels, Yes/No, lists joined, ranges `from – to`, calculated values with their decimals). Inserted as text, never markup; a reference that isn't a field stays as typed | 32b | the text as typed. Older builds show the braces literally |
| `meta.saveDraft` (boolean): save and continue later. The visitor's answers are kept in their browser (localStorage, `formsgen:<name>:draft`, versioned by the form's data shape and the writer) until the form is sent, and restored on return. Files are never kept | 32c | `false` (nothing kept). Older builds ignore it |

## Alternatives considered

- **Bump to `formsgen/v3` with an auto-migration.** Rejected: every saved project, export and draft would churn for fields that change nothing when absent.
- **Store appearance in `props`.** Rejected: `props` is per-element configuration owned by each element definition. Appearance is cross-cutting, so every export target and CSS adapter reads it in one place.

## Consequences

- New optional fields are cheap, but they must be logged here and have their shape validated in `parse.ts`.
- A document using `style` opened in an older build renders with default appearance, which is graceful degradation.
