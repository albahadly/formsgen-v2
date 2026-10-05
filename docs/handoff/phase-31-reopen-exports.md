# Phase 31: reopen exported forms

## Status

Exported forms can be opened again in the builder, edited and exported again. Commit: feat(phase-31).

No schema change, so there is no ADR row.

## What was built

### Exports carry the project

- **The "Reopenable" switch.** The export dialog has a **Reopenable** switch (قابل لإعادة الفتح). It is on by default and shown for every target except "JSON schema", which already is the project.
- **Where the project goes.** While the switch is on, each generated code file ends with the project in a comment:
  - `.html` and `.vue`: `<!-- … -->`;
  - `.tsx`: `/* … */`;
  - `.razor`: `@* … *@`.
- **What the comment holds.** A readable note ("FormsGen project: to change this form, open this file in the FormsGen builder (Open)."), the marker `formsgen-project:v1`, and the schema as base64 of its UTF-8 JSON in lines of 100 characters.
- **Why base64.** None of the comment endings (`-->`, `*/`, `*@`) can appear inside base64, so any text in the form is safe, Arabic included.
- **Files left alone:** CSS, JSON and README files.
- **ZIP.** Every code export's ZIP also holds `<name>.formsgen.json`, whatever the switch says.
- **README.** It gains a "Change this form later" section. It also warns that exporting again replaces the generated files, so your own code belongs outside them.

### Open reads all of them

The toolbar's **Open** now accepts:
- `.json`: the project file, as before;
- `.zip`: an export ZIP. Open uses its `.formsgen.json`, or else any file in it that carries the project;
- `.html`, `.vue`, `.tsx`, `.razor`: an exported file that carries the project.

Files are read with `FileReader` and checked with `parseFormSchema`, exactly like a project file.

If a file has no project, for example one exported before this phase or with Reopenable off, Open explains (en/ar): "This file has no FormsGen project inside. Open a .formsgen.json file, an export ZIP, or a file exported with “Reopenable” on." Unreadable files say "Could not read this file."

### Code

- `export/project.ts`: `withProject(files, schema)`, `projectBlock`, `readProject(text)`.
- `composables/openProject.ts`: `openProjectFile(file)`, returning `{ ok, schema }` or `{ ok: false, reason: 'unreadable' | 'no-project' | 'invalid' }`.
- `ExportDialog.vue`: the switch, the project file in the ZIP and the README section.
- `AppToolbar.vue`: Open uses `openProjectFile` and the wider file list.

## Verification

**`pnpm verify`** passes with **426 tests** (149 renderer / 277 builder). New coverage:
- every target × every framework round-trips the kitchen-sink project exactly from each code file;
- CSS, JSON and README files carry nothing;
- each language's comment syntax at the end of the file;
- a title containing `-->`, `*/`, `*@`, `</script>` and Arabic survives;
- Open reads a `.formsgen.json`, an exported HTML file and a ZIP holding only a `.razor`;
- Open explains a plain export, unreadable JSON and an invalid project.

**Strict compilers:** React `tsc`, `vue-tsc` and the .NET 8 build of the Blazor export pass, with 0 errors and 0 warnings, on files that carry the project.

**12 runtimes:** the Phase 30 demo, exported with the project inside, runs identically in all 12 runtimes. The comment changes nothing at run time.

**Builder** (real downloads):
1. Use the Trip example and export React with Reopenable on.
2. Download the file and the ZIP. The ZIP holds `TripPlanForm.tsx`, `.css`, `trip_plan.formsgen.json` and the README.
3. Clear the builder and Open the `.tsx`: the same 10 elements come back.
4. Do the same with the `.zip`: the same result.
5. Open a `.tsx` exported with Reopenable off: the notice shows, and nothing is loaded.

## Notes

- Files exported before this phase hold no project and can't be reopened. Keep using Save (`.formsgen.json`) for those.
- The project in a published HTML page is readable by anyone who views the page source. It holds nothing the page doesn't already show (labels, rules, submit URL). Turn Reopenable off if you'd rather not ship it.
