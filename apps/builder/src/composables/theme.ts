// The builder's own light/dark theme: the chrome around the canvas. The form
// on the canvas keeps its own (ui.previewTheme → data-fg-theme). The choice
// is stored per browser; without one the builder follows the OS. index.html
// applies the same rule inline before the app loads, so there is no flash.

import { ref } from 'vue'

export type BuilderTheme = 'light' | 'dark'

export const THEME_KEY = 'formsgen.theme'

const systemQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

export const theme = ref<BuilderTheme>('light')

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
  theme.value = readStoredTheme() ?? systemTheme()
  applyThemeToDocument()
}

export function setTheme(next: BuilderTheme): void {
  theme.value = next
  try {
    localStorage.setItem(THEME_KEY, next)
  } catch {
    // storage unavailable — the theme stays for this session only
  }
  applyThemeToDocument()
}

export function toggleTheme(): void {
  setTheme(theme.value === 'dark' ? 'light' : 'dark')
}

/** Follows OS changes while no choice is stored; returns the stop function. */
export function startThemeTracking(): () => void {
  if (!systemQuery) return () => {}
  const onChange = (event: MediaQueryListEvent): void => {
    if (readStoredTheme() !== null) return
    theme.value = event.matches ? 'dark' : 'light'
    applyThemeToDocument()
  }
  systemQuery.addEventListener('change', onChange)
  return () => systemQuery.removeEventListener('change', onChange)
}
