# React example

A Vite + React 18 + TypeScript app that mounts the exported component.
`src/forms/<css>/EventRegistrationForm.tsx` are the files the builder's
*Download* writes for the React target (the vanilla variant also brings
`EventRegistrationForm.css`); everything else is the host app.

## Run

```sh
pnpm install                                   # at the repository root, once
pnpm --filter formsgen-example-react dev
```

Open the printed URL. `?css=tailwind` and `?css=bootstrap5` switch the
variant (the links at the top do that). Start the sample server to receive
the submissions (`../README.md`).

`pnpm --filter formsgen-example-react typecheck` runs `tsc`,
`pnpm --filter formsgen-example-react build` bundles; `pnpm verify` at the
root runs both.

## How the form is integrated (`src/App.tsx`)

- The component is imported like any other
  (`import EventRegistrationForm from './forms/vanilla/EventRegistrationForm'`;
  the app does it lazily, one variant per page load).
- Its one prop is `onSubmit(payload)`, called with the validated answers after
  a valid submit; the app shows a thank-you line from it. The component also
  posts the payload to the form's submit URL by itself.
- Vanilla CSS: the component imports its own stylesheet; nothing to add.
- Tailwind: the host must have Tailwind. This app installs Tailwind v4
  (`tailwindcss` and `@tailwindcss/vite`) and loads `src/tailwind.css`
  (`@import 'tailwindcss'`) with the Tailwind variant; Tailwind finds the
  utility classes in the exported file by scanning the project.
- Bootstrap 5: the host must include Bootstrap's CSS. This app installs the
  `bootstrap` package and imports `bootstrap/dist/css/bootstrap.min.css`
  with that variant.

## Into your project

1. `npm create vite@latest my-app -- --template react-ts`, or any React 18+ project.
2. Copy `src/forms/<css>/EventRegistrationForm.tsx` (and the `.css` for vanilla) into it.
3. Render `<EventRegistrationForm onSubmit={(payload) => …} />`; add Tailwind
   or Bootstrap as above when you chose those variants.

No npm dependency on FormsGen is needed: validation, the conditions and the
payload are compiled into the component.
