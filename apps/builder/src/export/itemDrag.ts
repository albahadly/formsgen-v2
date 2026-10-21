// Dragging sortable repeater items in the code targets (as the renderer's
// FgRepeater): each item has a handle (⠿, draggable, hidden from assistive
// technology: the move buttons stay the keyboard way); dropping it on
// another item of the same list moves it there, the others close up. The
// dragged item carries data-fg-drag, the item under it data-fg-drop
// ("before" when moving up, "after" when moving down). Drags from another
// list (an inner one, files) are left alone, so they reach the outer item
// or the file input.

import type { MessageCatalog } from '@albahadly/formsgen-renderer'
import type { CssFrameworkAdapter } from './css/types'

/** Where index `n` ends up when `from` moves to `to` (JS, typed or not). */
export function movedIndexJs(ts: boolean): string {
  const t = (annotation: string): string => (ts ? annotation : '')
  return `function fgMovedIndex(n${t(': number')}, from${t(': number')}, to${t(': number')})${t(': number')} {
  if (n === from) return to
  if (from < to) return n > from && n <= to ? n - 1 : n
  return n >= to && n < from ? n + 1 : n
}`
}

/** The drag handle (markup per language); shown with two items or more. */
export function dragHandle(
  lang: 'vue' | 'react' | 'html' | 'blazor',
  css: CssFrameworkAdapter,
  messages: MessageCatalog,
  opts: { path: string; index: string; list: string },
): string {
  const title = messages.dragItem.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  const cls = css.classes('repeaterHandle')
  switch (lang) {
    case 'vue':
      return `<span v-if="${opts.list}.length > 1" class="${cls}" data-fg-handle draggable="true" aria-hidden="true" title="${title}" @dragstart="fgDragStart($event, '${opts.path}', ${opts.index})" @dragend="fgDragEnd()">⠿</span>`
    case 'react':
      return `{${opts.list}.length > 1 && <span className="${cls}" data-fg-handle draggable aria-hidden="true" title="${title}" onDragStart={(e) => fgDragStart(e, '${opts.path}', ${opts.index})} onDragEnd={fgDragEnd}>⠿</span>}`
    case 'html':
      return `<span class="${cls}" data-fg-handle draggable="true" aria-hidden="true" title="${title}">⠿</span>`
    default:
      // The script installed by FgItemDragInit runs the drag (see blazorItemDrag).
      return `@if (${opts.list}.Count > 1)
                {
                    <span class="${cls}" data-fg-handle draggable="true" aria-hidden="true" title="${title.replace(/@/g, '&#64;')}">⠿</span>
                }`
  }
}

/** Item fieldset attributes: drop target and drag/drop marks. */
export function dragTargetAttrs(lang: 'vue' | 'react', opts: { path: string; index: string; list: string }): string {
  switch (lang) {
    case 'vue':
      return ` :data-fg-drag="fgDragMark('${opts.path}', ${opts.index})" :data-fg-drop="fgDropMark('${opts.path}', ${opts.index})" @dragover="fgDragOver($event, '${opts.path}', ${opts.index})" @drop="fgDropItem($event, '${opts.path}', ${opts.index})"`
    default:
      return ` data-fg-drag={fgDragMark('${opts.path}', ${opts.index})} data-fg-drop={fgDropMark('${opts.path}', ${opts.index})} onDragOver={(e) => fgDragOver(e, '${opts.path}', ${opts.index})} onDrop={(e) => fgDropItem(e, '${opts.path}', ${opts.index})}`
  }
}

/** Shared by Vue and React: the drag start (data and drag image). */
function startTs(): string {
  return `if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', fgItemLabel(path, index))
  const item = fgItemElements(path)[index]
  if (item) event.dataTransfer.setDragImage(item, 16, 16)`
}

/** Vue (script setup): state, handlers and the move. */
export function vueItemDrag(messages: MessageCatalog): string {
  return `// Dragging items by their handle: the list being dragged in, the item and the one under it.
const fgItemDrag = reactive<{ path: string; from: number; at: number }>({ path: '', from: -1, at: -1 })
${movedIndexJs(true)}
function fgDragStart(event: DragEvent, path: string, index: number): void {
  Object.assign(fgItemDrag, { path, from: index, at: -1 })
  ${startTs()}
}
function fgDragEnd(): void {
  Object.assign(fgItemDrag, { path: '', from: -1, at: -1 })
}
function fgDragOver(event: DragEvent, path: string, index: number): void {
  if (fgItemDrag.path !== path) return
  event.preventDefault()
  event.stopPropagation()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  fgItemDrag.at = index
}
function fgDropItem(event: DragEvent, path: string, index: number): void {
  if (fgItemDrag.path !== path) return
  event.preventDefault()
  event.stopPropagation()
  const from = fgItemDrag.from
  fgDragEnd()
  void fgMoveItemTo(path, from, index)
}
function fgDragMark(path: string, index: number): '' | undefined {
  return fgItemDrag.path === path && fgItemDrag.from === index ? '' : undefined
}
function fgDropMark(path: string, index: number): 'before' | 'after' | undefined {
  if (fgItemDrag.path !== path || fgItemDrag.at !== index || fgItemDrag.from === index) return undefined
  return index < fgItemDrag.from ? 'before' : 'after'
}
/** Moves item \`from\` to \`to\` (the others close up); the moved item gets focus. */
async function fgMoveItemTo(path: string, from: number, to: number): Promise<void> {
  const list = fgList(path)
  if (from === to || to < 0 || to >= list.length) return
  const label = fgItemLabel(path, from)
  fgRemapItems(path, (n) => fgMovedIndex(n, from, to))
  list.splice(to, 0, list.splice(from, 1)[0]!)
  await nextTick()
  fgItemElements(path)[to]?.focus()
  fgAnnounce(${JSON.stringify(messages.itemMoved)}.split('{label}').join(label).split('{n}').join(String(to + 1)))
}`
}

/** React: state and handlers inside the component. */
export function reactItemDrag(messages: MessageCatalog): string {
  return `  // Dragging items by their handle: the list being dragged in, the item and the one under it.
  const [fgItemDrag, setFgItemDrag] = useState<{ path: string; from: number; at: number }>({ path: '', from: -1, at: -1 })

  function fgItemElements(path: string): HTMLElement[] {
    const repeater = fgRoot.current?.querySelector(\`[data-fg-repeater="\${path}"]\`)
    return Array.from(repeater?.querySelectorAll<HTMLElement>(':scope > div > [data-fg-item]') ?? [])
  }

  function fgDragStart(event: React.DragEvent, path: string, index: number): void {
    setFgItemDrag({ path, from: index, at: -1 })
    ${startTs()}
  }

  function fgDragEnd(): void {
    setFgItemDrag({ path: '', from: -1, at: -1 })
  }

  function fgDragOver(event: React.DragEvent, path: string, index: number): void {
    if (fgItemDrag.path !== path) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    if (fgItemDrag.at !== index) setFgItemDrag({ ...fgItemDrag, at: index })
  }

  function fgDropItem(event: React.DragEvent, path: string, index: number): void {
    if (fgItemDrag.path !== path) return
    event.preventDefault()
    event.stopPropagation()
    const from = fgItemDrag.from
    fgDragEnd()
    fgMoveItemTo(path, from, index)
  }

  function fgDragMark(path: string, index: number): '' | undefined {
    return fgItemDrag.path === path && fgItemDrag.from === index ? '' : undefined
  }

  function fgDropMark(path: string, index: number): 'before' | 'after' | undefined {
    if (fgItemDrag.path !== path || fgItemDrag.at !== index || fgItemDrag.from === index) return undefined
    return index < fgItemDrag.from ? 'before' : 'after'
  }

  /** Moves item \`from\` to \`to\` (the others close up); the moved item gets focus. */
  function fgMoveItemTo(path: string, from: number, to: number): void {
    const list = fgList(form, path)
    if (from === to || to < 0 || to >= list.length) return
    const label = fgItemLabel(path, from)
    fgKeyAt(path, list.length - 1)
    const keys = fgKeys.current[path]!
    keys.splice(to, 0, keys.splice(from, 1)[0]!)
    fgRemapItems(path, (n) => fgMovedIndex(n, from, to))
    const next = [...list]
    next.splice(to, 0, next.splice(from, 1)[0]!)
    setField(path, next)
    fgPendingFocus.current = { path, index: to, move: 'item' }
    fgAnnounce(${JSON.stringify(messages.itemMoved)}.split('{label}').join(label).split('{n}').join(String(to + 1)))
  }`
}

/**
 * Plain HTML: listeners are added per item (fgWireItemDrag from
 * fgAddItem); paths and indexes are read when used, as items move.
 */
export function htmlItemDrag(messages: MessageCatalog): string {
  return `// Dragging items by their handle: the list being dragged in, the item and the one under it.
var fgItemDrag = null
${movedIndexJs(false)}
function fgDragMarks() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-fg-item]'), function (el) {
    var path = el.parentNode.getAttribute('data-fg-items')
    var index = Number(el.getAttribute('data-fg-index'))
    var dragging = fgItemDrag && fgItemDrag.path === path
    el.toggleAttribute('data-fg-drag', Boolean(dragging && fgItemDrag.from === index))
    if (dragging && fgItemDrag.at === index && fgItemDrag.from !== index) el.setAttribute('data-fg-drop', index < fgItemDrag.from ? 'before' : 'after')
    else el.removeAttribute('data-fg-drop')
  })
}
function fgWireItemDrag(item, listPath) {
  var index = function () { return Number(item.getAttribute('data-fg-index')) }
  var handle = item.querySelector(':scope > div > [data-fg-handle]')
  if (handle) {
    handle.addEventListener('dragstart', function (event) {
      fgItemDrag = { path: listPath(), from: index(), at: -1 }
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', fgItemLabel(listPath(), index()))
      event.dataTransfer.setDragImage(item, 16, 16)
      fgDragMarks()
    })
    handle.addEventListener('dragend', function () {
      fgItemDrag = null
      fgDragMarks()
    })
  }
  item.addEventListener('dragover', function (event) {
    if (!fgItemDrag || fgItemDrag.path !== listPath()) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    if (fgItemDrag.at !== index()) {
      fgItemDrag.at = index()
      fgDragMarks()
    }
  })
  item.addEventListener('drop', function (event) {
    if (!fgItemDrag || fgItemDrag.path !== listPath()) return
    event.preventDefault()
    event.stopPropagation()
    var from = fgItemDrag.from
    fgItemDrag = null
    fgDragMarks()
    fgMoveItemTo(listPath(), from, index())
  })
}
/** Moves item \`from\` to \`to\` (the others close up); the moved item gets focus. */
function fgMoveItemTo(path, from, to) {
  var items = fgItemElements(path)
  if (from === to || to < 0 || to >= items.length) return
  var label = fgItemLabel(path, from)
  fgRemapItems(path, function (n) { return fgMovedIndex(n, from, to) })
  items[from].parentNode.insertBefore(items[from], to > from ? items[to].nextSibling : items[to])
  fgRefreshItems(path)
  updateConditions()
  fgItemElements(path)[to].focus()
  fgAnnounce(${JSON.stringify(messages.itemMoved)}.split('{label}').join(label).split('{n}').join(String(to + 1)))
}`
}

/**
 * Blazor: Razor can't take a drop only while an item is dragged (a
 * preventDefault flag without a handler never reaches the browser) nor set
 * drag data (Firefox won't start a drag without it), so a small script,
 * installed once through IJSRuntime on the form's root, runs the drag:
 * marks, accepted drops, then FgItemDropped(list, from, to) in .NET. Lists
 * are told apart by data-fg-list ids (FgListId), items by their position.
 */
export function blazorItemDrag(messages: MessageCatalog, csStr: (s: string) => string): string {
  const script = `window.fgItemDrag = window.fgItemDrag || function (root, dotnet) {
  var drag = null;
  function itemOf(el) { return el && el.closest ? el.closest('[data-fg-item]') : null; }
  function listOf(item) { return item.parentElement.getAttribute('data-fg-list'); }
  function indexOf(item) { return Array.prototype.indexOf.call(item.parentElement.querySelectorAll(':scope > [data-fg-item]'), item); }
  function target(el) {
    var item = itemOf(el);
    while (item && listOf(item) !== drag.list) item = itemOf(item.parentElement);
    return item;
  }
  function paint() {
    Array.prototype.forEach.call(root.querySelectorAll('[data-fg-item]'), function (el) {
      var mine = drag && listOf(el) === drag.list;
      var index = mine ? indexOf(el) : -1;
      el.toggleAttribute('data-fg-drag', Boolean(mine && index === drag.from));
      if (mine && index === drag.at && index !== drag.from) el.setAttribute('data-fg-drop', index < drag.from ? 'before' : 'after');
      else el.removeAttribute('data-fg-drop');
    });
  }
  root.addEventListener('dragstart', function (event) {
    var handle = event.target.closest && event.target.closest('[data-fg-handle]');
    if (!handle) return;
    var item = itemOf(handle);
    drag = { list: listOf(item), from: indexOf(item), at: -1 };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', '');
    event.dataTransfer.setDragImage(item, 16, 16);
    paint();
  });
  root.addEventListener('dragover', function (event) {
    if (!drag) return;
    var item = target(event.target);
    if (!item) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    var at = indexOf(item);
    if (at !== drag.at) { drag.at = at; paint(); }
  });
  root.addEventListener('drop', function (event) {
    if (!drag) return;
    var item = target(event.target);
    if (!item) return;
    event.preventDefault();
    var done = drag;
    drag = null;
    paint();
    dotnet.invokeMethodAsync('FgItemDropped', Number(done.list), done.from, indexOf(item));
  });
  root.addEventListener('dragend', function () {
    if (!drag) return;
    drag = null;
    paint();
  });
};`
  return `
    // Dragging items by their handle: a script on the form's root runs the
    // drag (Razor can't accept a drop only while dragging, nor set drag data)
    // and calls FgItemDropped; lists are known by id (data-fg-list).
    private readonly List<(object List, string Path)> fgLists = new();

    private int FgListId(object list, string path)
    {
        var index = fgLists.FindIndex(entry => ReferenceEquals(entry.List, list));
        if (index != -1) return index;
        fgLists.Add((list, path));
        return fgLists.Count - 1;
    }

    private const string FgItemDragScript = ${csString(script)};

    [Microsoft.JSInterop.JSInvokable]
    public async Task FgItemDropped(int list, int from, int to)
    {
        if (list < 0 || list >= fgLists.Count || fgLists[list].List is not System.Collections.IList items) return;
        if (from == to || from < 0 || to < 0 || from >= items.Count || to >= items.Count) return;
        var label = FgItemLabel(fgLists[list].Path, from);
        var moved = items[from]!;
        items.RemoveAt(from);
        items.Insert(to, moved);
        fgFocusItem = moved;
        await FgAnnounce(${csStr(messages.itemMoved)}.Replace("{label}", label).Replace("{n}", (to + 1).ToString()));
        StateHasChanged();
    }
`
}

/** A C# verbatim string literal. */
export const csString = (s: string): string => `@"${s.replace(/"/g, '""')}"`
