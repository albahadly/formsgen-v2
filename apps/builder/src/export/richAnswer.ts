// Rich-text fields in the code targets, as the renderer's FgRichText: a
// contenteditable editor with a toolbar (bold, italic, lists, link). The
// script is wired once on the form root (editors in new items included):
//   [data-fg-rich]           the wrapper
//   [data-fg-rt-cmd]         toolbar buttons (bold, italic,
//                            insertUnorderedList, insertOrderedList, link)
//   [data-fg-richtext]       the editor (its value: the field path, or the
//                            Blazor field key)
// Each change reports fgRichClean(editor HTML), the renderer's
// cleanRichText rules in script; pasting inserts plain text.

import { RICH_TAGS, type ElementNode } from '@formsgen/renderer'

export const hasRichText = (nodes: ElementNode[]): boolean =>
  nodes.some((node) => node.type === 'richtext' || hasRichText(node.children ?? []))

/** The cleaner, link check and editor wiring (ES5; `ts` adds annotations). */
export function richTextRuntime(linkPrompt: string, ts: boolean): string {
  const t = (annotation: string): string => (ts ? annotation : '')
  const any = ts ? ': any' : ''
  return `// Rich text: the editor's HTML reduced to p, br, strong, em, u, s, lists and
// http(s)/mailto links (the renderer's cleanRichText); '' when empty.
var FG_RICH_TAGS${t(': Record<string, number>')} = ${JSON.stringify(Object.fromEntries([...RICH_TAGS].map((tag) => [tag, 1])))}
var FG_RICH_RENAME${t(': Record<string, string>')} = { b: 'strong', i: 'em', div: 'p' }
// A paragraph can't hold these (one that does is unwrapped).
function fgRichHoldsBlock(node${any})${t(': boolean')} {
  return Array.prototype.some.call(node.childNodes, function (child${any}) {
    return child.nodeType === 1 && (/^(p|div|ul|ol|li)$/i.test(child.tagName) || fgRichHoldsBlock(child))
  })
}
// Kept by the HTML parser's rules as content-free (their text goes too).
var FG_RICH_DROP${t(': Record<string, number>')} = { script: 1, style: 1, iframe: 1, frame: 1, frameset: 1, object: 1, embed: 1, applet: 1, template: 1, noscript: 1, noembed: 1, noframes: 1, textarea: 1, title: 1, xmp: 1, select: 1, option: 1, button: 1, head: 1, math: 1, svg: 1, canvas: 1, video: 1, audio: 1, form: 1, input: 1, source: 1, track: 1, link: 1, meta: 1, base: 1, param: 1, picture: 1, map: 1, dialog: 1, portal: 1 }
function fgRichHref(href${t(': string')})${t(': boolean')} {
  return /^(https?:\\/\\/|mailto:)[^\\s"<>]+$/i.test(href.trim())
}
function fgRichEsc(text${t(': string')})${t(': string')} {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function fgRichWrite(nodes${any}, inParagraph${t(': boolean')})${t(': string')} {
  var out = ''
  Array.prototype.forEach.call(nodes, function (node${any}) {
    if (node.nodeType === 3) {
      out += fgRichEsc(node.nodeValue.replace(/\\u00a0/g, ' '))
      return
    }
    if (node.nodeType !== 1) return
    var tag = node.tagName.toLowerCase()
    if (FG_RICH_DROP[tag]) return
    tag = FG_RICH_RENAME[tag] || tag
    if (!FG_RICH_TAGS[tag] || (tag === 'p' && (inParagraph || fgRichHoldsBlock(node)))) {
      out += fgRichWrite(node.childNodes, inParagraph)
      return
    }
    if (tag === 'br') {
      out += '<br>'
      return
    }
    if (tag === 'a') {
      var href = (node.getAttribute('href') || '').trim()
      out += fgRichHref(href)
        ? '<a href="' + fgRichEsc(href).replace(/"/g, '&quot;') + '">' + fgRichWrite(node.childNodes, inParagraph) + '</a>'
        : fgRichWrite(node.childNodes, inParagraph)
      return
    }
    out += '<' + tag + '>' + fgRichWrite(node.childNodes, inParagraph || tag === 'p') + '</' + tag + '>'
  })
  return out
}
function fgRichClean(html${t(': unknown')})${t(': string')} {
  if (typeof html !== 'string' || html.trim() === '') return ''
  var box = document.createElement('template')
  box.innerHTML = html
  var out = fgRichWrite(box.content.childNodes, false)
  return fgRichPlain(out) === '' && out.indexOf('<li>') === -1 ? '' : out
}
// The answer's text (answers inside text): tags as spaces, entities decoded.
function fgRichPlain(html${t(': unknown')})${t(': string')} {
  if (typeof html !== 'string') return ''
  return html
    .replace(/<br>|<\\/?(p|li|ul|ol)>/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\\s+/g, ' ')
    .trim()
}
// Toolbars and editors, wired once on the form root.
function fgWireRichText(root${any}, onChange${t(': (editor: HTMLElement, html: string) => void')}) {
  if (!root || root.fgRichWired) return
  root.fgRichWired = true
  root.addEventListener('mousedown', function (event${any}) {
    // Keep the editor's selection when a toolbar button is pressed.
    if (event.target.closest && event.target.closest('[data-fg-rt-cmd]')) event.preventDefault()
  })
  root.addEventListener('click', function (event${any}) {
    var button = event.target.closest && event.target.closest('[data-fg-rt-cmd]')
    if (!button) return
    var editor = button.closest('[data-fg-rich]').querySelector('[data-fg-richtext]')
    var command = button.getAttribute('data-fg-rt-cmd')
    if (command === 'link') {
      var url = window.prompt(${JSON.stringify(linkPrompt)}, 'https://')
      if (url === null) return
      editor.focus()
      if (url.trim() === '') document.execCommand('unlink')
      else if (fgRichHref(url)) document.execCommand('createLink', false, url.trim())
    } else {
      editor.focus()
      document.execCommand(command)
    }
    onChange(editor, fgRichClean(editor.innerHTML))
  })
  root.addEventListener('input', function (event${any}) {
    if (event.target.matches && event.target.matches('[data-fg-richtext]')) onChange(event.target, fgRichClean(event.target.innerHTML))
  })
  root.addEventListener('paste', function (event${any}) {
    if (!event.target.closest || !event.target.closest('[data-fg-richtext]')) return
    event.preventDefault()
    document.execCommand('insertText', false, event.clipboardData ? event.clipboardData.getData('text/plain') : '')
  })
}
// A value set elsewhere (a reset, saved answers) shows in editors not being typed in.
function fgRichSync(root${any}, valueOf${t(': (editor: HTMLElement) => unknown')}) {
  if (!root) return
  Array.prototype.forEach.call(root.querySelectorAll('[data-fg-richtext]'), function (editor${any}) {
    if (document.activeElement === editor) return
    var clean = fgRichClean(valueOf(editor))
    if (fgRichClean(editor.innerHTML) !== clean) editor.innerHTML = clean
  })
}`
}

/** Vue (script setup): wire the editors on mount, show values set elsewhere. */
export function vueRichText(linkPrompt: string): string {
  return `${richTextRuntime(linkPrompt, true)}
onMounted(() => {
  fgWireRichText(fgRoot.value, (editor, html) => {
    const path = editor.getAttribute('data-fg-richtext')!
    fgSet(path, html)
    revalidate(path)
  })
  fgRichSync(fgRoot.value, (editor) => fgGet(editor.getAttribute('data-fg-richtext')!))
})
watch(form, () => {
  void nextTick(() => fgRichSync(fgRoot.value, (editor) => fgGet(editor.getAttribute('data-fg-richtext')!)))
}, { deep: true })`
}

/** React: inside the component (the latest handler through a ref). */
export function reactRichTextHooks(): string {
  return `  // Rich-text editors: wired once on the form; changes go through the latest handler.
  const fgRichChange = useRef<(path: string, html: string) => void>(() => {})
  fgRichChange.current = (path, html) => setField(path, html)
  useEffect(() => {
    fgWireRichText(fgRoot.current, (editor, html) => fgRichChange.current(editor.getAttribute('data-fg-richtext')!, html))
  }, [])
  // Values set elsewhere (a reset, saved answers) show in the editors.
  useEffect(() => {
    fgRichSync(fgRoot.current, (editor) =>
      editor.getAttribute('data-fg-richtext')!.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], form),
    )
  })`
}

/** Blazor: the editor script (installed through IJSRuntime) and its .NET side. */
export function blazorRichText(linkPrompt: string): { script: string; members: string } {
  const script = `${richTextRuntime(linkPrompt, false)}
window.fgRich = function (root, dotnet) {
  fgWireRichText(root, function (editor, html) {
    dotnet.invokeMethodAsync('FgRichChanged', editor.getAttribute('data-fg-richtext'), html)
  })
}
window.fgRichSet = function (root, values) {
  fgRichSync(root, function (editor) {
    var key = editor.getAttribute('data-fg-richtext')
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fgRichClean(editor.innerHTML)
  })
}`
  return {
    script,
    members: `
    // Rich-text editors: run by a script on the form's root (FgRichTextScript),
    // which reports each change here; values set here (a new model: reset,
    // saved answers) are sent back after the next render.
    private readonly Dictionary<string, (Action<string> Set, string Value)> fgRich = new();
    private bool fgRichShow;

    private string FgRichKey(string key, Action<string> set, string value)
    {
        fgRich[key] = (set, value);
        return key;
    }

    private const string FgRichTextScript = ${csVerbatim(script)};

    [Microsoft.JSInterop.JSInvokable]
    public void FgRichChanged(string key, string html)
    {
        if (!fgRich.TryGetValue(key, out var entry)) return;
        entry.Set(html);
        fgRich[key] = (entry.Set, html);
        fgEdit.NotifyFieldChanged(FgField(key));
        StateHasChanged();
    }

    private async Task FgRichShowValues()
    {
        if (!fgRichShow || fgSelf is null) return;
        fgRichShow = false;
        await FgJs.InvokeVoidAsync("fgRichSet", fgFormRoot, fgRich.ToDictionary(entry => entry.Key, entry => entry.Value.Value));
    }
`,
  }
}

const csVerbatim = (s: string): string => `@"${s.replace(/"/g, '""')}"`
