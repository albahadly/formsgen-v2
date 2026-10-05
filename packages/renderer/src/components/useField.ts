import { computed, inject } from 'vue'
import { FORM_CONTEXT, ITEM_SCOPE, type FormContext } from '../context'
import { floatsLabel } from '../labels'
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
  /** style.size, else the form's meta.fieldSize ('md' = explicitly medium). */
  const sizeClass = computed(() => {
    const size = props.node.style?.size ?? ctx.fieldSize?.()
    return size && size !== 'md' ? `fg-control--${size}` : undefined
  })
  const text = (key: string): string | null => {
    const v = props.node.props[key]
    return typeof v === 'string' && v.trim() !== '' ? v : null
  }
  /** Help text shown in a tooltip beside the label. */
  const tooltip = computed(() => text('tooltip'))
  /** Text add-ons before/after the control (e.g. "$", "kg"). */
  const prefix = computed(() => text('prefix'))
  const suffix = computed(() => text('suffix'))
  /** The label floats inside the control (meta.floatingLabels). */
  const floating = computed(() => floatsLabel(props.node, { floatingLabels: ctx.floatingLabels?.() ?? false }))

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
    tooltip,
    prefix,
    suffix,
    floating,
  }
}
