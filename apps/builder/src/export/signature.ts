// Signature pads in the code targets, as the renderer's signature.ts: draw
// (pointer events) or type a name; each change becomes signature.png, held
// like a one-file upload. The script is wired once on the form's root and
// finds pads by data attributes, so pads in items added later just work:
//   [data-fg-sign]            the pad's wrapper
//   canvas[data-fg-signature] the pad (its value is the field path, or the
//                             Blazor field key)
//   [data-fg-sign-type]       "Or type your name"
//   [data-fg-sign-clear]      Clear
// fgWireSignatures(root, onChange) reports (canvas, file | null);
// fgSignSync(root, valueOf) makes pads follow their value: a pad whose value
// went empty (a reset) is cleared, typed name too; a blank pad whose value
// holds a file (shown again by a step or a condition) draws it.

import { SIGNATURE_FILE, SIGNATURE_FONT, SIGNATURE_INK, type ElementNode } from '@albahadly/formsgen-renderer'

export const hasSignature = (nodes: ElementNode[]): boolean =>
  nodes.some((node) => node.type === 'signature' || hasSignature(node.children ?? []))

/** The pad height in pixels (props.height, 80–400, default 160). */
export function signatureHeight(node: ElementNode): number {
  const h = Number(node.props['height'])
  return Number.isFinite(h) && h >= 80 && h <= 400 ? h : 160
}

export const signatureTyping = (node: ElementNode): boolean => node.props['typing'] !== false

/** The pad runtime (ES5; `ts` adds the annotations strict TypeScript needs). */
export function signatureRuntime(ts: boolean): string {
  const t = (annotation: string): string => (ts ? annotation : '')
  return `// Signature pads: draw (mouse, finger, pen) or type a name; each change is
// signature.png. Wired once on the form root (pads in new items included).
${t(`interface FgSignPad {
  ink: boolean
  pending: number
  drawing: boolean
  loading: boolean
  last: { x: number; y: number } | null
  size(): void
  wipe(): void
  pen(): void
  commit(done: (file: File | null) => void): void
  point(event: PointerEvent): { x: number; y: number }
  type(text: string, done: (file: File | null) => void): void
  show(source: File | Blob | string): void
}
type FgSignCanvas = HTMLCanvasElement & { fgPad?: FgSignPad }
type FgSignRoot = HTMLElement & { fgSignWired?: boolean }
`)}function fgSignPad(canvas${t(': FgSignCanvas')})${t(': FgSignPad')} {
  if (canvas.fgPad) return canvas.fgPad
  var ctx = canvas.getContext('2d')
  var pad = { ink: false, pending: 0, drawing: false, loading: false, last: null${t(' as { x: number; y: number } | null')} }${t(' as FgSignPad')}
  pad.size = function () {
    var ratio = window.devicePixelRatio || 1
    var width = Math.round(canvas.clientWidth * ratio)
    var height = Math.round(canvas.clientHeight * ratio)
    if (!ctx || width === 0 || (canvas.width === width && canvas.height === height)) return
    // Keep the ink through the resize (a phone turning, a panel opening).
    var kept${t(': HTMLCanvasElement | null')} = null
    if (pad.ink && canvas.width > 0 && canvas.height > 0) {
      kept = document.createElement('canvas')
      kept.width = canvas.width
      kept.height = canvas.height
      var keptCtx = kept.getContext('2d')
      if (keptCtx) keptCtx.drawImage(canvas, 0, 0)
    }
    canvas.width = width
    canvas.height = height
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    if (kept) ctx.drawImage(kept, 0, 0, canvas.clientWidth, canvas.clientHeight)
  }
  pad.wipe = function () {
    if (!ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    pad.ink = false
  }
  pad.pen = function () {
    if (!ctx) return
    ctx.strokeStyle = ${JSON.stringify(SIGNATURE_INK)}
    ctx.fillStyle = ${JSON.stringify(SIGNATURE_INK)}
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }
  // Saved at CSS pixel size (small files whatever the screen density).
  pad.commit = function (done${t(': (file: File | null) => void')}) {
    var ticket = ++pad.pending
    var out = document.createElement('canvas')
    out.width = canvas.clientWidth || canvas.width
    out.height = canvas.clientHeight || canvas.height
    var outCtx = out.getContext('2d')
    if (outCtx) outCtx.drawImage(canvas, 0, 0, out.width, out.height)
    out.toBlob(function (blob) {
      if (ticket !== pad.pending) return
      pad.pending = 0
      done(blob && pad.ink ? new File([blob], ${JSON.stringify(SIGNATURE_FILE)}, { type: 'image/png' }) : null)
    }, 'image/png')
  }
  pad.point = function (event${t(': PointerEvent')}) {
    var rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  pad.type = function (text${t(': string')}, done${t(': (file: File | null) => void')}) {
    pad.size()
    pad.wipe()
    if (!ctx || text.trim() === '') {
      pad.pending++
      done(null)
      return
    }
    pad.pen()
    ctx.font = ${JSON.stringify(SIGNATURE_FONT)}
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text.trim(), canvas.clientWidth / 2, canvas.clientHeight / 2, canvas.clientWidth - 24)
    pad.ink = true
    pad.commit(done)
  }
  // Draws a saved signature (a file, or a data URL) into a blank pad.
  pad.show = function (source${t(': File | Blob | string')}) {
    if (pad.ink || pad.drawing || pad.loading) return
    pad.loading = true
    var url = typeof source === 'string' ? source : URL.createObjectURL(source)
    var image = new Image()
    image.onload = function () {
      pad.loading = false
      if (url !== source) URL.revokeObjectURL(url)
      if (pad.ink || pad.drawing || !ctx) return
      pad.size()
      ctx.drawImage(image, 0, 0, canvas.clientWidth, canvas.clientHeight)
      pad.ink = true
    }
    image.onerror = function () {
      pad.loading = false
      if (url !== source) URL.revokeObjectURL(url)
    }
    image.src = url
  }
  canvas.fgPad = pad
  return pad
}
function fgSignGroup(el${t(': Element')})${t(': { canvas: FgSignCanvas | null; typed: HTMLInputElement | null } | null')} {
  var group = el.closest('[data-fg-sign]')
  return group ? { canvas: group.querySelector${t('<FgSignCanvas>')}('canvas[data-fg-signature]'), typed: group.querySelector${t('<HTMLInputElement>')}('[data-fg-sign-type]') } : null
}
// A commit callback bound to its pad.
function fgSignDone(canvas${t(': HTMLCanvasElement')}, onChange${t(': (canvas: HTMLCanvasElement, file: File | null) => void')}) {
  return function (file${t(': File | null')}) { onChange(canvas, file) }
}
function fgWireSignatures(root${t(': FgSignRoot | null')}, onChange${t(': (canvas: HTMLCanvasElement, file: File | null) => void')}) {
  if (!root || root.fgSignWired) return
  root.fgSignWired = true
  var padOf = function (event${t(': Event')})${t(': FgSignCanvas | null')} {
    var target = event.target${t(' as Element | null')}
    return target && target.closest ? target.closest${t('<FgSignCanvas>')}('canvas[data-fg-signature]') : null
  }
  root.addEventListener('pointerdown', function (event${t(': PointerEvent')}) {
    var canvas = padOf(event)
    if (!canvas || event.button !== 0) return
    var pad = fgSignPad(canvas)
    pad.size()
    var ctx = canvas.getContext('2d')
    if (!ctx) return
    event.preventDefault()
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId)
    pad.drawing = true
    pad.pen()
    var at = pad.point(event)
    pad.last = at
    ctx.beginPath()
    ctx.arc(at.x, at.y, 1.25, 0, Math.PI * 2)
    ctx.fill()
    pad.ink = true
  })
  root.addEventListener('pointermove', function (event${t(': PointerEvent')}) {
    var canvas = padOf(event)
    var pad = canvas && canvas.fgPad
    if (!canvas || !pad || !pad.drawing) return
    var last = pad.last
    var ctx = canvas.getContext('2d')
    if (!last || !ctx) return
    var next = pad.point(event)
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(next.x, next.y)
    ctx.stroke()
    pad.last = next
  })
  function up(event${t(': PointerEvent')}) {
    var canvas = padOf(event)
    var pad = canvas && canvas.fgPad
    if (!canvas || !pad || !pad.drawing) return
    pad.drawing = false
    pad.last = null
    pad.commit(fgSignDone(canvas, onChange))
  }
  root.addEventListener('pointerup', up)
  root.addEventListener('pointercancel', up)
  root.addEventListener('input', function (event${t(': Event')}) {
    var input = event.target${t(' as HTMLInputElement | null')}
    if (!input || !input.matches || !input.matches('[data-fg-sign-type]')) return
    var group = fgSignGroup(input)
    var canvas = group && group.canvas
    if (!canvas) return
    fgSignPad(canvas).type(input.value, fgSignDone(canvas, onChange))
  })
  root.addEventListener('click', function (event${t(': MouseEvent')}) {
    var target = event.target${t(' as Element | null')}
    var button = target && target.closest && target.closest('[data-fg-sign-clear]')
    if (!button) return
    var group = fgSignGroup(button)
    if (!group || !group.canvas) return
    var pad = fgSignPad(group.canvas)
    pad.pending++
    pad.wipe()
    if (group.typed) group.typed.value = ''
    onChange(group.canvas, null)
  })
}
// Pads follow their value: cleared when it went empty elsewhere (a reset),
// typed name too; a blank pad draws the file its value holds (a pad shown
// again by a step or a condition).
function fgSignSync(root${t(': HTMLElement | null')}, valueOf${t(': (canvas: HTMLCanvasElement) => File | Blob | string | null | undefined')}) {
  if (!root) return
  Array.prototype.forEach.call(root.querySelectorAll${t('<FgSignCanvas>')}('canvas[data-fg-signature]'), function (canvas${t(': FgSignCanvas')}) {
    var pad = canvas.fgPad
    if (pad && (pad.pending || pad.drawing)) return
    var value = valueOf(canvas)
    if (value) {
      if (!pad || !pad.ink) fgSignPad(canvas).show(value)
      return
    }
    if (pad && pad.ink) pad.wipe()
    var group = fgSignGroup(canvas)
    if (group && group.typed && group.typed.value !== '') group.typed.value = ''
  })
}`
}

/** Vue (script setup): wire the pads on mount, follow resets. */
export function vueSignature(): string {
  return `${signatureRuntime(true)}
onMounted(() => {
  fgWireSignatures(fgRoot.value, (canvas, file) => {
    const path = canvas.getAttribute('data-fg-signature')!
    fgSetFiles(path, file ? [file] : [])
    touch(path)
  })
})
watch(form, () => {
  void nextTick(() => fgSignSync(fgRoot.value, (canvas) => ((fgGet(canvas.getAttribute('data-fg-signature')!) as File[] | undefined) ?? [])[0] ?? null))
}, { deep: true })`
}

/** React: module-level pad runtime. */
export const reactSignatureModule = (): string => signatureRuntime(true)

/** React: inside the component (the latest handler through a ref). */
export function reactSignatureHooks(): string {
  return `  // Signature pads: wired once on the form; changes go through the latest handler.
  const fgSignChange = useRef<(path: string, file: File | null) => void>(() => {})
  fgSignChange.current = (path, file) => {
    touched.current.add(path)
    setField(path, file ? [file] : [])
  }
  useEffect(() => {
    fgWireSignatures(fgRoot.current, (canvas, file) => fgSignChange.current(canvas.getAttribute('data-fg-signature')!, file))
  }, [])
  // The pads follow the value: a reset clears them, a pad shown again draws its file.
  useEffect(() => {
    fgSignSync(fgRoot.current, (canvas) => (fgFileList(form, canvas.getAttribute('data-fg-signature')!) ?? [])[0] ?? null)
  })`
}

/**
 * Blazor: the pad script (installed through IJSRuntime with the other
 * interop scripts) streams each drawn PNG to FgSigned(key, stream): a
 * stream is not bound by Blazor Server's 32 KB message limit, which an
 * ordinary signature exceeds. Pads find their file list through FgSignKey,
 * registered while rendering. After each render, fgSignSet(root, dotnet,
 * keys) clears pads whose value went empty and asks FgSignData for the PNG
 * of a blank pad whose value holds one (a pad shown again).
 */
export function blazorSignature(): { script: string; members: string } {
  const script = `${signatureRuntime(false)}
window.fgSignatures = function (root, dotnet) {
  fgWireSignatures(root, function (canvas, file) {
    var key = canvas.getAttribute('data-fg-signature')
    dotnet.invokeMethodAsync('FgSigned', key, file ? DotNet.createJSStreamReference(file) : null)
  })
}
window.fgSignSet = function (root, dotnet, keys) {
  fgSignSync(root, function (canvas) {
    var key = canvas.getAttribute('data-fg-signature')
    if (keys.indexOf(key) === -1) return null
    var pad = fgSignPad(canvas)
    if (!pad.ink && !pad.loading && !pad.drawing) {
      pad.loading = true
      dotnet.invokeMethodAsync('FgSignData', key).then(function (dataUrl) {
        pad.loading = false
        if (dataUrl) pad.show(dataUrl)
      }, function () { pad.loading = false })
    }
    // Holding a value: never cleared here (the drawing goes through pad.show).
    return 'kept'
  })
}
window.fgSignClear = function (root) { fgSignSync(root, function () { return null }) }`
  return {
    script,
    members: `
    // Signature pads: run by a script on the form's root (FgSignatureScript),
    // which reports each change here as a PNG data URL (null when cleared).
    private readonly Dictionary<string, List<FgUpload>> fgSignLists = new();
    // The render that last showed each pad; entries of elements no longer
    // rendered (removed items, fields hidden again) go after a render.
    private readonly Dictionary<string, int> fgSignSeen = new();

    private string FgSignKey(List<FgUpload> list, string key)
    {
        fgSignLists[key] = list;
        fgSignSeen[key] = fgRenderGen;
        return key;
    }

    private const string FgSignatureScript = ${csVerbatim(script)};

    [Microsoft.JSInterop.JSInvokable]
    public async Task FgSigned(string key, Microsoft.JSInterop.IJSStreamReference? stream)
    {
        if (!fgSignLists.TryGetValue(key, out var list)) return;
        byte[]? bytes = null;
        if (stream is not null)
        {
            await using (stream)
            {
                using var source = await stream.OpenReadStreamAsync(maxAllowedSize: 4L * 1024 * 1024);
                using var buffer = new System.IO.MemoryStream();
                await source.CopyToAsync(buffer);
                bytes = buffer.ToArray();
            }
        }
        list.Clear();
        if (bytes is not null) list.Add(new FgUpload("signature.png", bytes.Length, "image/png", bytes, "data:image/png;base64," + Convert.ToBase64String(bytes)));
        fgEdit.NotifyFieldChanged(FgField(key));
        StateHasChanged();
    }

    // The PNG of a signature the model holds, for a pad shown again.
    [Microsoft.JSInterop.JSInvokable]
    public string? FgSignData(string key) =>
        fgSignLists.TryGetValue(key, out var list) && list.Count > 0 ? list[0].Thumb : null;

    private async Task FgSignShowValues()
    {
        foreach (var key in fgSignLists.Keys.Where(key => !fgSignSeen.TryGetValue(key, out var seen) || seen != fgRenderGen).ToList()) { fgSignLists.Remove(key); fgSignSeen.Remove(key); }
        if (fgSelf is null) return;
        await FgJs.InvokeVoidAsync("fgSignSet", fgFormRoot, fgSelf, fgSignLists.Where(entry => entry.Value.Count > 0).Select(entry => entry.Key).ToArray());
    }
`,
  }
}

const csVerbatim = (s: string): string => `@"${s.replace(/"/g, '""')}"`
