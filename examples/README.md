# Examples: one form, four stacks

The same form, **Event registration**, implemented the way a project uses a
FormsGen export in each supported stack. Every example mounts the file the
builder's *Download* button writes for `form/event-registration.formsgen.json`,
so the four folders show the same integration side by side.

| Folder | Stack | What it shows |
|---|---|---|
| `html/` | plain HTML + JS | three self-contained pages (vanilla CSS, Tailwind, Bootstrap 5): open and use, no build step |
| `react/` | Vite + React 18 + TypeScript | the exported component in an app, the `onSubmit` callback, Tailwind v4 and Bootstrap installed from npm |
| `vue/` | Vite + Vue 3 + TypeScript | the standalone exports (three CSS variants) and the `@formsgen/renderer` export that renders the JSON schema at run time |
| `dotnet/` | Blazor Web App, .NET 8 | the exported Razor component on three pages, interactive server rendering, posting with `HttpClient` |
| `form/` | — | the template; open it in the builder to change the form, then regenerate |

## The template

`form/event-registration.formsgen.json` has a heading and an intro, first and
last name in two columns, email, phone, a ticket select, a number of seats
(1–5), a dietary preference whose "Other" choice reveals a required textarea
(a condition), workshops as a checkbox group, an arrival date, free notes and
a required terms checkbox. The submit button reads "Register" and the form
posts to `http://localhost:4280/submit`.

## Where the forms post

Every example posts to `http://localhost:4280/submit`, the sample submission
server in this repository. Start it before trying a form:

```sh
node packages/submit-server/server.mjs --port 4280 --dir /tmp/formsgen-submissions
```

It stores each submission and lists them at http://localhost:4280/. Without
it the form still validates and shows the payload below the form, and
reports that the send failed. For your own backend, change the URL in the
builder (Settings → Submit) and export again.

## Generated files: regenerate, do not edit

The files below are generated from the template by the builder's own export
targets, exactly as *Download* writes them (each ends with the project block
that the builder's *Open* reads, so any of them reopens in the builder).
`pnpm test` checks them (`apps/builder/src/export/examples.test.ts`): the
test fails when a committed file differs from what the current targets
produce, so the examples cannot drift from the builder.

| Generated | Target |
|---|---|
| `html/<css>/event_registration.html` | HTML + JS |
| `react/src/forms/<css>/EventRegistrationForm.tsx` (+ `.css` for vanilla and Bootstrap) | React (standalone) |
| `vue/src/forms/<css>/EventRegistrationForm.vue` | Vue (standalone) |
| `vue/src/forms/renderer/EventRegistrationForm.vue` | Vue (renderer package) |
| `dotnet/EventRegistration/Components/Forms/<Css>/EventRegistrationForm.razor` (+ `.razor.css` for vanilla and Bootstrap) | Blazor |

To change the form: open `form/event-registration.formsgen.json` in the
builder (*Open*), edit it, export the JSON over the same file, then

```sh
pnpm examples:update
```

The same command refreshes the examples after a change to an export target.

## Running the examples

Each folder's README has the steps. The React and Vue apps are workspace
packages: `pnpm install` at the repository root installs them and
`pnpm verify` builds them. The Blazor app needs the .NET 8 SDK. The HTML
pages need a browser.

## Proving them

`bash tools/proof/examples-check.sh` builds the React, Vue and Blazor apps,
serves them and drives all 13 runtimes (3 HTML pages, 3 React variants, 4 Vue
variants, 3 Blazor pages) through one scenario
(`tools/proof/e2e/event-registration.mjs`: an empty submit is refused, the
condition shows and hides the textarea, a complete submit is stored by the
sample server), then compares what each runtime stored. See
`tools/proof/README.md`.
