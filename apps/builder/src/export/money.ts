// Currency and address fields (phase 45b): the runtime helpers every code
// target shares. Money formats and parses with the form locale's separators
// baked in at export time (the same two routines as the renderer's money.ts,
// in JS/TS and in C#); address suggestions are one script that fills an
// input's datalist from the provider named by its data-fg-suggest attribute.
import { moneySeparators, type ElementNode, type FormSchema } from '@albahadly/formsgen-renderer'
import type { ExportField } from './structure'

function treeHas(nodes: ElementNode[], type: string): boolean {
  return nodes.some((n) => n.type === type || (n.children !== undefined && treeHas(n.children, type)))
}

export const moneyFields = (fields: ExportField[]): ExportField[] => fields.filter((f) => f.node.type === 'currency')
export const suggestFields = (fields: ExportField[]): ExportField[] => fields.filter((f) => f.node.type === 'address')
export const hasMoney = (schema: FormSchema): boolean => treeHas(schema.tree, 'currency')
export const hasSuggest = (schema: FormSchema): boolean => treeHas(schema.tree, 'address')

const jsStr = (s: string): string => JSON.stringify(s)
const csStr = (s: string): string => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/** JS (ts = false) or TypeScript: fgMoneyFormat(value, decimals) and fgMoneyParse(text, decimals). */
export function moneyRuntime(locale: string, ts: boolean): string {
  const { group, decimal } = moneySeparators(locale)
  const t = (annotation: string): string => (ts ? annotation : '')
  return `// Money: the form's separators (${locale}). Parsing needs no locale: the last
// '.' or ',' followed by one to <decimals> digits is the decimal mark, every
// other separator groups digits; signs and currency marks are skipped.
function fgMoneyFormat(value${t(': unknown')}, decimals${t(': number')})${t(': string')} {
  if (typeof value !== 'number' || !isFinite(value)) return ''
  var parts = Math.abs(value).toFixed(decimals).split('.')
  var whole = parts[0] || '0'
  for (var i = whole.length - 3; i > 0; i -= 3) whole = whole.slice(0, i) + ${jsStr(group)} + whole.slice(i)
  return (value < 0 ? '-' : '') + whole + (parts[1] ? ${jsStr(decimal)} + parts[1] : '')
}
function fgMoneyParse(text${t(': string')}, decimals${t(': number')})${t(': number | null')} {
  var trimmed = text.trim()
  var digits = trimmed.replace(/[^\\d.,]/g, '')
  if (!/\\d/.test(digits)) return null
  var mark = Math.max(digits.lastIndexOf('.'), digits.lastIndexOf(','))
  var tail = mark === -1 ? '' : digits.slice(mark + 1)
  var isDecimal = mark !== -1 && decimals > 0 && tail.length >= 1 && tail.length <= decimals && /^\\d+$/.test(tail)
  var whole = (isDecimal ? digits.slice(0, mark) : digits).replace(/[.,]/g, '')
  var scale = Math.pow(10, decimals)
  var amount = Math.round(Number((whole === '' ? '0' : whole) + '.' + (isDecimal ? tail : '0')) * scale) / scale
  return trimmed.charAt(0) === '-' ? -amount : amount
}`
}

/** C# members: FgMoneyFormat / FgMoneyParse (the same rules as the JS), the per-field draft text. */
export function moneyMembers(locale: string): string {
  const { group, decimal } = moneySeparators(locale)
  return `
    // Money: the form's separators (${locale}); parsing takes the last '.' or ','
    // followed by one to <decimals> digits as the decimal mark, the rest as
    // grouping. While a field is being edited its text is kept as typed.
    private readonly Dictionary<string, string> fgMoneyDraft = new();

    private static string FgMoneyFormat(double? value, int decimals)
    {
        if (value is not { } v || double.IsNaN(v) || double.IsInfinity(v)) return "";
        var parts = Math.Abs(v).ToString("F" + decimals, System.Globalization.CultureInfo.InvariantCulture).Split('.');
        var whole = parts[0];
        for (var i = whole.Length - 3; i > 0; i -= 3) whole = whole.Insert(i, ${csStr(group)});
        return (v < 0 ? "-" : "") + whole + (parts.Length > 1 ? ${csStr(decimal)} + parts[1] : "");
    }

    private static double? FgMoneyParse(string text, int decimals)
    {
        var trimmed = text.Trim();
        var digits = new string(trimmed.Where(c => (c >= '0' && c <= '9') || c == '.' || c == ',').ToArray());
        if (!digits.Any(c => c >= '0' && c <= '9')) return null;
        var mark = Math.Max(digits.LastIndexOf('.'), digits.LastIndexOf(','));
        var tail = mark == -1 ? "" : digits[(mark + 1)..];
        var isDecimal = mark != -1 && decimals > 0 && tail.Length >= 1 && tail.Length <= decimals && tail.All(c => c >= '0' && c <= '9');
        var whole = (isDecimal ? digits[..mark] : digits).Replace(".", "").Replace(",", "");
        var scale = Math.Pow(10, decimals);
        var amount = Math.Round(double.Parse((whole == "" ? "0" : whole) + "." + (isDecimal ? tail : "0"), System.Globalization.CultureInfo.InvariantCulture) * scale, MidpointRounding.AwayFromZero) / scale;
        return trimmed.StartsWith('-') ? -amount : amount;
    }

    private string FgMoneyText(string member, double? value, int decimals) =>
        fgMoneyDraft.TryGetValue(member, out var text) ? text : FgMoneyFormat(value, decimals);

    private double? FgMoneyInput(string member, ChangeEventArgs e, int decimals)
    {
        var text = Convert.ToString(e.Value) ?? "";
        fgMoneyDraft[member] = text;
        return FgMoneyParse(text, decimals);
    }

    private void FgMoneyBlur(string member)
    {
        fgMoneyDraft.Remove(member);
        FgChanged(member);
    }
`
}

/**
 * JS (ts = false) or TypeScript: fgWireSuggest(root) wires every
 * [data-fg-suggest] input under root once. After a 300 ms pause with enough
 * typed (data-fg-suggest-min), the provider's JSON (a list of strings or of
 * objects with display_name / label / name, or a features / results / items
 * list of those) fills the input's datalist with up to eight options.
 */
/** C# member holding the suggestion script for the Blazor target (run through IJSRuntime). */
export const suggestMembers = (): string => `
    private const string FgSuggestScript = @"${suggestRuntime(false).replace(/"/g, '""')}";
`

export function suggestRuntime(ts: boolean): string {
  const t = (annotation: string): string => (ts ? annotation : '')
  return `// Address suggestions: the provider named by data-fg-suggest ({q} = the
// typed text) fills the input's datalist after a pause; its JSON is read loosely.
function fgSuggestText(item${t(': unknown')})${t(': string | null')} {
  if (typeof item === 'string') return item.trim() || null
  if (!item || typeof item !== 'object') return null
  var record = item${t(' as Record<string, unknown>')}
  if (record['properties'] && typeof record['properties'] === 'object') return fgSuggestText(record['properties'])
  var keys = ['display_name', 'label', 'name', 'text', 'address']
  for (var i = 0; i < keys.length; i++) {
    var v = record[keys[i]${t('!')}]
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
  }
  return null
}
function fgSuggestTexts(data${t(': unknown')})${t(': string[]')} {
  var list${t(': unknown')} = data
  if (list && typeof list === 'object' && !Array.isArray(list)) {
    var record = list${t(' as Record<string, unknown>')}
    list = record['features'] || record['results'] || record['items'] || []
  }
  if (!Array.isArray(list)) return []
  var out${t(': string[]')} = []
  list.forEach(function (item${t(': unknown')}) {
    var text = fgSuggestText(item)
    if (text && out.indexOf(text) === -1 && out.length < 8) out.push(text)
  })
  return out
}
function fgWireSuggest(root${t(': ParentNode | null')})${t(': void')} {
  if (!root) return
  Array.prototype.forEach.call(root.querySelectorAll('[data-fg-suggest]:not([data-fg-suggested])'), function (input${t(': HTMLInputElement')}) {
    input.setAttribute('data-fg-suggested', '')
    var url = input.getAttribute('data-fg-suggest') || ''
    var min = Number(input.getAttribute('data-fg-suggest-min')) || 3
    var timer${t(': ReturnType<typeof setTimeout> | undefined')}
    var request = 0
    input.addEventListener('input', function () {
      if (timer !== undefined) clearTimeout(timer)
      var q = input.value.trim()
      const target = input.list
      if (!target) return
      if (q.length < min) { target.innerHTML = ''; return }
      timer = setTimeout(function () {
        var mine = ++request
        fetch(url.replace('{q}', encodeURIComponent(q)))
          .then(function (response) { return response.json() })
          .then(function (data) {
            if (mine !== request) return
            target.innerHTML = ''
            fgSuggestTexts(data).forEach(function (text) {
              var option = document.createElement('option')
              option.value = text
              target.appendChild(option)
            })
          })
          .catch(function () {})
      }, 300)
    })
  })
}`
}
