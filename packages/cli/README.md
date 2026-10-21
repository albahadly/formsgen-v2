# @albahadly/formsgen-cli

FormsGen from the command line: what the builder's *Export* dialog produces,
from a `.formsgen.json` file — for CI, scripts and editors.

```sh
formsgen export form.formsgen.json                       # the HTML export (vanilla CSS) into ./formsgen-export
formsgen export form.formsgen.json --target react --css tailwind --out src/forms
formsgen export form.formsgen.json --target all --out out  # every target, one sub-folder each
formsgen export form.formsgen.json --target validation     # the zod schema and JSON Schema for a server
formsgen validate form.formsgen.json                       # exit 1 with the reasons when the file is wrong
formsgen targets                                           # the targets and CSS flavours
```

An export folder holds what the builder's ZIP holds: the generated files
(carrying the project, so *Open* in the builder reads them back — leave it
out with `--no-project`), the project file, a `README.md` for that target,
and with `--server` the sample submission server under `server/`.

From npm: `npx @albahadly/formsgen-cli export form.formsgen.json …` (or
`npm i -D @albahadly/formsgen-cli` for a `formsgen` command in your scripts).

In this repository: `pnpm --filter @albahadly/formsgen-cli build` writes
`dist/formsgen.mjs`, one self-contained Node 20+ script; run it with
`node packages/cli/dist/formsgen.mjs …` or link it with `pnpm link`.
