// Minimal focus trap for modal dialogs: focuses the first focusable child
// on open, keeps Tab cycling inside, and restores focus on close.

import { nextTick, watch, type Ref } from 'vue'

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(container: Ref<HTMLElement | null>, active: Ref<boolean>): void {
  let previous: HTMLElement | null = null

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !container.value) return
    const focusables = [...container.value.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
    )
    if (focusables.length === 0) return
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    const current = document.activeElement
    if (event.shiftKey && (current === first || !container.value.contains(current))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && current === last) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(active, async (isActive) => {
    if (isActive) {
      previous = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      container.value?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    } else {
      document.removeEventListener('keydown', onKeydown)
      previous?.focus()
      previous = null
    }
  })
}
