// Copy, cut and paste of the selected element through the document's
// clipboard events (Ctrl/Cmd+C, X, V), so the browser's own clipboard
// carries it to another tab, browser or machine. Keys pressed inside an
// input, an editable box or over selected text are left to the browser.

import { elementFromClipboard, elementToClipboard } from '@/clipboard'
import { t, tOr } from '@/i18n'
import { useBuilderStore } from '@/stores/builder'
import { getElement } from '@/registry'

function leaveToBrowser(): boolean {
  const active = document.activeElement as HTMLElement | null
  if (active && (['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) || active.isContentEditable || active.closest('[contenteditable]'))) return true
  return (window.getSelection()?.toString() ?? '') !== ''
}

function labelOf(type: string): string {
  return tOr(`element.${type}.label`, getElement(type)?.label ?? type)
}

/** Listens on the document until the returned function is called. */
export function installElementClipboard(notify: (message: string) => void): () => void {
  const store = useBuilderStore()

  function copy(event: ClipboardEvent, cut: boolean): void {
    if (leaveToBrowser()) return
    const node = store.selectedNode
    if (!node || !event.clipboardData) return
    event.clipboardData.setData('text/plain', elementToClipboard(node))
    event.preventDefault()
    if (cut) store.removeElement(node.id)
    notify(t(cut ? 'clipboard.cut' : 'clipboard.copied').replace('{name}', labelOf(node.type)))
  }

  function onCopy(event: ClipboardEvent): void {
    copy(event, false)
  }
  function onCut(event: ClipboardEvent): void {
    copy(event, true)
  }
  function onPaste(event: ClipboardEvent): void {
    if (leaveToBrowser()) return
    const node = elementFromClipboard(event.clipboardData?.getData('text/plain') ?? '')
    if (!node) return
    event.preventDefault()
    const inserted = store.insertElement(node, store.selectedId)
    notify(inserted ? t('clipboard.pasted').replace('{name}', labelOf(node.type)) : t('clipboard.refused'))
  }

  document.addEventListener('copy', onCopy)
  document.addEventListener('cut', onCut)
  document.addEventListener('paste', onPaste)
  return () => {
    document.removeEventListener('copy', onCopy)
    document.removeEventListener('cut', onCut)
    document.removeEventListener('paste', onPaste)
  }
}
