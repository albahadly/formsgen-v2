// README text shared by the code targets: the outside services an exported
// form uses at run time (none unless the form has a map, a spam check or an
// embedded page), with what a deployer must allow and verify.

import { LEAFLET_VERSION, OSM_TILES, captchaSiteKey, locationSettings, type ElementNode, type FormSchema } from '@formsgen/renderer'
import { hasLocation } from './location'

const nodesOf = (nodes: ElementNode[]): ElementNode[] => nodes.flatMap((node) => [node, ...nodesOf(node.children ?? [])])

/** The https hosts of iframes in the form's HTML blocks. */
function iframeHosts(schema: FormSchema): string[] {
  const hosts = new Set<string>()
  for (const node of nodesOf(schema.tree)) {
    if (node.type !== 'html' || typeof node.props['html'] !== 'string') continue
    for (const match of node.props['html'].matchAll(/<iframe\b[^>]*\bsrc\s*=\s*["']?(https:\/\/[^"'\s>]+)/gi)) {
      try {
        hosts.add(new URL(match[1]!).host)
      } catch {
        // not a URL: the sanitizer drops it anyway
      }
    }
  }
  return [...hosts]
}

/** The tile servers the form's maps use (OpenStreetMap's unless the author set another). */
function tileHosts(schema: FormSchema): string[] {
  const hosts = new Set<string>()
  for (const node of nodesOf(schema.tree)) {
    if (node.type !== 'location') continue
    try {
      hosts.add(new URL(locationSettings(node).tiles.replace(/\{[sxyz]\}/g, '0')).host)
    } catch {
      hosts.add(new URL(OSM_TILES.replace(/\{[sxyz]\}/g, '0')).host)
    }
  }
  return [...hosts]
}

/**
 * The "Services this form uses" README section, or '' for a form that uses
 * none. `target` picks the wording of the spam-check server step.
 */
export function servicesReadme(schema: FormSchema, target: 'html' | 'react' | 'vue' | 'blazor' | 'vue-lib'): string {
  const maps = hasLocation(schema.tree)
  const captcha = captchaSiteKey(schema.meta)
  const frames = iframeHosts(schema)
  if (!maps && !captcha && frames.length === 0) return ''
  const parts: string[] = ['## Services this form uses', '']
  const tiles = tileHosts(schema)
  if (maps) {
    parts.push(
      `- **Map (location field).** Leaflet ${LEAFLET_VERSION} loads from \`cdnjs.cloudflare.com\` (script and stylesheet, pinned with integrity hashes) when the form shows a map; the map tiles come from ${tiles.map((h) => `\`${h}\``).join(', ')}.${tiles.includes('tile.openstreetmap.org') ? ' OpenStreetMap\'s tile servers are meant for light use and require the credit the map shows; a busy form should set its own tile server in the field\'s settings ("Tile server").' : ''}`,
    )
  }
  if (captcha) {
    const verify =
      target === 'blazor'
        ? 'The server that receives the submission must verify that token with your Turnstile **secret key** (POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify`) before accepting it; the sample server in the FormsGen repository does this when started with `TURNSTILE_SECRET`.'
        : 'The server that receives the submission must verify that token with your Turnstile **secret key** (POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify`) before accepting it; the sample server (`server/` in this ZIP when chosen, or the FormsGen repository) does this when started with `TURNSTILE_SECRET`.'
    parts.push(
      `- **Spam check (Cloudflare Turnstile).** The widget script loads from \`challenges.cloudflare.com\` (Cloudflare changes it in place, so it carries no integrity hash); the submit button stays disabled until the check passes, and each submission carries the token as \`cf-turnstile-response\`, once. ${verify} The site key in this form is \`${captcha}\`${captcha.startsWith('1x0000') || captcha.startsWith('2x0000') || captcha.startsWith('3x0000') ? ' (one of Cloudflare\'s test keys: replace it with your own before going live)' : ''}.`,
    )
  }
  if (frames.length > 0) {
    parts.push(`- **Embedded pages.** The HTML block embeds ${frames.map((h) => `\`${h}\``).join(', ')} in sandboxed iframes (scripts allowed, no forms, popups or top navigation).`)
  }
  const csp: string[] = []
  if (maps) csp.push('`script-src` and `style-src`: `cdnjs.cloudflare.com`', `\`img-src\`: ${tiles.map((h) => `\`${h}\``).join(', ')} and \`data:\``)
  if (captcha) csp.push('`script-src` and `frame-src`: `challenges.cloudflare.com`')
  if (frames.length > 0) csp.push(`\`frame-src\`: ${frames.map((h) => `\`${h}\``).join(', ')}`)
  if (schema.meta.submit?.url) csp.push(`\`connect-src\`: the submit URL's origin`)
  parts.push('', `With a Content-Security-Policy, allow: ${csp.join('; ')}.`)
  if (target === 'blazor') {
    parts.push(
      '',
      'Blazor notes: the interop scripts are installed with `eval` on the first render, so a `script-src` policy needs `\'unsafe-eval\'` (or move the `Fg*Script` constants into a static .js file); in Blazor Server, a rich-text answer longer than about 32 KB of HTML exceeds the default `MaximumReceiveMessageSize` of the SignalR hub (raise it with `AddInteractiveServerComponents().AddHubOptions(o => o.MaximumReceiveMessageSize = 512 * 1024)`). Signatures stream and are not affected.',
    )
  }
  return `${parts.join('\n')}\n`
}
