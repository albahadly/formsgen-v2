// The builder's own light/dark theme: the chrome around the canvas. The form
// on the canvas keeps its own (ui.previewTheme → data-fg-theme). The choice
// is stored per browser: "light" or "dark", or nothing while the builder
// follows the OS ("system"). index.html applies the same rule inline before
// the app loads, so there is no flash.

import { ref } from 'vue'

export type BuilderTheme = 'light' | 'dark'
/** What the header control holds: a fixed theme, or the OS's. */
export type ThemeChoice = 'system' | BuilderTheme

export const THEME_KEY = 'formsgen.theme'
export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark']

const systemQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

/** The theme in effect. */
export const theme = ref<BuilderTheme>('light')
/** The stored choice ("system" while nothing is stored). */
export const themeChoice = ref<ThemeChoice>('system')

/** The stored choice, or null while the builder follows the OS. */
export function readStoredTheme(): BuilderTheme | null {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return stored === 'dark' || stored === 'light' ? stored : null
  } catch {
    return null
  }
}

function systemTheme(): BuilderTheme {
  return systemQuery?.matches ? 'dark' : 'light'
}

/** `data-theme` drives the `dark:` utilities; color-scheme the native controls. */
export function applyThemeToDocument(): void {
  document.documentElement.setAttribute('data-theme', theme.value)
  document.documentElement.style.colorScheme = theme.value
}

/** Resolves the theme at app start: the stored choice, else the OS. */
export function initTheme(): void {
  const stored = readStoredTheme()
  themeChoice.value = stored ?? 'system'
  theme.value = stored ?? systemTheme()
  applyThemeToDocument()
}

/** A fixed theme is stored; "system" forgets the choice and follows the OS again. */
export function setThemeChoice(choice: ThemeChoice): void {
  themeChoice.value = choice
  try {
    if (choice === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, choice)
  } catch {
    // storage unavailable — the choice stays for this session only
  }
  theme.value = choice === 'system' ? systemTheme() : choice
  applyThemeToDocument()
}

export function setTheme(next: BuilderTheme): void {
  setThemeChoice(next)
}

/** Follows OS changes while the choice is "system"; returns the stop function. */
export function startThemeTracking(): () => void {
  if (!systemQuery) return () => {}
  const onChange = (event: MediaQueryListEvent): void => {
    if (themeChoice.value !== 'system') return
    theme.value = event.matches ? 'dark' : 'light'
    applyThemeToDocument()
  }
  systemQuery.addEventListener('change', onChange)
  return () => systemQuery.removeEventListener('change', onChange)
}
