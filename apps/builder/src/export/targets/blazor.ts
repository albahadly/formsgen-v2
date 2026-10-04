// Blazor export (.NET 8): a single .razor component with an EditForm, a
// FLAT generated model class (DataAnnotations where rules map 1:1,
// IValidatableObject for conditional fields and required checkboxes), C#
// visibility properties, and a payload builder that reconstructs the
// nested data shape (REBUILD_PROMPT §7 target 6).

import { getCoreElement, joinPath, type ElementNode } from '@formsgen/renderer'
import { pascalMember } from '@/registry/emitters/shared'
import {
  csAttributes,
  csConditions,
  csFieldKind,
  csValidateStatements,
  type CsFieldKind,
} from '../csharp'
import { collectExportFields } from '../logic'
import { renderTree, type RenderedSectionHost } from '../markup'
import { collectSectionHosts, fieldDefault, pathKey } from '../structure'
import { componentName, type ExportTarget } from './types'

function indentBlock(text: string, depth: number): string {
  const pad = '    '.repeat(depth)
  return text
    .split('\n')
    .map((line) => (line === '' ? line : pad + line))
    .join('\n')
}

const csStr = (s: string): string => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

export const blazorTarget: ExportTarget = {
  id: 'blazor',
  label: 'Blazor (.razor)',
  description: 'A .NET 8 Razor component: EditForm + DataAnnotations + IValidatableObject.',
  frameworkAware: true,
  generate: ({ schema, css }) => {
    const name = componentName(schema)
    const fields = collectExportFields(schema)
    const hosts = collectSectionHosts(schema)
    const accessor = (path: string): string => `Model.${pascalMember(pathKey(path))}`

    // Tabs/steps: int state fields + @if-rendered panels. Per-step
    // validation is NOT gated here — EditForm validates on final submit
    // (DataAnnotations is submit-scoped; see the generated README).
    const renderSections = (host: RenderedSectionHost): string => {
      const state = `fgSec_${host.key}`
      const panels = host.sections
        .map(
          (s) => `@if (${state} == ${s.index})\n{\n${indentBlock(s.html, 1)}\n}`,
        )
        .join('\n')
      if (host.kind === 'tabs') {
        const buttons = host.sections
          .map(
            (s) =>
              `    <button type="button" class="@(${state} == ${s.index} ? "${css.classes('tabButtonActive')}" : "${css.classes('tabButton')}")" @onclick="() => ${state} = ${s.index}">${s.label}</button>`,
          )
          .join('\n')
        return `<div>\n  <div class="${css.classes('tabList')}" role="tablist">\n${buttons}\n  </div>\n${panels}\n</div>`
      }
      const items = host.sections
        .map(
          (s) =>
            `    <li class="@(${state} == ${s.index} ? "${css.classes('stepItemActive')}" : "${css.classes('stepItem')}")">${s.index + 1}. ${s.label}</li>`,
        )
        .join('\n')
      const last = host.sections.length - 1
      return `<div>\n  <ol class="${css.classes('stepList')}">\n${items}\n  </ol>\n${panels}\n  <div class="${css.classes('stepActions')}">\n    @if (${state} > 0)\n    {\n        <button type="button" class="${css.classes('buttonSecondary')}" @onclick="() => ${state}--">Back</button>\n    }\n    @if (${state} < ${last})\n    {\n        <button type="button" class="${css.classes('submitButton')}" @onclick="() => ${state}++">Next</button>\n    }\n  </div>\n</div>`
    }

    const sectionFields = hosts
      .map((host) => `    private int fgSec_${host.key} = 0;`)
      .join('\n')

    const markup = renderTree(schema, {
      lang: 'blazor',
      css,
      accessor,
      conditionAttr: () => '',
      // Conditions in markup are C#, not JS.
      conditionExpr: (groups) => csConditions(groups, (key) => `Model.${pascalMember(key)}`),
      wrapConditional: (expr, block) => `@if (${expr})\n{\n${indentBlock(block, 1)}\n}`,
      renderSections,
    })

    // Model properties (flat: one per field, PascalCase of the data path).
    const csType = (kind: CsFieldKind): string =>
      kind === 'bool'
        ? 'bool'
        : kind === 'number'
          ? 'double?'
          : kind === 'numberValue'
            ? 'double'
            : kind === 'list'
              ? 'List<string>'
              : 'string'
    const csInit = (kind: CsFieldKind, def: unknown, node: ElementNode): string => {
      switch (kind) {
        case 'bool':
          return def === true ? ' = true;' : ''
        case 'number':
          return typeof def === 'number' ? ` = ${def};` : ''
        case 'numberValue':
          return ` = ${Number(def ?? node.props['min'] ?? 0)};`
        case 'list':
          return ' = new();'
        default:
          return ` = ${typeof def === 'string' ? csStr(def) : '""'};`
      }
    }
    const properties = fields
      .map((field) => {
        const kind = csFieldKind(field.node.type)
        const member = pascalMember(field.key)
        const attrs = csAttributes(field, kind)
        const attrLines = (attrs ?? []).map((a) => `        ${a}`).join('\n')
        const init = csInit(kind, fieldDefault(field.node), field.node)
        return `${attrLines ? `${attrLines}\n` : ''}        public ${csType(kind)} ${member} { get; set; }${init}`
      })
      .join('\n\n')

    // Validate() handles what attributes can't.
    const validateStatements = fields
      .flatMap((field) => {
        const kind = csFieldKind(field.node.type)
        const needsValidate =
          (field.node.validation?.length ?? 0) > 0 &&
          (field.conditionChain.length > 0 || csAttributes(field, kind) === null)
        return needsValidate ? csValidateStatements(field, kind) : []
      })
      .join('\n')

    // Payload builder reconstructing the nested shape, hidden excluded.
    const payloadStatements: string[] = []
    let dictCounter = 0
    const buildPayload = (nodes: ElementNode[], parentPath: string, dict: string): void => {
      for (const node of nodes) {
        const core = getCoreElement(node.type)
        if (!core) continue
        const ownCond = node.conditions?.length
          ? csConditions(node.conditions, (key) => `Model.${pascalMember(key)}`)
          : null
        if (core.isContainer) {
          const childPath = node.name ? joinPath(parentPath, node.name) : parentPath
          if (node.name) {
            const sub = `dict${dictCounter++}`
            payloadStatements.push(`        var ${sub} = new Dictionary<string, object?>();`)
            buildPayload(node.children ?? [], childPath, sub)
            payloadStatements.push(
              ownCond
                ? `        if (${ownCond}) ${dict}[${csStr(node.name)}] = ${sub};`
                : `        ${dict}[${csStr(node.name)}] = ${sub};`,
            )
          } else if (ownCond) {
            payloadStatements.push(`        if (${ownCond})\n        {`)
            buildPayload(node.children ?? [], childPath, dict)
            payloadStatements.push('        }')
          } else {
            buildPayload(node.children ?? [], childPath, dict)
          }
        } else if (core.hasValue && node.name) {
          const path = joinPath(parentPath, node.name)
          const field = fields.find((f) => f.path === path)
          const member = `Model.${pascalMember(pathKey(path))}`
          const value =
            node.type === 'select' || node.type === 'radiogroup'
              ? `string.IsNullOrEmpty(${member}) ? null : ${member}`
              : member
          const assign = `${dict}[${csStr(node.name)}] = ${value};`
          if (field && field.conditionChain.length > 0) {
            const visible = field.conditionChain
              .map((g) => `(${csConditions(g, (key) => `Model.${pascalMember(key)}`)})`)
              .join(' && ')
            payloadStatements.push(`        if (${visible}) ${assign}`)
          } else {
            payloadStatements.push(`        ${assign}`)
          }
        }
      }
    }
    buildPayload(schema.tree, '', 'payload')

    const submitUrl = schema.meta.submit?.url
    const httpInject = submitUrl ? '@inject HttpClient Http\n' : ''
    const submitCall = submitUrl
      ? `        await Http.${schema.meta.submit?.method === 'PUT' ? 'PutAsJsonAsync' : 'PostAsJsonAsync'}(${csStr(submitUrl)}, payload);\n`
      : ''

    const razor = `@* Generated by FormsGen (.NET 8). *@
@using System.ComponentModel.DataAnnotations
@using System.Text.Json
${submitUrl ? '@using System.Net.Http.Json\n' : ''}${httpInject}
<EditForm Model="Model" OnValidSubmit="HandleValidSubmit" class="${css.classes('form')}" dir="${schema.meta.dir}">
    <DataAnnotationsValidator />
    <div class="${css.classes('grid')}">
${indentBlock(markup, 2)}
    </div>
    <div class="${css.classes('actions')}">
        <button class="${css.classes('submitButton')}" type="submit">Submit</button>
    </div>
    @if (ResultJson is not null)
    {
        <pre class="${css.classes('payload')}">@ResultJson</pre>
    }
</EditForm>

@code {
    private ${name}Model Model { get; set; } = new();
    private string? ResultJson { get; set; }
${sectionFields ? `\n${sectionFields}\n` : ''}
    private ${submitUrl ? 'async Task' : 'void'} HandleValidSubmit()
    {
        var payload = BuildPayload();
        ResultJson = JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = true });
${submitCall}    }

    private Dictionary<string, object?> BuildPayload()
    {
        var payload = new Dictionary<string, object?>();
${payloadStatements.join('\n')}
        return payload;
    }

    public class ${name}Model : IValidatableObject
    {
${properties}

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
${validateStatements || '            yield break;'}
        }
    }
}
`

    const stylesheet = css.stylesheet?.(schema.meta.theme)
    const files: { path: string; language: 'xml' | 'css'; content: string }[] = [
      { path: `${name}.razor`, language: 'xml', content: razor },
    ]
    if (stylesheet) {
      files.push({ path: `${name}.razor.css`, language: 'css', content: stylesheet })
    }
    return files
  },
  readme: (ctx) => {
    const name = componentName(ctx.schema)
    return `# ${name} (Blazor, .NET 8)

A single Razor component: \`EditForm\` + \`DataAnnotationsValidator\`, a
generated model class (attributes where a rule maps 1:1, plus
\`IValidatableObject\` for conditional fields and required checkboxes),
and a payload builder that excludes hidden fields and nests named groups.

## Install

1. Create or open a Blazor app (\`dotnet new blazor\`); works in both
   Server and WebAssembly render modes.
2. Copy \`${name}.razor\`${ctx.css.stylesheet ? ` and \`${name}.razor.css\` (scoped styles, picked up automatically by the build)` : ''} into your \`Components\`/\`Pages\` folder.
3. Use it: \`<${name} />\`${ctx.schema.meta.submit?.url ? `\n4. The component POSTs to \`${ctx.schema.meta.submit.url}\` on valid submit — register \`HttpClient\` in DI (WASM templates do by default).` : ''}

${ctx.css.id === 'bootstrap5' ? 'Bootstrap 5 classes are used — the default Blazor templates already ship Bootstrap, so it works out of the box.' : ctx.css.readmeNote()}
`
  },
}
