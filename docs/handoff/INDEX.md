# Phase Handoff Index

Read the latest handoff before starting any phase (Phase Standard, REBUILD_PROMPT.md §11).
Between handoffs, the live session memory is [PROGRESS.md](./PROGRESS.md) (what is in flight and the next step; see `CLAUDE.md`).

| Phase | Name | Status | Handoff |
|---|---|---|---|
| 01 | Workspace scaffold & tooling | ✅ Complete | [phase-01-scaffold.md](./phase-01-scaffold.md) |
| 02 | Schema types + registry + pilot elements | ✅ Complete | [phase-02-schema-registry.md](./phase-02-schema-registry.md) |
| 03 | Renderer: pilot types + validation + conditions | ✅ Complete | [phase-03-renderer.md](./phase-03-renderer.md) |
| 04 | Builder shell: palette, canvas, properties | ✅ Complete | [phase-04-builder-shell.md](./phase-04-builder-shell.md) |
| 05 | Nested DnD + tree sidebar + duplicate + keyboard | ✅ Complete | [phase-05-dnd-tree.md](./phase-05-dnd-tree.md) |
| 06 | History (undo/redo) + autosave + save/open | ✅ Complete | [phase-06-history-persistence.md](./phase-06-history-persistence.md) |
| 07 | Preview/code/device/theme toolbar + settings | ✅ Complete | [phase-07-views-settings.md](./phase-07-views-settings.md) |
| 08 | CSS adapters + ExportTarget interface + core targets | ✅ Complete | [phase-08-export.md](./phase-08-export.md) |
| 09 | React + Blazor export targets | ✅ Complete | [phase-09-react-blazor.md](./phase-09-react-blazor.md) |
| 10 | Full element catalog | ✅ Complete (13 new types; tabs/steps/files deferred — see handoff) | [phase-10-catalog.md](./phase-10-catalog.md) |
| 11 | Polish: a11y, RTL, README, demo fixture | ✅ Complete | [phase-11-polish.md](./phase-11-polish.md) |
| 10b | Tabs + Steps (wizard) containers | ✅ Complete | [phase-10b-tabs-steps.md](./phase-10b-tabs-steps.md) |
| 12 | Backlog: multiselect, error auto-jump, Arabic UI | ✅ Complete | [phase-12-backlog-round.md](./phase-12-backlog-round.md) |
| 13 | Backlog: tags element, export auto-jump, axe CI | ✅ Complete | [phase-13-tags-jump-axe.md](./phase-13-tags-jump-axe.md) |
| 14 | Blazor parity: multi-value, step gating, error jump | ✅ Complete | [phase-14-blazor-parity.md](./phase-14-blazor-parity.md) |
| 15 | aria-live announcements + cross-target validation parity | ✅ Complete | [phase-15-live-region-parity.md](./phase-15-live-region-parity.md) |
| 16 | Localized built-in texts (English + Arabic) | ✅ Complete | [phase-16-arabic-messages.md](./phase-16-arabic-messages.md) |
| 17 | Press-safe blur validation (no lost clicks) | ✅ Complete | [phase-17-press-safe-validation.md](./phase-17-press-safe-validation.md) |
| 18 | Visual condition builder | ✅ Complete | [phase-18-condition-builder.md](./phase-18-condition-builder.md) |
| 19 | Complete Arabic builder UI | ✅ Complete | [phase-19-arabic-builder-ui.md](./phase-19-arabic-builder-ui.md) |
| 20 | Element appearance (style options) | ✅ Complete | [phase-20-element-appearance.md](./phase-20-element-appearance.md) |
| 21 | Theme options in Settings (all exports) | ✅ Complete | [phase-21-theme-settings.md](./phase-21-theme-settings.md) |
| 22 | Theme palettes, muted & surface colors, color-scheme | ✅ Complete | [phase-22-theme-palettes.md](./phase-22-theme-palettes.md) |
| 23 | More elements: toggle, hidden, date-time/month/week/color/search, choice blocks & buttons, vertical slider, image/link/quote, reset/link buttons | ✅ Complete | [phase-23-element-catalog.md](./phase-23-element-catalog.md) |
| 24 | Repeatable sections (repeater) in renderer, builder and every export | ✅ Complete | [phase-24-repeatable-sections.md](./phase-24-repeatable-sections.md) |
| 25 | File & image uploads with multipart submission (all targets) | ✅ Complete | [phase-25-file-uploads.md](./phase-25-file-uploads.md) |
| 26 | Range slider (two handles), date range, multiple dates, matrix, phone country selector | ✅ Complete | [phase-26-composite-fields.md](./phase-26-composite-fields.md) |
| 27 | Form polish: tooltips, text add-ons, form-wide field size, per-screen widths, floating labels, starter templates; examples gallery covering every element (27c) | ✅ Complete | [phase-27-form-polish.md](./phase-27-form-polish.md) |
| 28 | Finish repeaters: every field type inside items and move up/down reordering (28a); nested repeaters, groups/columns in items (28b) | ✅ Complete | [phase-28-repeaters.md](./phase-28-repeaters.md) |
| 29 | Drag-and-drop uploads and an upload progress bar (29a); matrix with several answers per row, formatted text, examples showing repeaters (29b) | ✅ Complete | [phase-29-uploads-matrix-text.md](./phase-29-uploads-matrix-text.md) |
| 30 | HTML block: a static element holding the author's own HTML, reduced to safe tags and attributes in the renderer and every export | ✅ Complete | [phase-30-html-block.md](./phase-30-html-block.md) |
| 31 | Reopen exported forms: code exports carry the project, ZIPs include the `.formsgen.json`, and Open reads JSON, export ZIPs and exported files | ✅ Complete | [phase-31-reopen-exports.md](./phase-31-reopen-exports.md) |
| 32 | Smarter forms: calculated fields (32a), answers inside text (32b), save and continue later (32c) | ✅ Complete | [phase-32-smarter-forms.md](./phase-32-smarter-forms.md) |
| 33 | Builder on phones (33a), sample submission server (33b), drag to reorder items (33c), several files dropped on a one-file field (33d) | ✅ Complete | [phase-33-extras.md](./phase-33-extras.md) |
| 34 | New fields and checks: signature pad (34a), rich-text answers (34b), location on a map (34c), Cloudflare Turnstile spam check (34d), sandboxed https iframes in HTML blocks (34e) | ✅ Complete | [phase-34-new-fields.md](./phase-34-new-fields.md) |
| 35 | Review backlog round: spam check in the kitchen sink (35e), entity-decoding parity (35d), one tab stop for the rich-text toolbar (35a), Blazor registries forget removed elements (35c), no `any` in generated TypeScript (35b) | ✅ Complete | [phase-35-backlog-round.md](./phase-35-backlog-round.md) |
| 36 | Examples: one form (event registration) in HTML, React, Vue and .NET, each a runnable project around the builder's exports, generated and drift-checked; the duplicate-id fix in every export (ADR-0003) | ✅ Complete | [phase-36-examples.md](./phase-36-examples.md) |
| 37 | CSS parity: the vanilla, Tailwind and Bootstrap 5 flavours render the same form (one spec, ADR-0004; metrics identical within 1px on the kitchen sink and the examples form), with a measured parity check in the toolkit | ✅ Complete | [phase-37-css-parity.md](./phase-37-css-parity.md) |
| 38 | The builder's own light/dark mode (stored per browser, follows the OS until chosen; the chrome inside the form card follows the form's theme, ADR-0005) and the builder's version beside its title, bumped to 0.1.0 | ✅ Complete | [phase-38-builder-theme.md](./phase-38-builder-theme.md) |
| 39 | Prefill from the page address: `?field=value` fills matching fields in the renderer and every export, a hidden field takes a named parameter; the link wins over a restored draft (ADR-0002 log) | ✅ Complete | [phase-39-prefill.md](./phase-39-prefill.md) |
| 40 | After submit: a thank-you message (answers piped in, "Send another response") replaces the form, or the page goes to an address — renderer, every export, the vue-lib host and the preview; the sample server forwards submissions to a webhook, signed (ADR-0002 log) | ✅ Complete | [phase-40-after-submit.md](./phase-40-after-submit.md) |

**All 11 planned phases are complete**, plus 10b and 12–40 from the backlog. The open backlog is kept in the latest handoffs, [phase-35-backlog-round.md](./phase-35-backlog-round.md), [phase-36-examples.md](./phase-36-examples.md), [phase-37-css-parity.md](./phase-37-css-parity.md) and [phase-38-builder-theme.md](./phase-38-builder-theme.md) ("What was intentionally NOT done"); the one standing item is the npm publish of `@formsgen/renderer` (parked by user).
