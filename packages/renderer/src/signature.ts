// Signature pad: strokes drawn with a mouse, finger or pen (pointer events)
// on a canvas, or a typed name drawn in a handwriting-style font (the
// keyboard way). Each change becomes a PNG file ("signature.png"), so a
// signature travels like a one-file upload: required, multipart, and not
// kept by save-and-continue-later. The pad is sized on first use (a canvas
// hidden in another step has no size yet) and drawn at the screen's pixel
// ratio but saved at CSS pixel size; ink is always dark on a light pad,
// in light and dark themes.
// The code exports carry the same logic as script (export/signature.ts).

export const SIGNATURE_FILE = 'signature.png'
export const SIGNATURE_INK = '#0f172a'
export const SIGNATURE_FONT = 'italic 2rem "Segoe Script", "Brush Script MT", "Snell Roundhand", cursive'

export interface SignaturePad {
  /** Draws a typed name in place of anything drawn ('' clears). */
  type(text: string): void
  /** Clears the pad (no change reported). */
  wipe(): void
  /** Called when the value went empty elsewhere (a reset): clears drawn ink. */
  sync(empty: boolean): void
  /** Draws a saved signature (a pad created again, e.g. on another step). */
  show(file: Blob): void
  destroy(): void
}

/** Wires a canvas; `onChange` receives the new PNG file, or null when cleared. */
export function createSignaturePad(canvas: HTMLCanvasElement, onChange: (file: File | null) => void): SignaturePad {
  // The context is asked for on first use, not while the form is built.
  let context: CanvasRenderingContext2D | null | undefined
  const draw = (): CanvasRenderingContext2D | null => (context === undefined ? (context = canvas.getContext('2d')) : context)
  let ink = false
  let pending = 0
  let drawing = false
  let last: { x: number; y: number } | null = null

  function size(): void {
    const ctx = draw()
    const ratio = window.devicePixelRatio || 1
    const width = Math.round(canvas.clientWidth * ratio)
    const height = Math.round(canvas.clientHeight * ratio)
    if (!ctx || width === 0 || (canvas.width === width && canvas.height === height)) return
    // Keep the ink through the resize (a phone turning, a panel opening).
    let kept: HTMLCanvasElement | null = null
    if (ink && canvas.width > 0 && canvas.height > 0) {
      kept = document.createElement('canvas')
      kept.width = canvas.width
      kept.height = canvas.height
      kept.getContext('2d')?.drawImage(canvas, 0, 0)
    }
    canvas.width = width
    canvas.height = height
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    if (kept) ctx.drawImage(kept, 0, 0, canvas.clientWidth, canvas.clientHeight)
  }
  function wipe(): void {
    const ctx = draw()
    if (!ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    ink = false
  }
  function commit(): void {
    const ticket = ++pending
    // Saved at CSS pixel size (small files whatever the screen density).
    const out = document.createElement('canvas')
    out.width = canvas.clientWidth || canvas.width
    out.height = canvas.clientHeight || canvas.height
    out.getContext('2d')?.drawImage(canvas, 0, 0, out.width, out.height)
    out.toBlob((blob) => {
      if (ticket !== pending) return
      pending = 0
      onChange(blob && ink ? new File([blob], SIGNATURE_FILE, { type: 'image/png' }) : null)
    }, 'image/png')
  }
  function point(event: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  function pen(): void {
    const ctx = draw()
    if (!ctx) return
    ctx.strokeStyle = SIGNATURE_INK
    ctx.fillStyle = SIGNATURE_INK
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  function down(event: PointerEvent): void {
    const ctx = draw()
    if (event.button !== 0 || !ctx) return
    size()
    event.preventDefault()
    canvas.setPointerCapture?.(event.pointerId)
    drawing = true
    pen()
    last = point(event)
    ctx.beginPath()
    ctx.arc(last.x, last.y, 1.25, 0, Math.PI * 2)
    ctx.fill()
    ink = true
  }
  function move(event: PointerEvent): void {
    const ctx = draw()
    if (!drawing || !ctx || !last) return
    const next = point(event)
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(next.x, next.y)
    ctx.stroke()
    last = next
  }
  function up(): void {
    if (!drawing) return
    drawing = false
    last = null
    commit()
  }
  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', up)

  return {
    type(text) {
      size()
      wipe()
      const ctx = draw()
      if (!ctx || text.trim() === '') {
        pending++
        onChange(null)
        return
      }
      pen()
      ctx.font = SIGNATURE_FONT
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text.trim(), canvas.clientWidth / 2, canvas.clientHeight / 2, canvas.clientWidth - 24)
      ink = true
      commit()
    },
    wipe() {
      pending++
      wipe()
    },
    sync(empty) {
      if (empty && ink && !pending && !drawing) wipe()
    },
    show(file) {
      size()
      const ctx = draw()
      if (!ctx || typeof createImageBitmap !== 'function') return
      void createImageBitmap(file).then((image) => {
        wipe()
        ctx.drawImage(image, 0, 0, canvas.clientWidth, canvas.clientHeight)
        ink = true
      }, () => undefined)
    },
    destroy() {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
    },
  }
}
