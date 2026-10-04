// Blazor export (.NET 8): a single .razor component with an EditForm, a
// FLAT generated model class (DataAnnotations where rules map 1:1,
// IValidatableObject for conditional fields and required checkboxes), C#
// visibility properties, and a payload builder that reconstructs the
// nested data shape (REBUILD_PROMPT §7 target 6).

import { getCoreElement, joinPath, resolveMessages, type ElementNode } from '@formsgen/renderer'
import { errorsTextFunctionCs, stepAnnouncements } from '../announce'
import { pascalMember } from '@/registry/emitters/shared'
import {
  csAttributes,
  csConditions,
  csFieldKind,
  csValidateStatements,
  type CsFieldKind,
} from '../csharp'
import { collectExportFields } from '../logic'
import { renderTree, stepButtonLabels, type RenderedSectionHost } from '../markup'
import {
  collectSectionHosts,
  fieldDefault,
  hasResetButton,
  pathKey,
  resolveSubmitButton,
} from '../structure'
import { scopeForBlazor } from '../css/blazorScope'
import { formRootClass, pinnedSchemeAttr } from '../css/themeBridge'
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
    const messages = resolveMessages(schema.meta.locale)
    const accessor = (path: string): string => `Model.${pascalMember(pathKey(path))}`

    // Submit button: configurable text/placement/style (meta.submitButton).
    // With exactly ONE gating wizard, the submit replaces Next on its last
    // step; otherwise the bottom button is shown/gated.
    const sb = resolveSubmitButton(schema, hosts)
    const embeddedHost = sb.gatingHosts.length === 1 ? sb.gatingHosts[0]! : null
    const submitButton = `<button class="${css.classes(sb.secondary ? 'buttonSecondary' : 'submitButton')}"${sb.buttonStyle ? ` style="${sb.buttonStyle}"` : ''} type="submit">${sb.text}</button>`

    const stepsHosts = hosts.filter((h) => h.kind === 'steps')
    const memberOf = (path: string): string => pascalMember(pathKey(path))

    // Tabs/steps: int state fields + @if-rendered panels. Steps gate Next
    // behind per-step validation (FgNext_* via an explicit EditContext).
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
      const labels = stepButtonLabels(host)
      const embeddedSubmit =
        embeddedHost?.key === host.key
          ? `\n    @if (${state} == ${last})\n    {\n        ${submitButton}\n    }`
          : ''
      return `<div>\n  <ol class="${css.classes('stepList')}">\n${items}\n  </ol>\n${panels}\n  <div class="${css.classes('stepActions')}">\n    @if (${state} > 0)\n    {\n        <button type="button" class="${css.classes('buttonSecondary')}" @onclick="() => FgGo_${host.key}(${state} - 1)">${labels.back}</button>\n    }\n    @if (${state} < ${last})\n    {\n        <button type="button" class="${css.classes('submitButton')}" @onclick="FgNext_${host.key}">${labels.next}</button>\n    }${embeddedSubmit}\n  </div>\n</div>`
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
              : kind === 'array'
                ? 'string[]'
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
        case 'array':
          return ' = Array.Empty<string>();'
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

    // --- generated @code helpers ------------------------------------------
    // EditContext machinery exists when any tabs/steps host needs per-step
    // gating or the invalid-submit jump; FgToggle/FgAddTag only when the
    // matching field types are present.
    const hasHosts = hosts.length > 0
    const tagsKeys = fields.filter((f) => f.node.type === 'tags').map((f) => f.key)
    const hasToggle = fields.some((f) => f.node.type === 'checkboxgroup')

    // The component validates fields itself (instead of DataAnnotationsValidator)
    // with the same .NET Validator calls, so it can hold a field's error back
    // while a pointer is pressed: an error appearing between pointerdown and
    // pointerup reflows the form and the release would miss its target.
    const valueArms = fields
      .map((f) => `            ${csStr(pascalMember(f.key))} => Model.${pascalMember(f.key)},`)
      .join('\n')
    const editContextBlock = `
    private EditContext fgEdit = default!;
    private ValidationMessageStore fgMessages = default!;
    private bool fgPressing;
    private readonly HashSet<string> fgDeferredFields = new();

    protected override void OnInitialized() => FgInitEdit();

    private void FgInitEdit()
    {
        fgEdit = new EditContext(Model);
        fgMessages = new ValidationMessageStore(fgEdit);
        fgEdit.OnValidationRequested += (_, _) => FgValidateAll();
        fgEdit.OnFieldChanged += (_, e) => FgFieldChanged(e.FieldIdentifier.FieldName);
    }

    private void FgPointerDown(PointerEventArgs _)
    {
        FgFlushDeferred();
        fgPressing = true;
    }

    private void FgPointerEnd(PointerEventArgs _)
    {
        fgPressing = false;
        FgFlushDeferred();
    }

    private void FgFieldChanged(string name)
    {
        if (fgPressing)
        {
            fgDeferredFields.Add(name);
            return;
        }
        FgValidateMembers(new[] { name });
    }

    private void FgFlushDeferred()
    {
        if (fgDeferredFields.Count == 0) return;
        var names = fgDeferredFields.ToArray();
        fgDeferredFields.Clear();
        FgValidateMembers(names);
    }

    private void FgValidateAll()
    {
        fgDeferredFields.Clear();
        fgMessages.Clear();
        FgValidateMembers(fgAllMembers);
    }

    private object? FgValue(string name) => name switch
    {
${valueArms}
        _ => null,
    };

    // Attribute rules per property, plus the model's Validate() results for
    // the same members (DataAnnotations alone skips Validate() while any
    // attribute rule fails, which hid errors such as a required checkbox).
    private bool FgValidateMembers(string[] members)
    {
        var ok = true;
        foreach (var name in members)
        {
            var field = new FieldIdentifier(Model, name);
            fgMessages.Clear(field);
            var results = new List<ValidationResult>();
            var context = new ValidationContext(Model) { MemberName = name };
            if (!Validator.TryValidateProperty(FgValue(name), context, results)) ok = false;
            foreach (var result in results) fgMessages.Add(field, result.ErrorMessage ?? "Invalid");
        }
        foreach (var result in ((IValidatableObject)Model).Validate(new ValidationContext(Model)))
        {
            foreach (var name in result.MemberNames)
            {
                if (Array.IndexOf(members, name) < 0) continue;
                fgMessages.Add(new FieldIdentifier(Model, name), result.ErrorMessage ?? "Invalid");
                ok = false;
            }
        }
        fgEdit.NotifyValidationStateChanged();
        return ok;
    }

    private async Task FgSubmit(EditContext context)
    {
        if (context.Validate())
        {
            await HandleValidSubmit();
            return;
        }
        await FgOnInvalidSubmit(context);
    }
`

    const nextBlocks = stepsHosts
      .map((host) => {
        const arms = host.sections
          .map((s) =>
            s.paths.length
              ? `            ${s.index} => new[] { ${s.paths
                  .map((p) => `nameof(${name}Model.${memberOf(p)})`)
                  .join(', ')} },`
              : `            ${s.index} => Array.Empty<string>(),`,
          )
          .join('\n')
        return `
    private static readonly string[] fgSecAnnounce_${host.key} =
    {
${stepAnnouncements(host, messages).map((text) => `        ${csStr(text)},`).join('\n')}
    };

    private async Task FgGo_${host.key}(int index)
    {
        fgSec_${host.key} = index;
        await FgAnnounce(fgSecAnnounce_${host.key}[index]);
    }

    private async Task FgNext_${host.key}()
    {
        var members = fgSec_${host.key} switch
        {
${arms}
            _ => Array.Empty<string>(),
        };
        if (FgValidateMembers(members) && fgSec_${host.key} < ${host.sections.length - 1}) await FgGo_${host.key}(fgSec_${host.key} + 1);
    }
`
      })
      .join('')

    const jumpBlock = hasHosts
      ? `
${hosts
  .map(
    (host) => `    private static readonly string[][] fgSecMembers_${host.key} =
    {
${host.sections
  .map((s) =>
    s.paths.length
      ? `        new[] { ${s.paths.map((p) => csStr(memberOf(p))).join(', ')} },`
      : '        Array.Empty<string>(),',
  )
  .join('\n')}
    };
`,
  )
  .join('\n')}
    private bool FgHasMessages(string[] members)
    {
        foreach (var name in members)
        {
            if (fgEdit.GetValidationMessages(new FieldIdentifier(Model, name)).Any()) return true;
        }
        return false;
    }

    private void FgJumpToError()
    {
${hosts
  .map(
    (host) => `        if (!FgHasMessages(fgSecMembers_${host.key}[fgSec_${host.key}]))
        {
            for (var i = 0; i < fgSecMembers_${host.key}.Length; i++)
            {
                if (FgHasMessages(fgSecMembers_${host.key}[i])) { fgSec_${host.key} = i; break; }
            }
        }`,
  )
  .join('\n')}
    }
`
      : ''

    const toggleBlock = hasToggle
      ? `
    private static void FgToggle(List<string> list, string value, ChangeEventArgs e)
    {
        var on = e.Value is bool b && b;
        if (on) { if (!list.Contains(value)) list.Add(value); }
        else { list.Remove(value); }
    }
`
      : ''

    const tagsBlock = tagsKeys.length
      ? `
    private readonly Dictionary<string, string> fgTagDrafts = new() { ${tagsKeys
        .map((k) => `[${csStr(k)}] = ""`)
        .join(', ')} };

    private void FgAddTag(List<string> list, string key)
    {
        var draft = (fgTagDrafts.TryGetValue(key, out var value) ? value : "").Trim();
        if (draft.Length > 0 && !list.Contains(draft)) list.Add(draft);
        fgTagDrafts[key] = "";
    }
`
      : ''

    // aria-live: clear, re-render, then set — so repeated text re-announces.
    const announceBlock = `
    private string fgAnnouncement = "";

    private async Task FgAnnounce(string message)
    {
        fgAnnouncement = "";
        StateHasChanged();
        await Task.Delay(50);
        fgAnnouncement = message;
        StateHasChanged();
    }

${errorsTextFunctionCs(messages, csStr)}

    private static readonly string[] fgAllMembers =
    {
${fields.map((f) => `        ${csStr(pascalMember(f.key))},`).join('\n')}
    };

    private async Task FgOnInvalidSubmit(EditContext context)
    {${hasHosts ? '\n        FgJumpToError();' : ''}
        var count = fgAllMembers.Count(m => context.GetValidationMessages(new FieldIdentifier(Model, m)).Any());
        await FgAnnounce(FgErrorsText(count));
    }
`

    // Reset buttons: a fresh model (initializers hold the defaults) and a
    // fresh EditContext, so no stale messages or touched state remain.
    const resetBlock = hasResetButton(schema)
      ? `
    private async Task FgReset()
    {
        Model = new();
        FgInitEdit();
        fgDeferredFields.Clear();
        ResultJson = null;${tagsKeys.length ? '\n        foreach (var key in fgTagDrafts.Keys.ToList()) fgTagDrafts[key] = "";' : ''}
        await FgAnnounce(${csStr(messages.formReset)});
    }
`
      : ''

    const helperBlocks = `${editContextBlock}${announceBlock}${nextBlocks}${jumpBlock}${toggleBlock}${tagsBlock}${resetBlock}`

    const formBinding = 'EditContext="fgEdit" OnSubmit="FgSubmit"'
    const extraUsings = '@using System.Linq\n@using Microsoft.AspNetCore.Components.Forms\n'

    const submitUrl = schema.meta.submit?.url
    const httpInject = submitUrl ? '@inject HttpClient Http\n' : ''
    const submitCall = submitUrl
      ? `        await Http.${schema.meta.submit?.method === 'PUT' ? 'PutAsJsonAsync' : 'PostAsJsonAsync'}(${csStr(submitUrl)}, payload);\n`
      : ''

    // Bottom actions row: omitted when the wizard embeds the submit.
    const actionsBlock = embeddedHost
      ? ''
      : `\n    <div class="${css.classes('actions')}"${sb.actionsStyle ? ` style="${sb.actionsStyle}"` : ''}>
        ${
          sb.gatingHosts.length
            ? `@if (${sb.gatingHosts.map((h) => `fgSec_${h.key} == ${h.sections.length - 1}`).join(' && ')})
        {
            ${submitButton}
        }`
            : submitButton
        }
    </div>`

    const razor = `@* Generated by FormsGen (.NET 8). *@
@using System.ComponentModel.DataAnnotations
@using System.Text.Json
${extraUsings}${submitUrl ? '@using System.Net.Http.Json\n' : ''}${httpInject}
<EditForm ${formBinding} novalidate dir="${schema.meta.dir}">
    <div class="${formRootClass(css.classes('form'), schema.meta.theme)}"${pinnedSchemeAttr(schema.meta.theme)} @onpointerdown="FgPointerDown" @onpointerup="FgPointerEnd" @onpointerleave="FgPointerEnd" @onpointercancel="FgPointerEnd">
    <div class="${css.classes('grid')}">
${indentBlock(markup, 2)}
    </div>
    <div class="${css.classes('srOnly')}" role="status" aria-live="polite" aria-atomic="true">@fgAnnouncement</div>${actionsBlock}
    @if (ResultJson is not null)
    {
        <pre class="${css.classes('payload')}">@ResultJson</pre>
    }
    </div>
</EditForm>

@code {
    private ${name}Model Model { get; set; } = new();
    private string? ResultJson { get; set; }
${sectionFields ? `\n${sectionFields}\n` : ''}${helperBlocks}
    private async Task HandleValidSubmit()
    {
        var payload = BuildPayload();
        ResultJson = JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = true });
${submitCall}        await FgAnnounce(${csStr(messages.submitted)});
    }

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
      files.push({ path: `${name}.razor.css`, language: 'css', content: scopeForBlazor(stylesheet) })
    }
    return files
  },
  readme: (ctx) => {
    const name = componentName(ctx.schema)
    return `# ${name} (Blazor, .NET 8)

A single Razor component: an \`EditForm\` validated with .NET DataAnnotations, a
generated model class (attributes where a rule maps 1:1, plus
\`IValidatableObject\` for conditional fields and required checkboxes),
and a payload builder that excludes hidden fields and nests named groups.
Steps wizards validate the current step before Next advances, and a failed
submit jumps to the first tab/step holding an error. Tags fields add the
typed text when the input commits (blur or Enter — note Enter inside an
\`EditForm\` can also trigger submit, which is standard Blazor behavior).

## Install

1. Create or open a Blazor app (\`dotnet new blazor\`); works in both
   Server and WebAssembly render modes.
2. Copy \`${name}.razor\`${ctx.css.stylesheet?.(ctx.schema.meta.theme) ? ` and \`${name}.razor.css\` (scoped styles, picked up automatically by the build)` : ''} into your \`Components\`/\`Pages\` folder.
3. Use it: \`<${name} />\`${ctx.schema.meta.submit?.url ? `\n4. The component POSTs to \`${ctx.schema.meta.submit.url}\` on valid submit — register \`HttpClient\` in DI (WASM templates do by default).` : ''}

${ctx.css.id === 'bootstrap5' ? 'Bootstrap 5 classes are used — the default Blazor templates already ship Bootstrap, so it works out of the box.' : ctx.css.readmeNote()}
`
  },
}
