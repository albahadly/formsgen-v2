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
// fgSignSync(root, isEmpty) clears pads whose value went empty (a reset).

import { SIGNATURE_FILE, SIGNATURE_FONT, SIGNATURE_INK, type ElementNode } from '@formsgen/renderer'

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
  const any = ts ? ': any' : ''
  return `// Signature pads: draw (mouse, finger, pen) or type a name; each change is
// signature.png. Wired once on the form root (pads in new items included).
function fgSignPad(canvas${any})${any} {
  if (canvas.fgPad) return canvas.fgPad
  var ctx = canvas.getContext('2d')
  var pad${any} = { ink: false, pending: 0, drawing: false, last: null }
  pad.size = function () {
    var ratio = window.devicePixelRatio || 1
    var width = Math.round(canvas.clientWidth * ratio)
    var height = Math.round(canvas.clientHeight * ratio)
    if (!ctx || width === 0 || (canvas.width === width && canvas.height === height)) return
    canvas.width = width
    canvas.height = height
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
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
  canvas.fgPad = pad
  return pad
}
function fgSignGroup(el${any})${any} {
  var group = el.closest('[data-fg-sign]')
  return group ? { canvas: group.querySelector('canvas[data-fg-signature]'), typed: group.querySelector('[data-fg-sign-type]') } : null
}
function fgWireSignatures(root${any}, onChange${t(': (canvas: HTMLCanvasElement, file: File | null) => void')}) {
  if (!root || root.fgSignWired) return
  root.fgSignWired = true
  root.addEventListener('pointerdown', function (event${any}) {
    var canvas = event.target.closest && event.target.closest('canvas[data-fg-signature]')
    if (!canvas || event.button !== 0) return
    var pad = fgSignPad(canvas)
    pad.size()
    if (!canvas.getContext('2d')) return
    event.preventDefault()
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId)
    pad.drawing = true
    pad.pen()
    pad.last = pad.point(event)
    var ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.arc(pad.last.x, pad.last.y, 1.25, 0, Math.PI * 2)
    ctx.fill()
    pad.ink = true
  })
  root.addEventListener('pointermove', function (event${any}) {
    var canvas = event.target.closest && event.target.closest('canvas[data-fg-signature]')
    var pad = canvas && canvas.fgPad
    if (!pad || !pad.drawing) return
    var next = pad.point(event)
    var ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(pad.last.x, pad.last.y)
    ctx.lineTo(next.x, next.y)
    ctx.stroke()
    pad.last = next
  })
  function up(event${any}) {
    var canvas = event.target.closest && event.target.closest('canvas[data-fg-signature]')
    var pad = canvas && canvas.fgPad
    if (!pad || !pad.drawing) return
    pad.drawing = false
    pad.last = null
    pad.commit(function (file${any}) { onChange(canvas, file) })
  }
  root.addEventListener('pointerup', up)
  root.addEventListener('pointercancel', up)
  root.addEventListener('input', function (event${any}) {
    if (!event.target.matches || !event.target.matches('[data-fg-sign-type]')) return
    var group = fgSignGroup(event.target)
    if (!group || !group.canvas) return
    fgSignPad(group.canvas).type(event.target.value, function (file${any}) { onChange(group.canvas, file) })
  })
  root.addEventListener('click', function (event${any}) {
    var button = event.target.closest && event.target.closest('[data-fg-sign-clear]')
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
// Pads whose value went empty elsewhere (a reset) are cleared, typed name too.
function fgSignSync(root${any}, isEmpty${t(': (canvas: HTMLCanvasElement) => boolean')}) {
  if (!root) return
  Array.prototype.forEach.call(root.querySelectorAll('canvas[data-fg-signature]'), function (canvas${any}) {
    var pad = canvas.fgPad
    if (!isEmpty(canvas) || (pad && (pad.pending || pad.drawing))) return
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
  void nextTick(() => fgSignSync(fgRoot.value, (canvas) => ((fgGet(canvas.getAttribute('data-fg-signature')!) as File[] | undefined) ?? []).length === 0))
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
  // A reset empties the value: the pad follows.
  useEffect(() => {
    fgSignSync(fgRoot.current, (canvas) => (fgFileList(form, canvas.getAttribute('data-fg-signature')!) ?? []).length === 0)
  })`
}

/**
 * Blazor: the pad script (installed through IJSRuntime with the other
 * interop scripts) reports each change to FgSigned(key, data URL | null);
 * pads find their file list through FgSignKey, registered while rendering.
 */
export function blazorSignature(): { script: string; members: string } {
  const script = `${signatureRuntime(false)}
window.fgSignatures = function (root, dotnet) {
  fgWireSignatures(root, function (canvas, file) {
    var key = canvas.getAttribute('data-fg-signature')
    if (!file) { dotnet.invokeMethodAsync('FgSigned', key, null); return }
    var reader = new FileReader()
    reader.onload = function () { dotnet.invokeMethodAsync('FgSigned', key, reader.result) }
    reader.readAsDataURL(file)
  })
}
window.fgSignClear = function (root) { fgSignSync(root, function () { return true }) }`
  return {
    script,
    members: `
    // Signature pads: run by a script on the form's root (FgSignatureScript),
    // which reports each change here as a PNG data URL (null when cleared).
    private readonly Dictionary<string, List<FgUpload>> fgSignLists = new();

    private string FgSignKey(List<FgUpload> list, string key)
    {
        fgSignLists[key] = list;
        return key;
    }

    private const string FgSignatureScript = ${csVerbatim(script)};

    [Microsoft.JSInterop.JSInvokable]
    public void FgSigned(string key, string? dataUrl)
    {
        if (!fgSignLists.TryGetValue(key, out var list)) return;
        list.Clear();
        if (dataUrl is not null && dataUrl.Contains(','))
        {
            var bytes = Convert.FromBase64String(dataUrl[(dataUrl.IndexOf(',') + 1)..]);
            list.Add(new FgUpload("signature.png", bytes.Length, "image/png", bytes, dataUrl));
        }
        fgEdit.NotifyFieldChanged(FgField(key));
        StateHasChanged();
    }
`,
  }
}

const csVerbatim = (s: string): string => `@"${s.replace(/"/g, '""')}"`
