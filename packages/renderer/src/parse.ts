// Structural validation for untrusted schema input (project open, JSON
// import, export round-trips). Dependency-free by design — no zod.

import { isSafeUrl } from './elements'
import { REPEATER_TYPE, itemPlacementProblem } from './repeater'
import {
  CLASS_TOKEN_PATTERN,
  NAME_PATTERN,
  SCHEMA_ID,
  type Condition,
  type ConditionGroups,
  type ElementNode,
  type FormSchema,
  type Rule,
} from './schema'
import { THEME_TOKEN_PATTERN, isSafeThemeValue } from './theme'

export type ParseResult =
  | { ok: true; schema: FormSchema }
  | { ok: false; errors: string[] }

const RULE_NAMES = new Set([
  'required',
  'min',
  'max',
  'between',
  'email',
  'url',
  'regex',
  'same-as',
])

const CONDITION_OPERATORS = new Set([
  'equals',
  'not-equals',
  'contains',
  'empty',
  'not-empty',
  'greater-than',
  'less-than',
])

const URL_PROPS = ['href', 'src'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function parseFormSchema(input: unknown): ParseResult {
  const errors: string[] = []

  if (!isRecord(input)) {
    return { ok: false, errors: ['root: expected an object'] }
  }
  if (input['$schema'] !== SCHEMA_ID) {
    errors.push(`$schema: expected "${SCHEMA_ID}"`)
  }

  const meta = input['meta']
  if (!isRecord(meta)) {
    errors.push('meta: expected an object')
  } else {
    if (!isNonEmptyString(meta['name']) || !NAME_PATTERN.test(meta['name'])) {
      errors.push('meta.name: expected a slug (letter, then letters/digits/underscores)')
    }
    if (!isNonEmptyString(meta['locale'])) {
      errors.push('meta.locale: expected a non-empty string')
    }
    if (meta['dir'] !== 'ltr' && meta['dir'] !== 'rtl') {
      errors.push('meta.dir: expected "ltr" or "rtl"')
    }
    if (meta['floatingLabels'] !== undefined && typeof meta['floatingLabels'] !== 'boolean') {
      errors.push('meta.floatingLabels: expected a boolean')
    }
    const fieldSize = meta['fieldSize']
    if (fieldSize !== undefined && !['sm', 'md', 'lg'].includes(fieldSize as string)) {
      errors.push('meta.fieldSize: expected one of sm, md, lg')
    }
    const theme = meta['theme']
    if (theme !== undefined) {
      if (!isRecord(theme)) {
        errors.push('meta.theme: expected an object')
      } else {
        // Values are written into generated CSS — reject anything that could
        // end a declaration or rule.
        for (const [token, value] of Object.entries(theme)) {
          if (!THEME_TOKEN_PATTERN.test(token)) {
            errors.push(`meta.theme.${token}: expected a token name (lowercase letters, digits, dashes)`)
          } else if (!isSafeThemeValue(value)) {
            errors.push(`meta.theme.${token}: expected a plain CSS value (no ; { } < > \\ @ or line breaks)`)
          }
        }
      }
    }
  }

  const tree = input['tree']
  if (!Array.isArray(tree)) {
    errors.push('tree: expected an array')
  } else {
    const seenIds = new Set<string>()
    validateNodes(tree, 'tree', seenIds, errors)
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, schema: input as unknown as FormSchema }
}

const STYLE_ENUMS: Record<string, readonly string[]> = {
  size: ['sm', 'md', 'lg'],
  align: ['center', 'end'],
  tone: ['muted', 'primary', 'danger'],
}

function validateStyle(style: unknown, path: string, errors: string[]): void {
  if (style === undefined) return
  if (!isRecord(style)) {
    errors.push(`${path}: expected an object`)
    return
  }
  for (const [key, allowed] of Object.entries(STYLE_ENUMS)) {
    const value = style[key]
    if (value !== undefined && !allowed.includes(value as string)) {
      errors.push(`${path}.${key}: expected one of ${allowed.join(', ')}`)
    }
  }
  if (style['hideLabel'] !== undefined && typeof style['hideLabel'] !== 'boolean') {
    errors.push(`${path}.hideLabel: expected a boolean`)
  }
  const className = style['className']
  if (className !== undefined) {
    const tokens = typeof className === 'string' ? className.split(/\s+/).filter(Boolean) : null
    if (!tokens || !tokens.every((token) => CLASS_TOKEN_PATTERN.test(token))) {
      errors.push(`${path}.className: expected space-separated CSS class names`)
    }
  }
}

const COL_SPANS = [1, 2, 3, 4, 6, 12]

function validateLayout(layout: unknown, path: string, errors: string[]): void {
  if (layout === undefined) return
  if (!isRecord(layout)) {
    errors.push(`${path}: expected an object`)
    return
  }
  for (const key of ['colSpan', 'colSpanSm', 'colSpanLg']) {
    const value = layout[key]
    if (value !== undefined && !COL_SPANS.includes(value as number)) {
      errors.push(`${path}.${key}: expected one of ${COL_SPANS.join(', ')}`)
    }
  }
}

function validateNodes(
  nodes: unknown[],
  path: string,
  seenIds: Set<string>,
  errors: string[],
  /** How many repeaters these nodes sit inside. */
  repeaterDepth = 0,
): void {
  const siblingNames = new Set<string>()
  nodes.forEach((raw, i) => {
    const p = `${path}[${i}]`
    if (!isRecord(raw)) {
      errors.push(`${p}: expected an object`)
      return
    }
    const id = raw['id']
    if (!isNonEmptyString(id)) {
      errors.push(`${p}.id: expected a non-empty string`)
    } else if (seenIds.has(id)) {
      errors.push(`${p}.id: duplicate id "${id}"`)
    } else {
      seenIds.add(id)
    }

    if (!isNonEmptyString(raw['type'])) {
      errors.push(`${p}.type: expected a non-empty string`)
    }
    if (!isRecord(raw['props'])) {
      errors.push(`${p}.props: expected an object`)
    } else {
      // Link/image targets end up in generated markup.
      for (const key of URL_PROPS) {
        const url = raw['props'][key]
        if (url !== undefined && url !== '' && !isSafeUrl(url)) {
          errors.push(`${p}.props.${key}: expected an http(s), mailto:, tel: or relative URL`)
        }
      }
    }

    const name = raw['name']
    if (name !== undefined) {
      if (!isNonEmptyString(name) || !NAME_PATTERN.test(name)) {
        errors.push(`${p}.name: expected a slug (letter, then letters/digits/underscores)`)
      } else if (siblingNames.has(name)) {
        errors.push(`${p}.name: duplicate name "${name}" among siblings`)
      } else {
        siblingNames.add(name)
      }
    }

    const type = raw['type']
    if (isNonEmptyString(type)) {
      const problem = itemPlacementProblem({ type, name: isNonEmptyString(name) ? name : undefined }, repeaterDepth)
      if (problem) errors.push(`${p}.${problem.field}: ${problem.message}`)
    }
    if (type === REPEATER_TYPE && name === undefined) {
      errors.push(`${p}.name: a repeater needs a name (its items are stored under it)`)
    }

    validateRules(raw['validation'], `${p}.validation`, errors)
    validateConditions(raw['conditions'], `${p}.conditions`, errors)
    validateStyle(raw['style'], `${p}.style`, errors)
    validateLayout(raw['layout'], `${p}.layout`, errors)

    const children = raw['children']
    if (children !== undefined) {
      if (!Array.isArray(children)) {
        errors.push(`${p}.children: expected an array`)
      } else {
        validateNodes(children, `${p}.children`, seenIds, errors, repeaterDepth + (type === REPEATER_TYPE ? 1 : 0))
      }
    }
  })
}

function validateRules(value: unknown, path: string, errors: string[]): void {
  if (value === undefined) return
  if (!Array.isArray(value)) {
    errors.push(`${path}: expected an array`)
    return
  }
  ;(value as unknown[]).forEach((raw, i) => {
    if (!isRecord(raw) || !RULE_NAMES.has(String((raw as Partial<Rule>).rule))) {
      errors.push(`${path}[${i}]: expected { rule: <known rule name> }`)
    }
  })
}

function validateConditions(value: unknown, path: string, errors: string[]): void {
  if (value === undefined) return
  if (!Array.isArray(value)) {
    errors.push(`${path}: expected an array of arrays (OR of AND-groups)`)
    return
  }
  ;(value as unknown[]).forEach((group, g) => {
    if (!Array.isArray(group)) {
      errors.push(`${path}[${g}]: expected an array of conditions`)
      return
    }
    ;(group as unknown[]).forEach((raw, c) => {
      if (
        !isRecord(raw) ||
        !isNonEmptyString((raw as Partial<Condition>).field) ||
        !CONDITION_OPERATORS.has(String((raw as Partial<Condition>).operator))
      ) {
        errors.push(`${path}[${g}][${c}]: expected { field, operator: <known operator> }`)
      }
    })
  })
}

/** Re-exported so consumers can build editors against the same closed lists. */
export const KNOWN_RULE_NAMES: ReadonlySet<string> = RULE_NAMES
export const KNOWN_CONDITION_OPERATORS: ReadonlySet<string> = CONDITION_OPERATORS

// Type-only re-export convenience for consumers of this module.
export type { ConditionGroups, ElementNode, FormSchema, Rule }
