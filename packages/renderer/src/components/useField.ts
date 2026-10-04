import { computed, inject } from 'vue'
import { FORM_CONTEXT, ITEM_SCOPE, type FormContext } from '../context'
import type { ElementNode } from '../schema'

export interface FieldProps {
  node: ElementNode
  path: string
}

/** Shared wiring for value-bearing field components. */
export function useField(props: FieldProps) {
  const ctx = inject(FORM_CONTEXT)
  // Inside a repeater item the same node renders once per item.
  const scope = inject(ITEM_SCOPE, null)
  if (!ctx) throw new Error('FormsGen field components must be used inside <FormsGenForm>')

  const value = computed({
    get: () => ctx.getValue(props.path),
    set: (v: unknown) => ctx.setValue(props.path, v),
  })
  const error = computed(() => ctx.getError(props.path))
  const label = computed(() => String(props.node.props['label'] ?? ''))
  const description = computed(() => {
    const d = props.node.props['description']
    return typeof d === 'string' && d !== '' ? d : null
  })
  const placeholder = computed(() => String(props.node.props['placeholder'] ?? ''))
  const required = computed(
    () => props.node.validation?.some((r) => r.rule === 'required') ?? false,
  )
  const fieldId = computed(() => (scope ? `fg-${props.node.id}-${scope.index}` : `fg-${props.node.id}`))
  const errorId = computed(() => `${fieldId.value}-error`)
  /** Links the control to its error message for screen readers. */
  const describedBy = computed(() => (error.value ? errorId.value : undefined))
  const onBlur = (): void => ctx.touch(props.path)
  /** style.hideLabel keeps the label for screen readers, hides it visually. */
  const labelClass = computed(() => (props.node.style?.hideLabel ? 'fg-sr-only' : 'fg-label'))
  /** style.size modifier for the field's control (undefined = medium). */
  const sizeClass = computed(() =>
    props.node.style?.size ? `fg-control--${props.node.style.size}` : undefined,
  )

  return {
    ctx: ctx as FormContext,
    value,
    error,
    label,
    description,
    placeholder,
    required,
    fieldId,
    errorId,
    describedBy,
    onBlur,
    labelClass,
    sizeClass,
  }
}
