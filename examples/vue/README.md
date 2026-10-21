# Vue example

A Vite + Vue 3 + TypeScript app that mounts the form in two ways.

- **Standalone exports**: `src/forms/<css>/EventRegistrationForm.vue` are the
  files the builder's *Download* writes for the Vue (standalone) target, one
  per CSS framework. No dependency on FormsGen: validation, the conditions and
  the payload are compiled in.
- **Renderer export**: `src/forms/renderer/EventRegistrationForm.vue` is the
  Vue (renderer package) target: a short wrapper that hands the form's JSON
  schema to `<FormsGenForm>` from `@albahadly/formsgen-renderer`, which renders,
  validates and submits it at run time. Use it when forms change often (edit
  the JSON, no re-export) or come from a server.

Everything else is the host app.

## Run

```sh
pnpm install                                   # at the repository root, once
pnpm --filter formsgen-example-vue dev
```

Open the printed URL. `?css=tailwind`, `?css=bootstrap5` and `?css=renderer`
switch the variant (the links at the top do that). Start the sample server
to receive the submissions (`../README.md`).

`pnpm --filter formsgen-example-vue build` runs `vue-tsc` and then bundles;
`pnpm verify` at the root runs it after building the renderer package, whose
types the renderer variant needs.

## How the form is integrated (`src/App.vue`)

- A standalone component is imported like any other
  (`import EventRegistrationForm from './forms/vanilla/EventRegistrationForm.vue'`;
  the app does it lazily with `defineAsyncComponent`, one variant per page load).
- Every variant emits `submit` with the validated answers after a valid
  submit; the app shows a thank-you line from it. The renderer wrapper
  declares no emits, so Vue passes the `@submit` listener through to
  `<FormsGenForm>`, which emits it. The forms also post the payload to the
  form's submit URL by themselves.
- Vanilla CSS: the standalone component carries its styles (a scoped
  `<style>` block); the renderer wrapper imports the renderer's stylesheet.
- Tailwind: the host must have Tailwind. This app installs Tailwind v4
  (`tailwindcss` and `@tailwindcss/vite`) and loads `src/tailwind.css`
  (`@import 'tailwindcss'`) with the Tailwind variant.
- Bootstrap 5: the host must include Bootstrap's CSS. This app installs the
  `bootstrap` package and imports `bootstrap/dist/css/bootstrap.min.css`
  with that variant.

## Into your project

1. `npm create vue@latest`, or any Vue 3 project.
2. Standalone: copy `src/forms/<css>/EventRegistrationForm.vue` into it and
   use `<EventRegistrationForm @submit="payload => …" />`; add Tailwind or
   Bootstrap as above when you chose those variants.
3. Renderer: install `@albahadly/formsgen-renderer` and copy
   `src/forms/renderer/EventRegistrationForm.vue`. Here the package comes
   from the workspace (`"@albahadly/formsgen-renderer": "workspace:*"`); outside this
   repository, build and pack it until it is published
   (`pnpm --filter @albahadly/formsgen-renderer build && pnpm --filter @albahadly/formsgen-renderer pack`,
   then `npm i ./formsgen-renderer-*.tgz`).
