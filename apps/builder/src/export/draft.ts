// Save and continue later (meta.saveDraft) in the code targets: answers are
// kept in the visitor's browser (localStorage) while they fill the form,
// restored on their next visit, and removed once the form is sent or when
// they choose "Clear saved answers". Files are never kept; a form with
// upload fields says so. The storage format is the renderer's (draft.ts):
// {"v": version, "data": answers} under formsgen:<name>:draft, the version
// naming the export kind so a draft is only read by the code that wrote it.

import { draftDropsFiles, draftKey, draftVersion, type FormSchema, type MessageCatalog } from '@formsgen/renderer'
import { esc } from '@/registry/emitters/shared'
import type { CssFrameworkAdapter } from './css/types'

export type DraftWriter = 'vue' | 'react' | 'html' | 'blazor'

export const usesDraft = (schema: FormSchema): boolean => schema.meta.saveDraft === true

/**
 * Storage helpers (JS/TS): the key and version, the answers as JSON
 * without files, and storage access that never throws (private modes,
 * full storage, no window during server rendering).
 */
export function draftHelpers(schema: FormSchema, writer: DraftWriter, ts: boolean): string {
  const t = (annotation: string): string => (ts ? annotation : '')
  return `// Save and continue later: the answers are kept in this browser until sent.
var FG_DRAFT_KEY = ${JSON.stringify(draftKey(schema.meta.name))}
var FG_DRAFT_VERSION = ${JSON.stringify(draftVersion(schema.tree, writer))}
// The answers as stored: files left out (they can't be kept).
function fgDraftJson(value${t(': unknown')})${t(': string')} {
  return JSON.stringify(value, function (_key, v) {
    if (Array.isArray(v)) return v.filter(function (x) { return !(typeof Blob !== 'undefined' && x instanceof Blob) })
    return typeof Blob !== 'undefined' && v instanceof Blob ? undefined : v
  })
}
function fgDraftStore()${t(': Storage | null')} {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
  } catch (error) {
    return null
  }
}
// The saved answers of this form version, or null.
function fgDraftRead()${t(': Record<string, unknown> | null')} {
  try {
    var store = fgDraftStore()
    var saved = JSON.parse((store && store.getItem(FG_DRAFT_KEY)) || 'null')
    return saved && saved.v === FG_DRAFT_VERSION && saved.data && typeof saved.data === 'object' && !Array.isArray(saved.data) ? saved.data : null
  } catch (error) {
    return null
  }
}
function fgDraftWrite(json${t(': string')})${t(': boolean')} {
  try {
    var store = fgDraftStore()
    if (!store) return false
    store.setItem(FG_DRAFT_KEY, '{"v":' + JSON.stringify(FG_DRAFT_VERSION) + ',"data":' + json + '}')
    return true
  } catch (error) {
    return false
  }
}
function fgDraftRemove()${t(': void')} {
  try {
    var store = fgDraftStore()
    if (store) store.removeItem(FG_DRAFT_KEY)
  } catch (error) {
    // Storage unavailable: nothing was kept.
  }
}`
}

/** The note above the form, with the "Clear saved answers" button. */
export function draftBar(lang: 'vue' | 'react' | 'blazor' | 'html', schema: FormSchema, css: CssFrameworkAdapter, messages: MessageCatalog): string {
  const files = draftDropsFiles(schema.tree) ? ` ${messages.draftNoFiles}` : ''
  const on = esc(messages.draftOn + files)
  const restored = esc(messages.draftRestored + files)
  const clear = esc(messages.draftClear)
  const cls = (slot: 'draft' | 'draftText' | 'draftClear', attr: string): string => {
    const value = css.classes(slot)
    return value ? ` ${attr}="${value}"` : ''
  }
  const vueSafe = (s: string): string => s.replace(/\{/g, '&#123;')
  const jsxSafe = (s: string): string => s.replace(/[{}]/g, (b) => `{'${b}'}`)
  switch (lang) {
    case 'vue':
      return `<div${cls('draft', 'class')} data-fg-draft>
  <p${cls('draftText', 'class')}><template v-if="fgDraft === 'restored'">${vueSafe(restored)}</template><template v-else>${vueSafe(on)}</template></p>
  <button v-if="fgDraft !== ''" type="button"${cls('draftClear', 'class')} data-fg-draft-clear @click="fgDraftClear">${vueSafe(clear)}</button>
</div>`
    case 'react':
      return `<div${cls('draft', 'className')} data-fg-draft>
  <p${cls('draftText', 'className')}>{fgDraft === 'restored' ? <>${jsxSafe(restored)}</> : <>${jsxSafe(on)}</>}</p>
  {fgDraft !== '' && <button type="button"${cls('draftClear', 'className')} data-fg-draft-clear onClick={fgDraftClear}>${jsxSafe(clear)}</button>}
</div>`
    case 'blazor':
      return `<div${cls('draft', 'class')} data-fg-draft>
  <p${cls('draftText', 'class')}>@(fgDraft == "restored" ? ${csString(messages.draftRestored + files)} : ${csString(messages.draftOn + files)})</p>
  @if (fgDraft != "")
  {
    <button type="button"${cls('draftClear', 'class')} data-fg-draft-clear @onclick="FgDraftClear">${clear.replace(/@/g, '&#64;')}</button>
  }
</div>`
    default:
      return `<div${cls('draft', 'class')} data-fg-draft>
  <p${cls('draftText', 'class')}><span data-fg-draft-on>${on}</span><span data-fg-draft-restored hidden>${restored}</span></p>
  <button type="button"${cls('draftClear', 'class')} data-fg-draft-clear hidden>${clear}</button>
</div>`
  }
}

const csString = (s: string): string => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/** Vue (script setup): restore after mount, save on every change. */
export function vueDraftBlock(messages: MessageCatalog, resetExtras: string): string {
  return `const fgDraftPristine = fgDraftJson(form)
let fgDraftLast = fgDraftPristine
// '' nothing kept; 'saved' answers kept; 'restored' kept answers came back.
const fgDraft = ref<'' | 'saved' | 'restored'>('')
onMounted(() => {
  const saved = fgDraftRead()
  if (!saved) return
  for (const key of Object.keys(form)) if (key in saved) (form as Record<string, unknown>)[key] = saved[key]
  fgDraftLast = fgDraftJson(form)
  fgDraft.value = 'restored'
})
function fgDraftSave(): void {
  const json = fgDraftJson(form)
  if (json === fgDraftLast) return
  fgDraftLast = json
  if (json === fgDraftPristine) {
    fgDraftRemove()
    fgDraft.value = ''
  } else if (fgDraftWrite(json) && fgDraft.value === '') {
    fgDraft.value = 'saved'
  }
}
watch(form, fgDraftSave, { deep: true })
// The form was sent: nothing is kept (until the answers change again).
function fgDraftForget(): void {
  fgDraftRemove()
  fgDraftLast = fgDraftJson(form)
  fgDraft.value = ''
}
// "Clear saved answers": forget them and start over.
function fgDraftClear(): void {
  fgDraftForget()
  Object.assign(form, JSON.parse(fgDraftPristine))
  for (const key of Object.keys(errors)) delete errors[key]
  touched.clear()
  result.value = null${resetExtras}
  fgAnnounce(${JSON.stringify(messages.draftCleared)})
}`
}

/** React: restore after mount (no server/client mismatch), save on every change. */
export function reactDraftHooks(calc: boolean): string {
  return `  // Save and continue later: '' nothing kept; 'saved' answers kept; 'restored' kept answers came back.
  const [fgDraft, setFgDraft] = useState<'' | 'saved' | 'restored'>('')
  const [fgDraftPristine] = useState(() => fgDraftJson(form))
  const fgDraftLast = useRef(fgDraftPristine)
  // The form state from before a restore (its save is skipped).
  const fgDraftStale = useRef<FormData | null>(null)
  useEffect(() => {
    const saved = fgDraftRead()
    if (!saved) return
    const next = { ...form } as Record<string, unknown>
    for (const key of Object.keys(next)) if (key in saved) next[key] = saved[key]
    const typed = ${calc ? 'fgCalc(next as unknown as FormData)' : 'next as unknown as FormData'}
    fgDraftStale.current = form
    fgDraftLast.current = fgDraftJson(typed)
    setForm(typed)
    setFgDraft('restored')
  }, [])
  useEffect(() => {
    if (form === fgDraftStale.current) return
    const json = fgDraftJson(form)
    if (json === fgDraftLast.current) return
    fgDraftLast.current = json
    if (json === fgDraftPristine) {
      fgDraftRemove()
      setFgDraft('')
    } else if (fgDraftWrite(json)) {
      setFgDraft((state) => (state === '' ? 'saved' : state))
    }
  }, [form])`
}

/** React handlers: forget after sending, clear on request. */
export function reactDraftHandlers(messages: MessageCatalog, resetLines: string): string {
  return `  // The form was sent: nothing is kept (until the answers change again).
  function fgDraftForget(sent: FormData): void {
    fgDraftRemove()
    fgDraftLast.current = fgDraftJson(sent)
    setFgDraft('')
  }

  // "Clear saved answers": forget them and start over.
  function fgDraftClear(): void {
    fgDraftRemove()
    fgDraftLast.current = fgDraftPristine
    setFgDraft('')
${resetLines}
    fgAnnounce(${JSON.stringify(messages.draftCleared)})
  }`
}

/**
 * Plain HTML: the answers live in the controls, so the saved state is
 * every control's value by id (checked for boxes, chosen options for
 * multi-selects), the item count of each repeating list and the chips
 * (tags, dates). Restoring adds the items first (outer lists before inner
 * ones), sets the controls, then fires input events so every wired
 * listener (slider fills, conditions, calculations) catches up.
 * fgDraftSave() runs at the end of updateConditions().
 */
export function htmlDraftRuntime(messages: MessageCatalog, opts: { dates: boolean; repeaters: boolean }): string {
  return `// The state of every control (by id), item counts and chips.
function fgDraftState() {
  var items = {}
  Array.prototype.forEach.call(form.querySelectorAll('[data-fg-items]'), function (list) {
    items[list.getAttribute('data-fg-items')] = list.children.length
  })
  var controls = {}
  Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea, [data-fg-richtext]'), function (el) {
    var country = el.getAttribute('data-fg-phone-country')
    var key = el.id || (country ? 'country:' + country : '')
    if (!key || el.type === 'file' || el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return
    if (el.hasAttribute('data-fg-richtext')) controls[key] = fgRichClean(el.innerHTML)
    else if (el.type === 'checkbox' || el.type === 'radio') controls[key] = el.checked
    else if (el.multiple) controls[key] = Array.prototype.map.call(el.selectedOptions, function (option) { return option.value })
    else controls[key] = el.value
  })
  return { items: items, controls: controls, tags: fgTags${opts.dates ? ', dates: fgDates' : ''} }
}
function fgDraftApply(state) {${opts.repeaters ? `
  var items = state.items || {}
  Object.keys(items).sort(function (a, b) { return a.split('.').length - b.split('.').length }).forEach(function (path) {
    var want = Number(items[path])
    if (!(want >= 0) || !document.querySelector('[data-fg-items="' + path + '"]')) return
    for (var n = fgItemElements(path).length; n < want; n++) fgAddItem(path, false)
    while (fgItemElements(path).length > want) {
      var list = fgItemElements(path)
      list[list.length - 1].remove()
    }
  })` : ''}
  var controls = state.controls || {}
  var changed = []
  Object.keys(controls).forEach(function (key) {
    var el = key.indexOf('country:') === 0
      ? form.querySelector('[data-fg-phone-country="' + key.slice(8) + '"]')
      : document.getElementById(key)
    if (!el || !form.contains(el)) return
    var value = controls[key]
    if (el.hasAttribute('data-fg-richtext')) el.innerHTML = fgRichClean(value)
    else if (el.type === 'checkbox' || el.type === 'radio') el.checked = value === true
    else if (el.multiple) Array.prototype.forEach.call(el.options, function (option) { option.selected = Array.isArray(value) && value.indexOf(option.value) !== -1 })
    else if (typeof value === 'string') el.value = value
    changed.push(el)
  })
  var tags = state.tags || {}
  Object.keys(tags).forEach(function (path) {
    if (Array.isArray(tags[path]) && fgTags[path]) fgTags[path] = tags[path].map(String)
  })
  fgEach(form, '[data-fg-kind="tags"]', function (wrap) { if (wrap.fgPaint) wrap.fgPaint() })${opts.dates ? `
  var dates = state.dates || {}
  Object.keys(dates).forEach(function (path) {
    if (Array.isArray(dates[path]) && fgDates[path]) {
      fgDates[path] = dates[path].map(String)
      fgPaintDates(path)
    }
  })` : ''}
  changed.forEach(function (el) { el.dispatchEvent(new Event('input', { bubbles: true })) })
}
// '' nothing kept; 'saved' answers kept; 'restored' kept answers came back.
var fgDraftReady = false
var fgDraftMode = ''
var fgDraftPristine = ''
var fgDraftLast = ''
function fgDraftShow(mode) {
  fgDraftMode = mode
  var bar = form.querySelector('[data-fg-draft]')
  bar.querySelector('[data-fg-draft-on]').hidden = mode === 'restored'
  bar.querySelector('[data-fg-draft-restored]').hidden = mode !== 'restored'
  bar.querySelector('[data-fg-draft-clear]').hidden = mode === ''
}
function fgDraftSave() {
  if (!fgDraftReady) return
  var json = fgDraftJson(fgDraftState())
  if (json === fgDraftLast) return
  fgDraftLast = json
  if (json === fgDraftPristine) {
    fgDraftRemove()
    fgDraftShow('')
  } else if (fgDraftWrite(json) && fgDraftMode === '') {
    fgDraftShow('saved')
  }
}
// The form was sent: nothing is kept (until the answers change again).
function fgDraftForget() {
  fgDraftRemove()
  fgDraftLast = fgDraftJson(fgDraftState())
  fgDraftShow('')
}
// Once the page is set up: note the starting state, then restore.
function fgDraftStart() {
  fgDraftPristine = fgDraftLast = fgDraftJson(fgDraftState())
  var saved = fgDraftRead()
  if (saved) {
    try {
      fgDraftApply(saved)
      updateConditions()
      fgDraftLast = fgDraftJson(fgDraftState())
      fgDraftShow('restored')
    } catch (error) {
      console.error('Saved answers could not be restored', error)
    }
  }
  fgDraftReady = true
}
// "Clear saved answers": forget them and start over.
form.querySelector('[data-fg-draft-clear]').addEventListener('click', function () {
  fgDraftRemove()
  fgDraftShow('')
  fgResetForm()
  fgAnnounce(${JSON.stringify(messages.draftCleared)})
})`
}

/**
 * Blazor: the model as JSON (System.Text.Json; upload lists written empty),
 * through IJSRuntime and localStorage. Restored after the first render
 * (JS interop isn't available before it), saved after every later render
 * when the answers changed.
 */
export function blazorDraftBlock(schema: FormSchema, model: string, messages: MessageCatalog, opts: { uploads: boolean; calc: boolean; resetLines: string; prefill?: boolean }): string {
  return `
    // Save and continue later: the answers are kept in this browser until sent.
    private const string FgDraftKey = ${csString(draftKey(schema.meta.name))};
    private const string FgDraftVersion = ${csString(draftVersion(schema.tree, 'blazor'))};
    private static readonly JsonSerializerOptions FgDraftOptions = new()${opts.uploads ? ' { Converters = { new FgNoFiles() } }' : ''};
    // "" nothing kept; "saved" answers kept; "restored" kept answers came back.
    private string fgDraft = "";
    private string? fgDraftPristine;
    private string? fgDraftLast;

    private string FgDraftJson() => JsonSerializer.Serialize(Model, FgDraftOptions);
${opts.uploads ? `
    // Files can't be kept: upload lists are stored empty.
    private sealed class FgNoFiles : System.Text.Json.Serialization.JsonConverter<List<FgUpload>>
    {
        public override List<FgUpload> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            reader.Skip();
            return new();
        }

        public override void Write(Utf8JsonWriter writer, List<FgUpload> value, JsonSerializerOptions options)
        {
            writer.WriteStartArray();
            writer.WriteEndArray();
        }
    }
` : ''}
    private async Task FgDraftLoad()
    {
        fgDraftPristine = fgDraftLast = FgDraftJson();
        try
        {
            var raw = await FgJs.InvokeAsync<string?>("localStorage.getItem", FgDraftKey);
            if (string.IsNullOrEmpty(raw)) return;
            using var saved = JsonDocument.Parse(raw);
            if (!saved.RootElement.TryGetProperty("v", out var version) || version.GetString() != FgDraftVersion) return;
            if (!saved.RootElement.TryGetProperty("data", out var data)) return;
            var restored = data.Deserialize<${model}>(FgDraftOptions);
            if (restored is null) return;
            Model = restored;
            FgInitEdit();${opts.prefill ? '\n            FgPrefill();' : ''}${opts.calc ? '\n            FgCalc();' : ''}
            fgDraftLast = FgDraftJson();
            fgDraft = "restored";
            StateHasChanged();
        }
        catch (Exception)
        {
            // Unreadable, or storage unavailable: start empty.
        }
    }

    private async Task FgDraftSave()
    {
        if (fgDraftLast is null) return;
        var json = FgDraftJson();
        if (json == fgDraftLast) return;
        fgDraftLast = json;
        var before = fgDraft;
        try
        {
            if (json == fgDraftPristine)
            {
                await FgJs.InvokeVoidAsync("localStorage.removeItem", FgDraftKey);
                fgDraft = "";
            }
            else
            {
                await FgJs.InvokeVoidAsync("localStorage.setItem", FgDraftKey, "{\\"v\\":" + JsonSerializer.Serialize(FgDraftVersion) + ",\\"data\\":" + json + "}");
                if (fgDraft == "") fgDraft = "saved";
            }
        }
        catch (Exception)
        {
            // Storage full or blocked: nothing kept.
        }
        if (fgDraft != before) StateHasChanged();
    }

    // The form was sent: nothing is kept (until the answers change again).
    private async Task FgDraftForget()
    {
        fgDraftLast = FgDraftJson();
        fgDraft = "";
        try
        {
            await FgJs.InvokeVoidAsync("localStorage.removeItem", FgDraftKey);
        }
        catch (Exception)
        {
        }
    }

    // "Clear saved answers": forget them and start over.
    private async Task FgDraftClear()
    {
${opts.resetLines}
        await FgDraftForget();
        await FgAnnounce(${csString(messages.draftCleared)});
    }
`
}

