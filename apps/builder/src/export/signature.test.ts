import { parseFormSchema, type ElementNode } from '@formsgen/renderer'
import { describe, expect, it } from 'vitest'
import { getCssAdapter, type CssFrameworkId } from './css'
import { formDataType } from './structure'
import { getTarget } from './targets'

const sign = (props: Record<string, unknown> = {}): ElementNode => ({
  id: 's',
  type: 'signature',
  name: 'sig',
  props: { label: 'Sign here', ...props },
  validation: [{ rule: 'required' }],
})
const schemaOf = (tree: ElementNode[]) => {
  const r = parseFormSchema({ $schema: 'formsgen/v2', meta: { name: 'sign', locale: 'en', dir: 'ltr', submit: { url: 'https://example.com/s' } }, tree })
  if (!r.ok) throw new Error(r.errors.join())
  return r.schema
}
const out = (target: string, tree: ElementNode[], css: CssFrameworkId = 'vanilla'): string =>
  getTarget(target)!.generate({ schema: schemaOf(tree), css: getCssAdapter(css) }).map((f) => f.content).join('\n')

describe('signature in the exports', () => {
  it('a pad, the typing box and Clear in every target', () => {
    for (const target of ['vue-standalone', 'react', 'html', 'blazor']) {
      const code = out(target, [sign()])
      expect(code, target).toMatch(/<canvas id="fg_sig" [^>]*role="img" aria-label="Signature pad: draw your signature here"/)
      expect(code, target).toContain('placeholder="Or type your name" aria-label="Or type your name" data-fg-sign-type')
      expect(code, target).toContain('data-fg-sign-clear>Clear</button>')
      expect(code, target).toContain('function fgWireSignatures(root')
    }
    expect(out('html', [sign()])).toContain('data-fg-signature="sig" data-fg-path="sig" data-fg-kind="signature"')
    expect(out('blazor', [sign()])).toContain(`data-fg-signature='@FgSignKey(Model.Sig, "Sig")'`)
    expect(out('vue-standalone', [sign({ typing: false, height: 220 })])).not.toContain('aria-label="Or type your name"')
    expect(out('react', [sign({ height: 220 })])).toContain(`style={{ height: '220px' }}`)
  })

  it('the value is a one-file list, posted as multipart', () => {
    expect(formDataType(schemaOf([sign()]))).toContain('sig: File[]')
    expect(out('vue-standalone', [sign()])).toContain('fgMultipart(data)')
    const razor = out('blazor', [sign()])
    expect(razor).toContain('public List<FgUpload> Sig { get; set; } = new();')
    // The PNG streams to .NET (not one SignalR message, which is capped at 32 KB).
    expect(razor).toContain('[Microsoft.JSInterop.JSInvokable]\n    public async Task FgSigned(string key, Microsoft.JSInterop.IJSStreamReference? stream)')
    expect(razor).toContain("dotnet.invokeMethodAsync('FgSigned', key, file ? DotNet.createJSStreamReference(file) : null)")
    // Entries of pads no longer rendered go after each render.
    expect(razor).toContain('fgSignSeen[key] = fgRenderGen')
    expect(razor).toContain('foreach (var key in fgSignLists.Keys.Where(key => !fgSignSeen.TryGetValue(key, out var seen) || seen != fgRenderGen).ToList()) { fgSignLists.Remove(key); fgSignSeen.Remove(key); }')
    expect(razor).toContain('await FgJs.InvokeVoidAsync("fgSignatures", fgFormRoot, fgSelf);')
    // A pad shown again (a step, a condition) draws the signature the model holds.
    expect(razor).toContain('public string? FgSignData(string key)')
    expect(razor).toContain('await FgSignShowValues();')
    for (const target of ['vue-standalone', 'react', 'html']) expect(out(target, [sign()]), target).toContain('pad.show = function (source')
  })

  it('Vue: no picking or thumbnail helpers without a file field', () => {
    const vue = out('vue-standalone', [sign()])
    expect(vue).not.toContain('fgThumbs')
    expect(vue).not.toContain('fgFileNotes')
    expect(vue).toContain('function fgSetFiles(')
  })

  it('React: no upload handlers without a file field; Bootstrap gets the pad rule', () => {
    expect(out('react', [sign()])).not.toContain('function fgPickFiles')
    expect(out('html', [sign()], 'bootstrap5')).toContain('.fg-signature-pad { border-style: dashed !important; touch-action: none; cursor: crosshair; }')
  })
})
