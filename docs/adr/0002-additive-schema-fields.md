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

## Alternatives considered

- **Bump to `formsgen/v3` with an auto-migration.** Rejected: every saved project, export and draft would churn for fields that change nothing when absent.
- **Store appearance in `props`.** Rejected: `props` is per-element configuration owned by each element definition. Appearance is cross-cutting, so every export target and CSS adapter reads it in one place.

## Consequences

- New optional fields are cheap, but they must be logged here and have their shape validated in `parse.ts`.
- A document using `style` opened in an older build renders with default appearance, which is graceful degradation.
