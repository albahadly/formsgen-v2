import { lazy, Suspense, useState, type ComponentType } from 'react'

// The same form exported three times, once per CSS framework. Each file under
// src/forms/<framework>/ is exactly what the builder's Download button writes;
// the host app only adds the framework's stylesheet (the vanilla component
// imports its own CSS). ?css=tailwind or ?css=bootstrap5 picks a variant.
type Variant = 'vanilla' | 'tailwind' | 'bootstrap5'
type FormProps = { onSubmit?: (payload: Record<string, unknown>) => void }
type Loader = () => Promise<{ default: ComponentType<FormProps> }>

const VARIANTS: Record<Variant, { label: string; load: Loader }> = {
  vanilla: { label: 'Vanilla CSS', load: () => import('./forms/vanilla/EventRegistrationForm') },
  tailwind: {
    label: 'Tailwind',
    load: async () => {
      await import('./tailwind.css')
      return import('./forms/tailwind/EventRegistrationForm')
    },
  },
  bootstrap5: {
    label: 'Bootstrap 5',
    load: async () => {
      await import('bootstrap/dist/css/bootstrap.min.css')
      return import('./forms/bootstrap5/EventRegistrationForm')
    },
  },
}

const FORMS: Record<Variant, ComponentType<FormProps>> = {
  vanilla: lazy(VARIANTS.vanilla.load),
  tailwind: lazy(VARIANTS.tailwind.load),
  bootstrap5: lazy(VARIANTS.bootstrap5.load),
}

function variantFromUrl(): Variant {
  const requested = new URLSearchParams(window.location.search).get('css')
  return requested !== null && requested in VARIANTS ? (requested as Variant) : 'vanilla'
}

export default function App() {
  const [variant] = useState(variantFromUrl)
  const [last, setLast] = useState<Record<string, unknown> | null>(null)
  const Form = FORMS[variant]
  return (
    <main style={{ maxWidth: 720, margin: '24px auto', padding: '0 16px' }}>
      <nav aria-label="CSS framework" style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {(Object.keys(VARIANTS) as Variant[]).map((key) => (
          <a key={key} href={`?css=${key}`} aria-current={key === variant ? 'page' : undefined}>
            {VARIANTS[key].label}
          </a>
        ))}
      </nav>
      {last && (
        <p role="status" data-example-thanks>
          Thanks, {String(last['first_name'])}: {String(last['seats'])} seat(s) registered.
        </p>
      )}
      <Suspense fallback={<p>Loading the form…</p>}>
        <Form onSubmit={setLast} />
      </Suspense>
    </main>
  )
}
