// Currency and address fields in every code target: the money helpers with
// the form locale's separators baked in, the suggestion script and the
// datalist, numbers and strings in the typed models and the validation export.
import { parseFormSchema, type ElementNode, type FormSchema } from '@albahadly/formsgen-renderer'
import { describe, expect, it } from 'vitest'
import { getCssAdapter } from '../css'
import { getTarget } from './index'

function schema(tree: ElementNode[], locale = 'de'): FormSchema {
  const result = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'money', locale, dir: 'ltr' }, tree })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.schema
}
const out = (target: string, s: FormSchema): string =>
  getTarget(target)!
    .generate({ schema: s, css: getCssAdapter('vanilla') })
    .map((f) => f.content)
    .join('\n')

const tree: ElementNode[] = [
  { id: 'price', type: 'currency', name: 'price', props: { label: 'Preis', currency: 'EUR', decimals: 2 }, validation: [{ rule: 'required' }] },
  { id: 'place', type: 'address', name: 'place', props: { label: 'Ort', suggestUrl: 'http://x/s?q={q}&n=1', minChars: 2 } },
]

describe('currency and address in the code targets', () => {
  const s = schema(tree)

  it('html: a decimal text control read as money, a datalist wired by the shared script', () => {
    const html = out('html', s)
    expect(html).toContain('<input id="fg_price" type="text" inputmode="decimal" autocomplete="off" class="fg-input" data-fg-path="price" data-fg-kind="currency" data-fg-decimals="2"')
    expect(html).toContain('<span id="fg_price-prefix" class="fg-affix">€</span>')
    expect(html).toContain("if (kind === 'currency') return fgMoneyParse(el.value, Number(el.getAttribute('data-fg-decimals')))")
    expect(html).toContain('function fgWireMoney(root)')
    // the form's separators (de) are baked into the formatter
    expect(html).toContain('whole = whole.slice(0, i) + "." + whole.slice(i)')
    expect(html).toContain('(parts[1] ? "," + parts[1] : \'\')')
    expect(html).toContain('list="fg_place-list" autocomplete="off" data-fg-suggest="http://x/s?q={q}&amp;n=1" data-fg-suggest-min="2"')
    expect(html).toContain('<datalist id="fg_place-list"></datalist>')
    expect(html).toContain('function fgWireSuggest(root)')
    expect(html).toContain('fgWireMoney(root)\n      fgWireSuggest(root)')
  })

  it('vue and react keep the typed text until blur and wire the suggestions on the root', () => {
    const vue = out('vue-standalone', s)
    expect(vue).toContain(`:value="fgMoneyText('price', form.price, 2)" @input="fgMoneyInput('price', $event, 2)" @blur="fgMoneyBlur('price')"`)
    expect(vue).toContain('const fgMoneyDraft = reactive<Record<string, string>>({})')
    expect(vue).toContain('onMounted(() => fgWireSuggest(fgRoot.value))')
    expect(vue).toContain('ref="fgRoot"')
    expect(vue).toContain('price: number | null')
    expect(vue).toContain('place: string')
    const tsx = out('react', s)
    expect(tsx).toContain(`value={fgMoneyText('price', form.price, 2)}`)
    expect(tsx).toContain(`onChange={(e: React.ChangeEvent<HTMLInputElement>) => fgMoneyInput('price', e.target.value, 2)} onBlur={() => fgMoneyBlur('price')}`)
    expect(tsx).toContain('const [fgMoney, setFgMoney] = useState<Record<string, string>>({})')
    expect(tsx).toContain('fgWireSuggest(fgRoot.current)')
    expect(tsx).toContain('ref={fgRoot}')
    expect(tsx).toContain('list="fg_place-list" autoComplete="off"')
  })

  it('blazor parses and formats in C# with the same rules and runs the suggestion script', () => {
    const razor = out('blazor', s)
    expect(razor).toContain(`value='@FgMoneyText("Price", Model.Price, 2)' @oninput='e => Model.Price = FgMoneyInput("Price", e, 2)' @onblur='() => FgMoneyBlur("Price")'`)
    expect(razor).toContain('private static double? FgMoneyParse(string text, int decimals)')
    expect(razor).toContain('whole = whole.Insert(i, ".")')
    expect(razor).toContain('private const string FgSuggestScript = @"')
    expect(razor).toContain('await FgJs.InvokeVoidAsync("fgWireSuggest", fgFormRoot);')
    expect(razor).toContain('public double? Price { get; set; }')
    expect(razor).toContain('<InputText id="fg_place" @bind-Value="Model.Place"')
  })

  it('the validation export types money as a nullable number and the address as text', () => {
    const files = getTarget('validation')!.generate({ schema: s, css: getCssAdapter('vanilla') })
    const zod = files.find((f) => f.path.endsWith('.zod.ts'))!.content
    expect(zod).toMatch(/price: z\.number\(\)\.nullable\(\)\.refine\(\(v\) => !fgIsBlank\(v\), "[^"]+"\)/)
    expect(zod).toContain('place: z.string()')
  })

  it('a form without them carries none of the helpers', () => {
    const plain = schema([{ id: 't', type: 'text', name: 't', props: { label: 'T' } }])
    for (const target of ['html', 'vue-standalone', 'react', 'blazor']) {
      const code = out(target, plain)
      expect(code, target).not.toContain('fgMoney')
      expect(code, target).not.toContain('fgWireSuggest')
    }
  })
})
