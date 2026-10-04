# Phase 25 — File and image uploads (multipart)

## Status

Complete — 2026-10-04, commit: see `git log` (feat(phase-25)). Next: phase 26 (two-handle range slider, date range and multiple dates, matrix, phone with country selector). Still parked: npm publish.

## What was built

Two new field types in the Fields tab:
- **File upload** (`file`; Arabic: رفع ملف).
- **Image upload** (`imageupload`; Arabic: رفع صورة). The same as File upload, plus a thumbnail for each chosen image.

**Value.** The field's value is a list of files. A single-file field replaces the file on each pick. A multiple-file field adds to the list each time, and every file has a remove button labelled "Remove a.pdf" (Arabic too). The native input is cleared after every pick, so the list below it is the only record of what was chosen.

**Props:**
- label and description;
- `multiple` ("Allow several files");
- `accept` (e.g. `.pdf,image/*`);
- `maxSizeMb`: size limit per file. New elements start at 10. Absent or 0 means no limit.
- `maxFiles`: maximum number of files. Absent or 0 means no limit.

**Validation order:**
1. `required` (no file chosen).
2. Too many files: "Choose at most {n} files".
3. Each file in turn: wrong type ("{name} is not an accepted file type"), then too large ("{name} is larger than {size} MB").
4. Any other rules.

The exports use the same order and the same localized messages (en/ar).

**Conditions.** Upload fields offer only "is not empty" and "is empty".

**Not allowed in repeaters.** Upload fields can't go inside a repeater (as in Phase 24).

### Submission format (the recommended option the user approved)

A form that contains any upload field submits `multipart/form-data`. It does so even when no file was chosen, so the server always sees one format.

The body has these parts:
- `data`: the answers as JSON, with each file written as `{ "name", "size", "type" }`.
- One part per file, named by the field's data path, e.g. `documents` or `profile.photo`. Several files in one field share the same part name.

Forms without uploads still post JSON, unchanged.

The renderer exposes this as helpers: `toSubmission(payload, { multipart: hasUploadFields(schema.tree) })`, `describeFiles` and `hasFiles`. The builder Preview prints file descriptions instead of `{}`.

### How each target does it

| Target | How |
|---|---|
| Renderer / Vue library / builder Preview | `FgFile.vue` (in `files.ts`). Data is cloned with `cloneData`, which keeps `File` objects as they are. Errors come from `firstFieldError` (required, then file problems, then other rules). |
| Vue standalone / React | `fgPickFiles` / `fgRemoveFile`. Thumbnails use object URLs, which are released when a file is removed. `FILE_HELPERS_TS` provides `fgFileProblem` and `fgMultipart`. The form data type uses `File[]`. |
| HTML | `data-fg-kind="files"`. A small runtime paints the list. `fetch(…, { body: fgMultipart(data) })`. |
| Blazor | `List<FgUpload>`. `FgUpload` is a record (Name, Size, ContentType, Data, Thumb). Each file is **read into memory when it is picked**, because Blazor cannot read an earlier selection once the input changes. The `InputFile` is then re-created (`@key`) so it shows empty, and focus is put back on it. Image thumbnails come from `RequestImageFileAsync`. Validation runs in the model's `Validate()`. Submit builds a `MultipartFormDataContent` whose part names and filenames are **quoted** (see Gotchas). |

### Fixes found along the way (all targets)

- **Blazor list conditions.** `contains`, `empty` and `not-empty` used `Convert.ToString`, which gave wrong answers for lists such as checkbox groups, multiselects and uploads. They now use the `FgContains` and `FgIsBlank` helpers, which are emitted only when used.
- **Blazor shows one message per field,** the first one, as the other targets do. It used to show every failing attribute's message.
- **Typed exports name their data interface `FormData`,** which hides the DOM `FormData` type. `fgMultipart` therefore has no return annotation.

## Verification

**`pnpm verify`** passes with **336 tests** (114 renderer / 222 builder). New coverage:
- the renderer file helpers and `FgFile` behaviour;
- the generated JS helpers, run for real: accept matching, problem order, multipart part names;
- the output of every target, including Arabic messages;
- condition operators for upload fields;
- the kitchen-sink fixture, which now has a required multiple `attachments` field, a conditional note, and `account.avatar` (an image upload nested in a group).

**Strict compilers** (on the kitchen-sink export, with a submit URL, all 3 frameworks):

| Check | Result |
|---|---|
| React `tsc` (strict, no unused locals/parameters) | 0 errors |
| `vue-tsc` | 0 errors |
| .NET 8 build of the Blazor export | 0 warnings / 0 errors |

**Real runtimes.** I ran one upload scenario in all **12 runtimes** (HTML, React, Vue and Blazor, each with Vanilla, Tailwind and Bootstrap 5) against a local multipart server. Every runtime produced the **identical** result: the same messages, the same data shown on screen, and the same parsed server parts. Each uploaded file's bytes had the same SHA-1 as the source file.

The scenario:
1. Submit while empty: "required" errors.
2. Too-large file, then wrong type: each error appears and clears when the file is removed.
3. Three files picked one at a time: "Choose at most 2 files"; removing one clears it.
4. The conditional note appears once a file is chosen.
5. The image thumbnail renders, and picking again into a single-file field replaces the file.
6. Valid submit.

The builder Preview passed the same checks.

## Gotchas

- **.NET multipart quoting.** By default .NET writes `name=data; filename=a.pdf; filename*=…` without quotes. Node's (undici) parser rejected the body, so other strict parsers may too. The export sets `Content-Disposition` itself with quoted values, as browsers do.
- **Testing on localhost.** Playwright always sends loopback traffic through the configured proxy. The browser proofs therefore used the container IP (192.0.2.2) with a proxy bypass.
- **Builder look.** The Tailwind preflight in the builder strips the native file button's look. The renderer and the vanilla stylesheet now style `::file-selector-button`.

## Backlog

- Drag-and-drop area.
- Upload progress.
- Uploading each file as soon as it is chosen, instead of at submit.
- Uploads inside repeaters.
- Image resizing and compression before upload.
