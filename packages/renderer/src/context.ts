import type { InjectionKey } from 'vue'
import type { MessageCatalog } from './messages'
import type { ItemScope } from './repeater'

/** Injected by <FormsGenForm> into every field/container component. */
export interface FormContext {
  getValue(path: string): unknown
  setValue(path: string, value: unknown): void
  /** First violation message for the field, once it should be shown. */
  getError(path: string): string | null
  /** Mark a field as touched (blur) and validate it. */
  touch(path: string): void
  /** True once a submit was attempted (errors show everywhere). */
  isSubmitted(): boolean
  /** Number of submit attempts; sections use it to jump to errors. */
  submitCount(): number
  /**
   * Steps wizards register an "am I on my last step (or hidden)" probe so
   * the form can gate its submit button. Optional: design-mode contexts
   * may omit both.
   */
  registerStepsHost?(id: string, atEnd: () => boolean): void
  unregisterStepsHost?(id: string): void
  /**
   * When exactly one steps wizard gates the submit, it renders the submit
   * button itself (in its actions row, where Next sits). Returns that
   * wizard's node id, or null when the form keeps the bottom button.
   */
  submitEmbedHostId?(): string | null
  /** Resolved submit button label/style for the embedding wizard. */
  submitButtonSpec?(): { text: string; secondary: boolean }
  /** Speak a message through the form's polite aria-live region. */
  announce?(message: string): void
  /** A repeater removed an item: shift later items' touched state/errors. */
  shiftItems?(repeaterPath: string, removedIndex: number): void
  /** Restore the initial values and clear errors (reset buttons). */
  reset?(): void
  /** Built-in texts for the form's locale (English when absent). */
  messages?(): MessageCatalog
}

export const FORM_CONTEXT: InjectionKey<FormContext> = Symbol('formsgen-form')

/** Provided by each repeater item: resolves sibling references, unique ids. */
export const ITEM_SCOPE: InjectionKey<ItemScope> = Symbol('formsgen-item-scope')
