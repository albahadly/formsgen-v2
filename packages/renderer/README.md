# @albahadly/formsgen-renderer

Standalone Vue 3 renderer for FormsGen (`formsgen/v2`) JSON form schemas:
validation, conditional visibility, nested data, theming, dark mode and RTL
— with no dependency beyond Vue itself.

## Install

```bash
npm i @albahadly/formsgen-renderer vue
```

Or build and pack it from this monorepo:

```bash
pnpm --filter @albahadly/formsgen-renderer build
pnpm --filter @albahadly/formsgen-renderer pack
npm i ./albahadly-formsgen-renderer-*.tgz   # in your project
```

## Use

```ts
import { FormsGenForm, parseFormSchema } from '@albahadly/formsgen-renderer'
import '@albahadly/formsgen-renderer/style.css'
import raw from './contact_form.formsgen.json'

const result = parseFormSchema(raw)   // structural validation with
if (!result.ok) throw new Error(result.errors.join('\n'))
const schema = result.schema
```

```html
<FormsGenForm :schema="schema" v-model="data" @submit="onSubmit" />
```

- `v-model` receives a live snapshot of the (nested) form data.
- `submit` fires only when every VISIBLE field validates; hidden fields are
  excluded from both validation and the payload.
- Theme via `schema.meta.theme` tokens (become `--fg-*` CSS variables) or
  force a scheme with `data-fg-theme="light|dark"` on the form.
- `schema.meta.dir: "rtl"` flips the form; the stylesheet uses logical
  properties throughout.

## Any framework: the web component

The package also ships `<formsgen-form>`, a custom element with Vue
bundled inside, for React, Angular, Svelte, plain HTML or a CMS — the host
page needs no Vue:

```html
<script type="module">
  import '@albahadly/formsgen-renderer/element'
</script>
<formsgen-form src="./contact.formsgen.json"></formsgen-form>
```

Or one classic script tag with the IIFE build
(`node_modules/@albahadly/formsgen-renderer/dist/element/formsgen-element.iife.js`).
The element takes `src` (a schema URL) or `schema` (a JSON string, or an
object set as a property); it dispatches `formsgen-ready`,
`formsgen-change`, `formsgen-submit` (cancelable; the answers in
`detail`), `formsgen-sent` and `formsgen-error`, posts where
`meta.submit` points, and renders in the page itself (no shadow DOM) so
the host's styles apply. React apps that prefer a native component generate one with
`npx @albahadly/formsgen-cli export form.formsgen.json --target react`
(a self-contained `.tsx`, no runtime dependency on this package).

## Exports

Components (`FormsGenForm` plus the individual `Fg*` field components),
schema types, `parseFormSchema`, tree helpers (`walkTree`,
`buildDefaultData`, …), and the rule/condition evaluators — one shared
implementation of the semantics that FormsGen's code exports reproduce.
