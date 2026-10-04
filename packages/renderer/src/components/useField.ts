import { computed, inject } from 'vue'
import { FORM_CONTEXT, type FormContext } from '../context'
import type { ElementNode } from '../schema'

export interface FieldProps {
  node: ElementNode
  path: string
}

/** Shared wiring for value-bearing field components. */
export function useField(props: FieldProps) {
  const ctx = inject(FORM_CONTEXT)
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
  const fieldId = computed(() => `fg-${props.node.id}`)
  const onBlur = (): void => ctx.touch(props.path)

  return { ctx: ctx as FormContext, value, error, label, description, placeholder, required, fieldId, onBlur }
}
