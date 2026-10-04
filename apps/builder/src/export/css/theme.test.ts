import { parseFormSchema, type FormSchema, type ThemeTokens } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import kitchenSink from '../../../../../fixtures/kitchen-sink.formsgen.json'
import { getTarget } from '../targets'
import { scopeForBlazor } from './blazorScope'
import {
  TAILWIND_DARK_RESETS,
  TAILWIND_RINGS,
  TAILWIND_THEMED,
  bootstrapThemeCss,
  tailwindThemeCss,
} from './themeBridge'
import { getCssAdapter, type CssFrameworkId } from '.'

function schema(theme?: ThemeTokens): FormSchema {
  const input = JSON.parse(JSON.stringify(kitchenSink)) as { meta: Record<string, unknown> }
  if (theme) input.meta['theme'] = theme
  const result = parseFormSchema(input)
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}

const files = (target: string, framework: CssFrameworkId, theme?: ThemeTokens) =>
  getTarget(target)!.generate({ schema: schema(theme), css: getCssAdapter(framework) })

const THEME: ThemeTokens = {
  'color-primary': '#0f766e',
  'color-bg': '#fffbeb',
  'color-text': '#1c1917',
  'color-border': '#d6d3d1',
  'color-error': '#b91c1c',
  radius: '0px',
  space: '1.5rem',
  font: 'Georgia, "Times New Roman", serif',
}

/** Palette classes the bridge deliberately leaves alone (the debug payload) or themes specially. */
const UNTHEMED_TAILWIND = new Set([
  'bg-gray-900',
  'text-green-300',
  'hover:bg-indigo-500', // themed by a dedicated shaded-primary rule
  'text-white', // themed on the primary button via the contrast rule
])

const PALETTE =
  /(?:[a-z-]+:)*(?:text|bg|border|ring|accent)-(?:gray|slate|indigo|red|green|white|black|blue)(?:-\d+)?(?:\/\d+)?/g

describe('theme bridges', () => {
  it('emit nothing without a theme, so unthemed exports are unchanged', () => {
    expect(bootstrapThemeCss(undefined)).toBeUndefined()
    expect(tailwindThemeCss({})).toBeUndefined()
    expect(getCssAdapter('tailwind').stylesheet?.(undefined)).toBeUndefined()
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      const all = files(target, 'bootstrap5').map((f) => f.content).join('\n')
      expect(all, target).not.toContain('fg-themed')
      expect(all, target).not.toContain('data-fg-theme')
    }
  })

  it('every Tailwind palette class the exports emit is themed or deliberately left alone', () => {
    const covered = new Set([
      ...Object.values(TAILWIND_THEMED).flatMap((props) => Object.values(props).flat()),
      ...Object.values(TAILWIND_RINGS).flat(),
      ...Object.keys(TAILWIND_DARK_RESETS),
      ...UNTHEMED_TAILWIND,
    ])
    const emitted = new Set<string>()
    for (const target of ['html', 'react', 'vue-standalone', 'blazor']) {
      for (const file of files(target, 'tailwind')) {
        for (const match of file.content.matchAll(PALETTE)) emitted.add(match[0])
      }
    }
    expect([...emitted].filter((c) => !covered.has(c))).toEqual([])
    // and every dark: variant has a light fallback for pinned themes
    expect([...emitted].filter((c) => c.startsWith('dark:') && !(c in TAILWIND_DARK_RESETS))).toEqual([])
  })

  it('Tailwind: concrete values on the emitted classes, scoped to .fg-themed', () => {
    const css = tailwindThemeCss(THEME)!
    expect(css).toContain('.fg-themed .bg-indigo-600 {\n  background-color: #0f766e;\n}')
    expect(css).toContain('.fg-themed .focus\\:border-indigo-500:focus')
    expect(css).toContain('.fg-themed .hover\\:bg-indigo-500:hover {\n  background-color: #0d6861;\n}')
    expect(css).toContain('.fg-themed .bg-indigo-600.text-white {\n  color: #ffffff;\n}')
    expect(css).toContain('--tw-ring-color: rgba(15, 118, 110, 0.35);')
    expect(css).toContain('.fg-themed .rounded-md,\n.fg-themed .rounded-lg {\n  border-radius: 0px;\n}')
    expect(css).toContain('.fg-themed .gap-4 {\n  gap: 1.5rem;\n}')
    expect(css).toContain('.fg-themed.fg-themed {\n  color: #1c1917;\n  background-color: #fffbeb;\n  font-family: Georgia, "Times New Roman", serif;\n  color-scheme: light;\n}')
    // pinned light scheme: dark variants reset before token rules override them
    const reset = css.indexOf('.fg-themed .dark\\:bg-gray-800 {\n  background-color: #ffffff;')
    const token = css.indexOf('.fg-themed .bg-white,\n.fg-themed .dark\\:bg-gray-800 {\n  background-color: #fffbeb;')
    expect(reset).toBeGreaterThan(0)
    expect(token).toBeGreaterThan(reset)
  })

  it('Tailwind: no dark resets unless the theme defines its own colors', () => {
    expect(tailwindThemeCss({ 'color-primary': '#0f766e' })).not.toContain('dark\\:bg-gray-700')
  })

  it('Bootstrap: native variables plus the button, focus and check states', () => {
    const css = bootstrapThemeCss(THEME)!
    expect(css).toContain('--bs-primary: #0f766e;')
    expect(css).toContain('--bs-primary-rgb: 15, 118, 110;')
    expect(css).toContain('--bs-danger-rgb: 185, 28, 28;')
    expect(css).toContain('--bs-border-radius: 0px;')
    expect(css).toContain('--bs-body-font-family: Georgia, "Times New Roman", serif;')
    expect(css).toContain('.fg-themed .btn-primary {\n  --bs-btn-color: #ffffff;\n  --bs-btn-bg: #0f766e;')
    // direct values as well, for host CSS that restyles .btn-primary (Blazor's app.css)
    expect(css).toContain('  color: #ffffff;\n  background-color: #0f766e;\n  border-color: #0f766e;\n}')
    expect(css).toContain('.fg-themed .btn-primary:hover, .fg-themed .btn-primary:active {')
    expect(css).toContain('.fg-themed .form-check-input:checked')
    expect(css).toContain('--bs-gutter-x: 1.5rem;')
  })

  it('Bootstrap: muted, surface, text utilities and the select chevron follow the theme', () => {
    const css = bootstrapThemeCss({
      'color-text': '#e2e8f0',
      'color-bg': '#0f172a',
      'color-muted': '#94a3b8',
      'color-surface': '#1e293b',
    })!
    expect(css).toContain('--bs-body-color-rgb: 226, 232, 240;') // .text-body (active step)
    expect(css).toContain('--bs-emphasis-color: #e2e8f0;')
    expect(css).toContain('--bs-secondary-color: #94a3b8;')
    expect(css).toContain('--bs-secondary-rgb: 148, 163, 184;')
    expect(css).toContain('--bs-tertiary-bg-rgb: 30, 41, 59;') // group .bg-body-tertiary
    expect(css).toContain('color-scheme: dark;')
    // tag chips on a light muted color get dark text
    expect(css).toContain('.fg-themed .text-bg-secondary, .fg-themed .text-bg-secondary .text-white {\n  color: #111827 !important;')
    expect(css).toContain("stroke='%23e2e8f0'")
    expect(css).not.toMatch(/[<>]/)
  })

  it('Tailwind: muted and surface colors, and the color scheme', () => {
    const css = tailwindThemeCss({ 'color-muted': '#475569', 'color-surface': '#f1f5f9', 'color-bg': '#ffffff' })!
    expect(css).toContain('.fg-themed .text-gray-500,')
    expect(css).toContain('  color: #475569;')
    expect(css).toContain('.fg-themed .bg-gray-50,')
    expect(css).toContain('  background-color: #f1f5f9;')
    expect(css).toContain('color-scheme: light;')
  })

  it('a light primary color gets dark button text', () => {
    expect(bootstrapThemeCss({ 'color-primary': '#fde047' })).toContain('--bs-btn-color: #111827;')
    expect(tailwindThemeCss({ 'color-primary': '#fde047' })).toContain('.bg-indigo-600.text-white {\n  color: #111827;')
  })
})

describe('vanilla theme', () => {
  it('overrides after the automatic dark scheme, so chosen colors always win', () => {
    const css = getCssAdapter('vanilla').stylesheet!({ 'color-primary': '#0f766e' })!
    const dark = css.indexOf('@media (prefers-color-scheme: dark)')
    const override = css.indexOf('.fg-form.fg-form {\n  --fg-color-primary: #0f766e;\n  --fg-color-primary-contrast: #ffffff;\n}')
    expect(dark).toBeGreaterThan(0)
    expect(override).toBeGreaterThan(dark)
    expect(getCssAdapter('vanilla').stylesheet!(undefined)).not.toContain('.fg-form.fg-form')
    expect(getCssAdapter('vanilla').stylesheet!({ 'color-bg': '#0f172a' })).toContain(
      '.fg-form.fg-form {\n  --fg-color-bg: #0f172a;\n  color-scheme: dark;\n}',
    )
  })
})

describe('themed exports', () => {
  it.each([
    ['html', '<form id="fg-form" class="container py-4 fg-themed" data-fg-theme="light" novalidate>'],
    ['react', '<form className="container py-4 fg-themed" data-fg-theme="light" dir="ltr"'],
    ['vue-standalone', 'class="container py-4 fg-themed"\n    data-fg-theme="light"\n    dir="ltr"'],
    ['blazor', '<div class="container py-4 fg-themed" data-fg-theme="light" @onpointerdown='],
  ])('%s marks the form root and ships the bridge', (target, root) => {
    const out = files(target, 'bootstrap5', THEME)
    const all = out.map((f) => f.content).join('\n')
    expect(all).toContain(root)
    expect(all).toContain('--bs-primary: #0f766e;')
  })

  it('README mentions the stylesheet file a themed Tailwind/Bootstrap export ships', () => {
    const ctx = { schema: schema(THEME), css: getCssAdapter('tailwind') }
    expect(getTarget('react')!.readme!(ctx)).toContain('.css`')
    expect(getTarget('blazor')!.readme!(ctx)).toContain('.razor.css')
    const plain = { schema: schema(), css: getCssAdapter('tailwind') }
    expect(getTarget('blazor')!.readme!(plain)).not.toContain('.razor.css')
  })

  it('a primary-only theme does not pin the light scheme', () => {
    const html = files('html', 'vanilla', { 'color-primary': '#0f766e' })[0]!.content
    expect(html).toContain('class="fg-form fg-themed" novalidate')
  })
})

describe('Blazor CSS isolation', () => {
  it('reaches child-component elements through ::deep, anchored on the form root', () => {
    const css = scopeForBlazor(`/* note */
.fg-form {
  color: red;
}
.fg-input, .fg-select:focus-visible { padding: 0; }
.fg-form.fg-form { --fg-radius: 0px; }
.fg-themed .hover\\:bg-indigo-500:hover,
.fg-themed .btn-primary { color: blue; }
@media (prefers-color-scheme: dark) {
  .fg-form:not([data-fg-theme='light']) { --fg-color-bg: #000; }
  .fg-label { color: white; }
}
`)
    expect(css).toBe(`/* note */
.fg-form {
  color: red;
}
::deep .fg-input, ::deep .fg-select:focus-visible { padding: 0; }
.fg-form.fg-form { --fg-radius: 0px; }
.fg-themed ::deep .hover\\:bg-indigo-500:hover,
.fg-themed ::deep .btn-primary { color: blue; }
@media (prefers-color-scheme: dark) {
  .fg-form:not([data-fg-theme='light']) { --fg-color-bg: #000; }
  ::deep .fg-label { color: white; }
}
`)
  })

  it('the exported .razor.css is scoped for every framework that ships one', () => {
    const vanilla = files('blazor', 'vanilla').find((f) => f.path.endsWith('.razor.css'))!.content
    expect(vanilla).toContain('::deep .fg-input, ::deep .fg-textarea, ::deep .fg-select {')
    const tw = files('blazor', 'tailwind', THEME).find((f) => f.path.endsWith('.razor.css'))!.content
    expect(tw).toContain('.fg-themed ::deep .bg-indigo-600 {')
    expect(tw).not.toMatch(/^\.fg-themed \.(?!fg-)/m)
  })
})
