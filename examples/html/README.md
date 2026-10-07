# HTML example

Three self-contained pages, one per CSS framework, each the file the builder's
*Download* writes for the HTML + JS target:

- `vanilla/event_registration.html` — styles embedded (the `--fg-*` custom properties theme it)
- `tailwind/event_registration.html` — loads Tailwind's Play CDN in `<head>`
- `bootstrap5/event_registration.html` — links Bootstrap 5 from jsDelivr in `<head>`

## Use

1. Start the sample server (see `../README.md`) so the submit has somewhere to go.
2. Open the page in a browser: double-click the file, or serve the folder
   (`npx serve examples/html`).

Validation, the condition and the payload are compiled in: a valid submit
prints the payload below the form and posts it to `http://localhost:4280/submit`.

## Into your project

Use the page as it is, or move its `<form id="fg-form">` (with the `<style>`
and `<script>` blocks) into your own page: the script has no dependencies and
attaches to the form by that id. For Tailwind or Bootstrap, replace the CDN
tag in `<head>` with your own build of the framework. To change the form or its
submit URL, open the file in the builder (*Open* reads the project it carries)
and export again.
