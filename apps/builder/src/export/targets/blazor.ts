// Blazor export (.NET 8): a single .razor component with an EditForm, a
// FLAT generated model class (DataAnnotations where rules map 1:1,
// IValidatableObject for conditional fields and required checkboxes), C#
// visibility properties, and a payload builder that reconstructs the
// nested data shape (REBUILD_PROMPT §7 target 6).

import {
  FILE_TYPES,
  getCoreElement,
  matrixRows,
  rangeSliderDefault,
  isRepeater,
  joinPath,
  resolveMessages,
  type ElementNode,
} from '@formsgen/renderer'
import { errorsTextFunctionCs, stepAnnouncements } from '../announce'
import { pascalMember } from '@/registry/emitters/shared'
import {
  csAttributes,
  csConditions,
  csFieldKind,
  csRuleChecks,
  csValidateStatements,
  type CsFieldKind,
} from '../csharp'
import { collectExportFields, collectExportRepeaters } from '../logic'
import {
  renderTree,
  stepButtonLabels,
  type RenderedRepeater,
  type RenderedSectionHost,
} from '../markup'
import { blazorItemMarkup, repeaterLegend } from '../repeaterMarkup'
import {
  collectSectionHosts,
  fieldDefault,
  hasResetButton,
  pathKey,
  resolveSubmitButton,
} from '../structure'
import { scopeForBlazor } from '../css/blazorScope'
import { dialCodes, exportStylesheet, hasDateRange, hasMatrix, hasRangeSlider, phoneCountryFields, phoneDefaults } from '../composite'
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
    const repeaters = collectExportRepeaters(schema)
    // Repeaters with item rules (FgItemError has a case only for these).
    const validatedRepeaters = repeaters.filter((r) => r.fields.some((f) => (f.node.validation?.length ?? 0) > 0))
    const hasRepeaters = repeaters.length > 0
    const itemClass = (r: (typeof repeaters)[number]): string => `Fg${pascalMember(r.key)}Item`
    const repeaterMember = (r: (typeof repeaters)[number]): string => pascalMember(r.key)
    /** Condition key (dots → underscores) to C#: the repeater's items read `item.X`. */
    const itemCsAccessor = (r: (typeof repeaters)[number]) => (key: string): string => {
      const child = r.fields.find((f) => key === `${r.key}_${f.name}`)
      return child ? `item.${pascalMember(child.name)}` : `Model.${pascalMember(key)}`
    }
    const repeaterVisible = (r: (typeof repeaters)[number]): string =>
      r.conditionChain.length
        ? r.conditionChain.map((g) => `(${csConditions(g, (key) => `Model.${pascalMember(key)}`)})`).join(' && ')
        : 'true'

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

    // Repeating sections: @foreach over the item list; fields bind to
    // `item`, ids embed the index; @ref lets add/remove move focus.
    const renderRepeater = (r: RenderedRepeater): string => {
      const repeater = repeaters.find((x) => x.path === r.path)!
      const list = `Model.${repeaterMember(repeater)}`
      const fieldsArg = `fgItemFields_${repeater.key}`
      const removeBtn = `<div class="${css.classes('repeaterItemActions')}">
                <button type="button" class="${css.classes('repeaterRemove')}" aria-label='@FgRemoveLabel("${r.path}", i)' @onclick='() => FgRemoveItem(${list}, "${r.path}", i, ${r.limits.min}, ${fieldsArg})'>${r.messages.removeItem}</button>
            </div>`
      const addBtn = `<button type="button" class="${css.classes('repeaterAdd')}" data-fg-add="${r.path}" @ref="fgAddRef_${repeater.key}" @onclick='() => FgAddItem(${list}, "${r.path}", ${Number.isFinite(r.limits.max) ? r.limits.max : 'int.MaxValue'})'>${r.addText}</button>`
      const item = blazorItemMarkup(
        r.itemHtml,
        repeater.key,
        repeater.fields.map((f) => f.name),
      )
      return `<fieldset class="${css.classes('group')}" data-fg-repeater="${r.path}">${repeaterLegend(css, r, 'class')}
  <div class="${css.classes('repeaterItems')}">
    @foreach (var (item, i) in ${list}.Select((x, n) => (x, n)).ToList())
    {
        <fieldset @key="item" class="${css.classes('repeaterItem')}" data-fg-item tabindex="-1" @ref="fgItemRefs[item]">
            <legend class="${css.classes('repeaterItemLabel')}">@FgItemLabel("${r.path}", i)</legend>
${indentBlock(item, 3)}
            ${r.limits.min > 0 ? `@if (${list}.Count > ${r.limits.min})
            {
                ${removeBtn}
            }` : removeBtn}
        </fieldset>
    }
  </div>
  ${Number.isFinite(r.limits.max) ? `@if (${list}.Count < ${r.limits.max})
  {
      ${addBtn}
  }` : addBtn}
</fieldset>`
    }

    const markup = renderTree(schema, {
      lang: 'blazor',
      css,
      accessor,
      conditionAttr: () => '',
      // Conditions in markup are C#, not JS.
      conditionExpr: (groups) => csConditions(groups, (key) => `Model.${pascalMember(key)}`),
      wrapConditional: (expr, block) => `@if (${expr})\n{\n${indentBlock(block, 1)}\n}`,
      renderSections,
      renderRepeater,
      itemOptions: (path) => {
        const repeater = repeaters.find((x) => x.path === path)!
        return { conditionExpr: (groups) => csConditions(groups, itemCsAccessor(repeater)) }
      },
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
              : kind === 'files'
                ? 'List<FgUpload>'
                : kind === 'range2'
                  ? 'FgRange'
                  : kind === 'daterange'
                    ? 'FgDateRange'
                    : kind === 'map'
                      ? 'Dictionary<string, string?>'
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
        case 'files':
        case 'daterange':
          return ' = new();'
        case 'map':
          return ` = new() { ${matrixRows(node).map((r) => `[${csStr(r.value)}] = null`).join(', ')} };`
        case 'range2': {
          const initial = rangeSliderDefault(node)
          return ` = new(${initial.from}, ${initial.to});`
        }
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

    const repeaterProperties = repeaters
      .map(
        (r) =>
          `        public List<${itemClass(r)}> ${repeaterMember(r)} { get; set; } = new() { ${Array.from({ length: r.limits.initial }, () => 'new(), ').join('')}};`,
      )
      .join('\n\n')
    const itemClasses = repeaters
      .map(
        (r) => `
    public class ${itemClass(r)}
    {
${r.fields
  .map((f) => {
    const kind = csFieldKind(f.node.type)
    return `        public ${csType(kind)} ${pascalMember(f.name)} { get; set; }${csInit(kind, fieldDefault(f.node), f.node)}`
  })
  .join('\n')}
    }
`,
      )
      .join('')

    // Validate() handles what attributes can't.
    const validateStatements = fields
      .flatMap((field) => {
        const kind = csFieldKind(field.node.type)
        const needsValidate =
          ((field.node.validation?.length ?? 0) > 0 || kind === 'files' || kind === 'daterange') &&
          (field.conditionChain.length > 0 || csAttributes(field, kind) === null)
        return needsValidate ? csValidateStatements(field, kind, messages) : []
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
        if (isRepeater(node)) {
          const repeater = repeaters.find((r) => r.path === (node.name ? joinPath(parentPath, node.name) : ''))
          if (!repeater) continue
          const list = `list${dictCounter}`
          const entry = `item${dictCounter++}`
          payloadStatements.push(`        var ${list} = new List<Dictionary<string, object?>>();`)
          payloadStatements.push(`        foreach (var item in Model.${repeaterMember(repeater)})\n        {`)
          payloadStatements.push(`            var ${entry} = new Dictionary<string, object?>();`)
          for (const f of repeater.fields) {
            const member = `item.${pascalMember(f.name)}`
            const value =
              f.node.type === 'select' || f.node.type === 'radiogroup' ? `string.IsNullOrEmpty(${member}) ? null : ${member}` : member
            const assign = `${entry}[${csStr(f.name)}] = ${value};`
            payloadStatements.push(
              f.node.conditions?.length
                ? `            if (${csConditions(f.node.conditions, itemCsAccessor(repeater))}) ${assign}`
                : `            ${assign}`,
            )
          }
          payloadStatements.push(`            ${list}.Add(${entry});\n        }`)
          payloadStatements.push(
            ownCond ? `        if (${ownCond}) ${dict}[${csStr(node.name!)}] = ${list};` : `        ${dict}[${csStr(node.name!)}] = ${list};`,
          )
          continue
        }
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
              : FILE_TYPES.has(node.type)
                ? `FgFilesPart(parts, ${csStr(path)}, ${member})`
                : node.type === 'rangeslider' || node.type === 'daterange'
                  ? `new Dictionary<string, object?> { ["from"] = ${member}.From, ["to"] = ${member}.To }`
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
        fgEdit.OnFieldChanged += (_, e) => FgFieldChanged(e.FieldIdentifier${hasRepeaters ? '' : '.FieldName'});
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
    {${hasRepeaters ? `
        if (fgDeferredItemFields.Count > 0)
        {
            var items = fgDeferredItemFields.ToArray();
            fgDeferredItemFields.Clear();
            foreach (var field in items) FgValidateItemField(field);
        }` : ''}
        if (fgDeferredFields.Count == 0) return;
        var names = fgDeferredFields.ToArray();
        fgDeferredFields.Clear();
        FgValidateMembers(names);
    }

    private void FgValidateAll()
    {
        fgDeferredFields.Clear();
        fgMessages.Clear();
        FgValidateMembers(fgAllMembers);${repeaters.map((r) => `\n        FgValidateRepeater_${r.key}();`).join('')}
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
            if (results.Count > 0) fgMessages.Add(field, results[0].ErrorMessage ?? "Invalid");
        }
        foreach (var result in ((IValidatableObject)Model).Validate(new ValidationContext(Model)))
        {
            foreach (var name in result.MemberNames)
            {
                if (Array.IndexOf(members, name) < 0) continue;
                ok = false;
                var field = new FieldIdentifier(Model, name);
                // One message per field (the first), as in the other targets.
                if (!fgMessages[field].Any()) fgMessages.Add(field, result.ErrorMessage ?? "Invalid");
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
        ${sectionRepeaterSwitch(host)
          ? `var ok = FgValidateMembers(members);
        ok &= ${sectionRepeaterSwitch(host, 'FgValidateRepeater')};
        if (ok && fgSec_${host.key} < ${host.sections.length - 1}) await FgGo_${host.key}(fgSec_${host.key} + 1);`
          : `if (FgValidateMembers(members) && fgSec_${host.key} < ${host.sections.length - 1}) await FgGo_${host.key}(fgSec_${host.key} + 1);`}
    }
`
      })
      .join('')

    // Sections holding repeaters also count their items' fields.
    function sectionRepeaterSwitch(host: (typeof hosts)[number], fn?: string, indexVar?: string): string {
      if (!host.sections.some((sec) => sec.repeaters.length > 0)) return ''
      if (!fn) return 'yes'
      const arms = host.sections
        .filter((sec) => sec.repeaters.length > 0)
        .map((sec) => {
          const calls = sec.repeaters.map((path) => {
            const r = repeaters.find((x) => x.path === path)!
            return `${fn}_${r.key}()`
          })
          return `${sec.index} => ${calls.join(fn === 'FgValidateRepeater' ? ' & ' : ' || ')},`
        })
      return `(${indexVar ?? `fgSec_${host.key}`} switch { ${arms.join(' ')} _ => ${fn === 'FgValidateRepeater' ? 'true' : 'false'} })`
    }
    function secHasErrors(host: (typeof hosts)[number], index: string): string {
      const base = `FgHasMessages(fgSecMembers_${host.key}[${index}])`
      return sectionRepeaterSwitch(host) ? `(${base} || ${sectionRepeaterSwitch(host, 'FgRepeaterHasErrors', index)})` : base
    }

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
    (host) => `        if (!${secHasErrors(host, `fgSec_${host.key}`)})
        {
            for (var i = 0; i < fgSecMembers_${host.key}.Length; i++)
            {
                if (${secHasErrors(host, 'i')}) { fgSec_${host.key} = i; break; }
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
        var count = fgAllMembers.Count(m => context.GetValidationMessages(new FieldIdentifier(Model, m)).Any())${hasRepeaters ? ' + FgItemErrorCount()' : ''};
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
        FgInitEdit();${hasRepeaters ? '\n        fgItemRefs.Clear();' : ''}
        fgDeferredFields.Clear();
        ResultJson = null;${tagsKeys.length ? '\n        foreach (var key in fgTagDrafts.Keys.ToList()) fgTagDrafts[key] = "";' : ''}${fields.some((f) => f.node.type === 'dates') ? '\n        foreach (var key in fgDateDrafts.Keys.ToList()) fgDateDrafts[key] = "";' : ''}${phoneCountryFields(fields).length ? '\n        fgPhoneCountry = FgPhoneDefaults();' : ''}
        await FgAnnounce(${csStr(messages.formReset)});
    }
`
      : ''

    const repeaterBlock = hasRepeaters
      ? `
${repeaters
  .map(
    (r) => `    private static readonly string[] fgItemFields_${r.key} = { ${r.fields
      .filter((f) => (f.node.validation?.length ?? 0) > 0)
      .map((f) => csStr(pascalMember(f.name)))
      .join(', ')} };
    private ElementReference fgAddRef_${r.key};

    private bool FgRepeaterHasErrors_${r.key}() =>
        Model.${repeaterMember(r)}.Any(item => fgItemFields_${r.key}.Any(n => fgEdit.GetValidationMessages(new FieldIdentifier(item, n)).Any()));

    private bool FgValidateRepeater_${r.key}()
    {
${repeaterVisible(r) === 'true' ? '' : `        if (!(${repeaterVisible(r)})) return true;\n`}        var ok = true;
        foreach (var item in Model.${repeaterMember(r)})
        {
            foreach (var name in fgItemFields_${r.key}) ok &= FgValidateItemField(new FieldIdentifier(item, name), false);
        }
        fgEdit.NotifyValidationStateChanged();
        return ok;
    }
`,
  )
  .join('\n')}
    private readonly HashSet<FieldIdentifier> fgDeferredItemFields = new();
    private readonly Dictionary<object, ElementReference> fgItemRefs = new();
    private object? fgFocusItem;
    private string? fgFocusAdd;

    private void FgFieldChanged(FieldIdentifier field)
    {
        if (ReferenceEquals(field.Model, Model))
        {
            FgFieldChanged(field.FieldName);
            return;
        }
        if (fgPressing)
        {
            fgDeferredItemFields.Add(field);
            return;
        }
        FgValidateItemField(field);
    }

    /** First rule violation of an item field (null when valid or hidden). */
    private string? FgItemError(object model, string name)
    {
${
  validatedRepeaters.length === 0
    ? ''
    : `        switch (model)
        {
${validatedRepeaters
  .map(
    (r) => `            case ${itemClass(r)} item:
                switch (name)
                {
${r.fields
  .filter((f) => (f.node.validation?.length ?? 0) > 0)
  .map((f) => {
    const kind = csFieldKind(f.node.type)
    const member = `item.${pascalMember(f.name)}`
    const guard = f.node.conditions?.length
      ? `                        if (!(${csConditions(f.node.conditions, itemCsAccessor(r))})) return null;\n`
      : ''
    const checks = csRuleChecks(f.node.validation ?? [], kind, member, itemCsAccessor(r))
      .map(({ test, message }) => `                        if (${test}) return ${csStr(message)};`)
      .join('\n')
    return `                    case ${csStr(pascalMember(f.name))}:\n                    {\n${guard}${checks}\n                        return null;\n                    }`
  })
  .join('\n')}
                }
                break;`,
  )
  .join('\n')}
        }
`
}        return null;
    }

    private bool FgValidateItemField(FieldIdentifier field, bool notify = true)
    {
        fgMessages.Clear(field);
        var error = FgItemError(field.Model, field.FieldName);
        if (error != null) fgMessages.Add(field, error);
        if (notify) fgEdit.NotifyValidationStateChanged();
        return error == null;
    }

    private int FgItemErrorCount()
    {
        var count = 0;
${repeaters
  .map(
    (r) =>
      `        foreach (var item in Model.${repeaterMember(r)}) count += fgItemFields_${r.key}.Count(n => fgEdit.GetValidationMessages(new FieldIdentifier(item, n)).Any());`,
  )
  .join('\n')}
        return count;
    }

    private static string FgItemLabel(string path, int index) => (path switch
    {
${repeaters.map((r) => `        ${csStr(r.path)} => ${csStr(r.itemLabel)},`).join('\n')}
        _ => "{n}",
    }).Replace("{n}", (index + 1).ToString());

    private static string FgRemoveLabel(string path, int index) =>
        ${csStr(messages.removeItemLabel)}.Replace("{label}", FgItemLabel(path, index));

    private async Task FgAddItem<T>(List<T> list, string path, int max) where T : class, new()
    {
        if (list.Count >= max) return;
        var item = new T();
        list.Add(item);
        fgFocusItem = item;
        await FgAnnounce(${csStr(messages.itemAdded)}.Replace("{label}", FgItemLabel(path, list.Count - 1)));
    }

    private async Task FgRemoveItem<T>(List<T> list, string path, int index, int min, string[] fields) where T : class
    {
        if (list.Count <= min || index >= list.Count) return;
        var label = FgItemLabel(path, index);
        var item = list[index];
        foreach (var name in fields) fgMessages.Clear(new FieldIdentifier(item, name));
        fgItemRefs.Remove(item);
        list.RemoveAt(index);
        fgEdit.NotifyValidationStateChanged();
        if (list.Count > 0) fgFocusItem = list[Math.Min(index, list.Count - 1)];
        else fgFocusAdd = path;
        await FgAnnounce(${csStr(messages.itemRemoved)}.Replace("{label}", label));
    }

    private async Task FgFocusRepeaters()
    {
        if (fgFocusItem != null && fgItemRefs.TryGetValue(fgFocusItem, out var itemRef))
        {
            fgFocusItem = null;
            await itemRef.FocusAsync();
        }
        else if (fgFocusAdd != null)
        {
            var path = fgFocusAdd;
            fgFocusAdd = null;
            var addRef = path switch
            {
${repeaters.map((r) => `                ${csStr(r.path)} => fgAddRef_${r.key},`).join('\n')}
                _ => default,
            };
            if (addRef.Context != null) await addRef.FocusAsync();
        }
    }
`
      : ''

    // Uploads: files are read into memory when picked (Blazor can't read a
    // file input's earlier selection once another is made), so the input is
    // re-created empty after each pick, like the JS targets clear theirs.
    const uploads = fields.filter((f) => FILE_TYPES.has(f.node.type))
    const hasUploads = uploads.length > 0
    const uploadBlock = hasUploads
      ? `
    public sealed record FgUpload(string Name, long Size, string ContentType, byte[]? Data, string? Thumb);

    private readonly Dictionary<string, int> fgFileKeys = new() { ${uploads.map((f) => `[${csStr(pascalMember(f.key))}] = 0`).join(', ')} };
    private readonly Dictionary<string, InputFile> fgFileInputs = new();
    private string? fgFocusFile;

    private async Task FgPickFiles(List<FgUpload> list, InputFileChangeEventArgs e, bool multiple, long maxBytes, bool thumbs, string member)
    {
        var picked = new List<FgUpload>();
        foreach (var file in e.GetMultipleFiles(multiple ? int.MaxValue : 1))
        {
            byte[]? data = null;
            if (maxBytes <= 0 || file.Size <= maxBytes)
            {
                using var buffer = new System.IO.MemoryStream();
                await file.OpenReadStream(maxBytes > 0 ? maxBytes : long.MaxValue).CopyToAsync(buffer);
                data = buffer.ToArray();
            }
            string? thumb = null;
            if (thumbs && file.ContentType.StartsWith("image/"))
            {
                try
                {
                    var small = await file.RequestImageFileAsync("image/png", 80, 80);
                    using var buffer = new System.IO.MemoryStream();
                    await small.OpenReadStream(long.MaxValue).CopyToAsync(buffer);
                    thumb = "data:image/png;base64," + Convert.ToBase64String(buffer.ToArray());
                }
                catch (Exception) { }
            }
            picked.Add(new FgUpload(file.Name, file.Size, file.ContentType, data, thumb));
        }
        if (picked.Count == 0) return;
        if (!multiple) list.Clear();
        list.AddRange(picked);
        fgFileKeys[member]++;
        fgFocusFile = member;
        fgEdit.NotifyFieldChanged(new FieldIdentifier(Model, member));
    }

    private void FgRemoveFile(List<FgUpload> list, FgUpload file, string member)
    {
        list.RemoveAll(f => ReferenceEquals(f, file));
        fgEdit.NotifyFieldChanged(new FieldIdentifier(Model, member));
    }

    private static string FgFileSize(long bytes) =>
        bytes >= 1024 * 1024 ? $"{bytes / 1024d / 1024d:0.0} MB" : $"{Math.Max(1, (int)Math.Round(bytes / 1024d))} KB";

    private static string FgRemoveFileLabel(string name) => ${csStr(messages.removeFile)}.Replace("{name}", name);

    /** Payload entry for an upload: { name, size, type } per file; the files become parts named by data path. */
    private static List<Dictionary<string, object?>> FgFilesPart(List<(string Path, FgUpload File)> parts, string path, List<FgUpload> files)
    {
        foreach (var file in files) parts.Add((path, file));
        return files.Select(f => new Dictionary<string, object?> { ["name"] = f.Name, ["size"] = f.Size, ["type"] = f.ContentType }).ToList();
    }

    private async Task FgFocusUploads()
    {
        if (fgFocusFile == null) return;
        var member = fgFocusFile;
        fgFocusFile = null;
        if (fgFileInputs.TryGetValue(member, out var input) && input.Element is ElementReference element) await element.FocusAsync();
    }
${schema.meta.submit?.url ? `
    private static System.Net.Http.HttpContent FgFilePart(FgUpload file, string path)
    {
        var content = new System.Net.Http.ByteArrayContent(file.Data ?? Array.Empty<byte>());
        content.Headers.ContentType = System.Net.Http.Headers.MediaTypeHeaderValue.TryParse(file.ContentType, out var type)
            ? type
            : new System.Net.Http.Headers.MediaTypeHeaderValue("application/octet-stream");
        return FgPart(content, path, file.Name);
    }

    // Quoted name/filename as browsers send them: some parsers reject the bare tokens .NET writes by default.
    private static System.Net.Http.HttpContent FgPart(System.Net.Http.HttpContent content, string name, string? fileName = null)
    {
        static string Quote(string value) => "\\"" + value.Replace("\\"", "%22").Replace("\\r", "%0D").Replace("\\n", "%0A") + "\\"";
        content.Headers.ContentDisposition = new System.Net.Http.Headers.ContentDispositionHeaderValue("form-data")
        {
            Name = Quote(name),
            FileName = fileName == null ? null : Quote(fileName),
        };
        return content;
    }
` : ''}`
      : ''

    // Composite fields: the slider's From/To class and handle helpers, the
    // date range class, and the multiple-dates draft store.
    const hasSlider = hasRangeSlider(schema)
    const hasRange = hasDateRange(schema)
    const dateMembers = fields.filter((f) => f.node.type === 'dates').map((f) => pascalMember(f.key))
    const hasGrid = hasMatrix(schema)
    const phoneFields = phoneCountryFields(fields)
    const compositeBlock = [
      hasSlider
        ? `
    // The two inputs render the Shown values and are re-created (a new
    // Version in their @key) only when a value is corrected (a handle
    // pushed past the other) or reset: re-rendering a live range input's
    // value would fight the user's drag or key presses.
    public sealed class FgRange
    {
        private static int fgVersions;

        public FgRange(double from, double to)
        {
            From = from;
            To = to;
            Redraw();
        }

        public double From { get; set; }
        public double To { get; set; }
        public double ShownFrom { get; private set; }
        public double ShownTo { get; private set; }
        public int Version { get; private set; }

        public void Redraw()
        {
            ShownFrom = From;
            ShownTo = To;
            Version = System.Threading.Interlocked.Increment(ref fgVersions);
        }
    }

    private readonly Dictionary<string, ElementReference> fgDualRefs = new();
    private string? fgFocusDual;

    private static string FgNum(double value) => value.ToString(System.Globalization.CultureInfo.InvariantCulture);

    private static string FgDualFill(FgRange range, double min, double max)
    {
        double Pct(double n) => max > min ? (n - min) / (max - min) * 100 : 0;
        return $"inset-inline-start: {FgNum(Pct(range.From))}%; inset-inline-end: {FgNum(100 - Pct(range.To))}%";
    }

    // With both handles together, the one that can still move is on top.
    private static bool FgDualFromOnTop(FgRange range, double min, double max) =>
        range.From == range.To && range.From > (min + max) / 2;

    // Handles can't cross: a value past the other handle stops at it (and
    // the input is redrawn there, keeping focus).
    private void FgDualSet(FgRange range, bool from, ChangeEventArgs e, string id)
    {
        var text = Convert.ToString(e.Value, System.Globalization.CultureInfo.InvariantCulture);
        if (!double.TryParse(text, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var n)) return;
        var crossed = from ? n > range.To : n < range.From;
        if (from) range.From = Math.Min(n, range.To);
        else range.To = Math.Max(n, range.From);
        if (!crossed) return;
        range.Redraw();
        fgFocusDual = id;
    }

    private async Task FgFocusDual()
    {
        if (fgFocusDual == null) return;
        var id = fgFocusDual;
        fgFocusDual = null;
        if (fgDualRefs.TryGetValue(id, out var input)) await input.FocusAsync();
    }
`
        : '',
      hasRange
        ? `
    public sealed class FgDateRange
    {
        public string From { get; set; } = "";
        public string To { get; set; } = "";
    }

    private void FgSetDate(FgDateRange range, bool from, ChangeEventArgs e, string member)
    {
        var value = Convert.ToString(e.Value) ?? "";
        if (from) range.From = value;
        else range.To = value;
        FgChanged(member);
    }
`
        : '',
      hasRange || dateMembers.length || hasGrid || phoneFields.length
        ? `
    private void FgChanged(string member) => fgEdit.NotifyFieldChanged(new FieldIdentifier(Model, member));
`
        : '',
      hasGrid
        ? `
    private void FgSetCell(Dictionary<string, string?> answers, string row, string column, string member)
    {
        answers[row] = column;
        FgChanged(member);
    }
`
        : '',
      phoneFields.length
        ? `
    private static readonly Dictionary<string, string> FgDial = new()
    {
${Object.entries(dialCodes(fields, schema.meta.locale)).map(([code, dial]) => `        [${csStr(code)}] = ${csStr(dial)},`).join('\n')}
    };

    private static Dictionary<string, string> FgPhoneDefaults() => new() { ${Object.entries(phoneDefaults(fields, schema.meta.locale, (f) => pascalMember(f.key))).map(([m, c]) => `[${csStr(m)}] = ${csStr(c)}`).join(', ')} };

    private Dictionary<string, string> fgPhoneCountry = FgPhoneDefaults();

    // The number part of "+<code> <number>" for the selected country.
    private static string FgPhoneNumber(string value, string country)
    {
        var prefix = "+" + FgDial[country] + " ";
        return value.StartsWith(prefix) ? value[prefix.Length..] : value;
    }

    private static string FgComposePhone(string country, string number) =>
        string.IsNullOrWhiteSpace(number) ? "" : "+" + FgDial[country] + " " + number;

    private string FgPhoneSetCountry(string member, string value, ChangeEventArgs e)
    {
        var typed = FgPhoneNumber(value, fgPhoneCountry[member]);
        fgPhoneCountry[member] = Convert.ToString(e.Value) ?? fgPhoneCountry[member];
        return FgComposePhone(fgPhoneCountry[member], typed);
    }

    private string FgPhoneInput(string member, ChangeEventArgs e) =>
        FgComposePhone(fgPhoneCountry[member], Convert.ToString(e.Value) ?? "");
`
        : '',
      dateMembers.length
        ? `
    private readonly Dictionary<string, string> fgDateDrafts = new() { ${dateMembers.map((m) => `[${csStr(m)}] = ""`).join(', ')} };

    private void FgAddDate(List<string> list, string member)
    {
        var date = fgDateDrafts.TryGetValue(member, out var draft) ? draft ?? "" : "";
        if (System.Text.RegularExpressions.Regex.IsMatch(date, @"^\\d{4}-\\d{2}-\\d{2}$") && !list.Contains(date))
        {
            list.Add(date);
            list.Sort(string.CompareOrdinal);
        }
        fgDateDrafts[member] = "";
        FgChanged(member);
    }

    private void FgRemoveDate(List<string> list, string date, string member)
    {
        list.Remove(date);
        FgChanged(member);
    }

    private static string FgRemoveDateLabel(string date) => ${csStr(messages.removeDate)}.Replace("{date}", date);
`
        : '',
    ].join('')

    const afterRenderBlock =
      hasRepeaters || hasUploads || hasSlider
        ? `
    protected override async Task OnAfterRenderAsync(bool firstRender)
    {${hasRepeaters ? '\n        await FgFocusRepeaters();' : ''}${hasUploads ? '\n        await FgFocusUploads();' : ''}${hasSlider ? '\n        await FgFocusDual();' : ''}
    }
`
        : ''

    const helperBlocks = `${editContextBlock}${announceBlock}${nextBlocks}${jumpBlock}${toggleBlock}${tagsBlock}${repeaterBlock}${uploadBlock}${compositeBlock}${afterRenderBlock}${resetBlock}`

    const formBinding = 'EditContext="fgEdit" OnSubmit="FgSubmit"'
    const extraUsings = '@using System.Linq\n@using Microsoft.AspNetCore.Components.Forms\n'

    const submitUrl = schema.meta.submit?.url
    const httpInject = submitUrl ? '@inject HttpClient Http\n' : ''
    const submitCall = !submitUrl
      ? ''
      : hasUploads
        ? `        // multipart: a JSON "data" part + one part per file
        using var body = new System.Net.Http.MultipartFormDataContent();
        body.Add(FgPart(new System.Net.Http.StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json"), "data"));
        foreach (var (path, file) in parts) body.Add(FgFilePart(file, path));
        await Http.${schema.meta.submit?.method === 'PUT' ? 'PutAsync' : 'PostAsync'}(${csStr(submitUrl)}, body);\n`
        : `        await Http.${schema.meta.submit?.method === 'PUT' ? 'PutAsJsonAsync' : 'PostAsJsonAsync'}(${csStr(submitUrl)}, payload);\n`

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

    const STATIC_HELPERS = '    // @fg-static-helpers\n'
    const draft = `@* Generated by FormsGen (.NET 8). *@
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
${sectionFields ? `\n${sectionFields}\n` : ''}${helperBlocks}${STATIC_HELPERS}
    private async Task HandleValidSubmit()
    {
${hasUploads ? '        var parts = new List<(string Path, FgUpload File)>();\n        var payload = BuildPayload(parts);' : '        var payload = BuildPayload();'}
        ResultJson = JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = true });
${submitCall}        await FgAnnounce(${csStr(messages.submitted)});
    }

    private Dictionary<string, object?> BuildPayload(${hasUploads ? 'List<(string Path, FgUpload File)> parts' : ''})
    {
        var payload = new Dictionary<string, object?>();
${payloadStatements.join('\n')}
        return payload;
    }

    public class ${name}Model : IValidatableObject
    {
${properties}${repeaterProperties ? `\n\n${repeaterProperties}` : ''}

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
${validateStatements || '            yield break;'}
        }
    }
${itemClasses}}
`

    // Value helpers shared by markup conditions and the model's Validate()
    // (a nested class sees the component's static members): only those used.
    const staticHelpers = [
      draft.includes('FgIsBlank(') &&
        `    private static bool FgIsBlank(object? value) => value switch
    {
        null => true,
        string text => string.IsNullOrWhiteSpace(text),
        bool on => !on,${hasMatrix(schema) ? `
        IDictionary<string, string?> answers => answers.Values.Any(string.IsNullOrEmpty),` : ''}${hasDateRange(schema) ? `
        FgDateRange range => string.IsNullOrWhiteSpace(range.From) || string.IsNullOrWhiteSpace(range.To),` : ''}
        System.Collections.ICollection list => list.Count == 0,
        _ => false,
    };`,
      draft.includes('FgContains(') &&
        `    private static bool FgContains(object? value, string part) => value switch
    {
        string text => text.Contains(part),
        IEnumerable<string> list => list.Contains(part),
        _ => false,
    };`,
      draft.includes('FgAccepts(') &&
        `    private static bool FgAccepts(FgUpload file, string accept)
    {
        var name = file.Name.ToLowerInvariant();
        var type = (file.ContentType ?? "").ToLowerInvariant();
        return accept.Split(',').Select(t => t.Trim().ToLowerInvariant()).Where(t => t.Length > 0).Any(t =>
            t.StartsWith('.') ? name.EndsWith(t) : t.EndsWith("/*") ? type.StartsWith(t[..^1]) : type == t);
    }`,
    ].filter(Boolean)
    const razor = draft.replace(STATIC_HELPERS, staticHelpers.length ? `\n${staticHelpers.join('\n\n')}\n` : '')

    const stylesheet = exportStylesheet(css, schema)
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
2. Copy \`${name}.razor\`${exportStylesheet(ctx.css, ctx.schema) ? ` and \`${name}.razor.css\` (scoped styles, picked up automatically by the build)` : ''} into your \`Components\`/\`Pages\` folder.
3. Use it: \`<${name} />\`${ctx.schema.meta.submit?.url ? `\n4. The component POSTs to \`${ctx.schema.meta.submit.url}\` on valid submit — register \`HttpClient\` in DI (WASM templates do by default).` : ''}

${ctx.css.id === 'bootstrap5' ? 'Bootstrap 5 classes are used — the default Blazor templates already ship Bootstrap, so it works out of the box.' : ctx.css.readmeNote()}
`
  },
}
