# Phase 44: more templates, more UI languages

## Status

Complete (2026-10-21), on `main`; commits in `PROGRESS.md`. Gate:
`pnpm verify` green on the Windows checkout (lint, typecheck, renderer
221 / builder 383 / cli 12 / server 9 tests, all builds); the builder
reviewed in Edge in each language with the new templates previewed.

## What was built

- **Three more builder languages — French, Spanish, German** — beside
  English and Arabic (`apps/builder/src/i18n/locales/{fr,es,de}.ts`): the
  full catalog (213 keys: panels, settings, export, templates, drafts,
  conditions…), the 96 `element.*` names and descriptions the palette,
  canvas badges and panel headers show, and the 66 registry/export
  phrases that `tText()` translates (section titles, control labels,
  options, target names). Country-code examples follow the language
  (`FR, BE, CH` / `ES, MX, AR` / `DE, AT, CH`).
- **A language picker** replaces the two-way toggle (`locale-select`,
  `LOCALES` in picker order with each language's own name); the stored
  locale is any known one; `localeDir` keeps right-to-left for Arabic.
  `tText` reads a per-locale phrase map; `hasTranslation` /
  `translationOf` serve the tests.
- **The renderer's form messages in the same three languages**
  (`packages/renderer/src/messagesExtra.ts`): a form whose `meta.locale`
  is `fr`, `es` or `de` (or a region of one) validates and announces in
  its own words; `resolveMessages` picks by language and falls back to
  English.
- **Four more starter templates** (`apps/builder/src/templates/more.ts`,
  English and Arabic): an event RSVP (attendance, guests and dietary needs
  only when attending, a hidden event tag), an order form (customer group,
  repeated items with a calculated count, size only for a T-shirt,
  delivery with a conditional address), an appointment booking (service,
  date and time, phone with country code, a reminder with its channel),
  and a quote request (services, a budget range, a timeline, a brief with
  attachments). Eleven templates in all; the helpers moved to
  `templates/shared.ts`, whose `templateLocale` gives a UI language
  without templates of its own the English ones.
- **Tests**: the completeness test sweeps every locale — every English
  catalog key exists, every panel phrase, target label/description and
  CSS flavour has a translation, every theme preset and rule has a name,
  and no locale's panel shows an English phrase unless it reads the same
  in that language (`translationOf(target, p) === p`); the renderer's
  parity test covers all five catalogs and the language pick; the
  template test lists eleven ids and still proves every element type has
  an example.

## What was intentionally NOT done

- Templates are not translated into French, Spanish or German (their
  titles, descriptions and forms show in English there): ~40 strings ×
  11 templates × 3 languages is a phase of its own.
- No automatic detection of the browser language: the picker remembers
  the choice, English is the default.
- The Arabic catalog's shape was not changed; the new locales mirror it.

## Key decisions & why

- **One file per locale, English-keyed phrase maps**: a locale is added
  by adding a file and a line in `LOCALES`; the tests then demand every
  key and phrase.
- **A phrase may read the same in another language.** "Description",
  "Options" or "Style" are correct French; the "no English chrome" test
  accepts a phrase whose translation is identical rather than forcing an
  artificial one.
- **Form messages per language in the renderer**, not in the builder: a
  form's language is content, the builder's is a preference, and every
  export reads the renderer's catalog.

## How to verify

```sh
pnpm verify
# in Edge: pick a language in the header, open Examples, preview the four new templates
```

Reviewed 2026-10-21 in Edge: the builder in French, Spanish, German and
Arabic (header, palette, properties panel, templates dialog) and the four
templates previewed in English and Arabic (RSVP 4 fields, order 9,
appointment 10, quote 10); no page errors.

## Known issues / gotchas

- A new catalog key or registry phrase must be added to five places;
  the completeness test names the locale and key that lack it.
- `tFor(locale, key)` and `ENGLISH_KEY_LIST` exist for the tests; the
  catalogs themselves stay private to `i18n/index.ts`.
- The dialog's template language is `templateLocale(locale)`, not the
  locale itself.

## Pointers for the next phase

- Phase 45 (field types: star rating, NPS scale, address autocomplete,
  currency) is next on the user's roadmap.
