import type { InjectionKey } from 'vue'

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
}

export const FORM_CONTEXT: InjectionKey<FormContext> = Symbol('formsgen-form')
