# .NET example (Blazor)

`EventRegistration/` is a Blazor Web App (.NET 8, interactive server
rendering) that hosts the exported Razor component.
`Components/Forms/<Css>/EventRegistrationForm.razor` are the files the
builder's *Download* writes for the Blazor target, one per CSS framework
(the vanilla and Bootstrap variants also bring `EventRegistrationForm.razor.css`,
scoped styles the build bundles into `EventRegistration.styles.css`); the rest is
the host app.

## Run

```sh
cd examples/dotnet/EventRegistration
dotnet run
```

Open http://localhost:5200 (set in `Properties/launchSettings.json`). The
pages: `/` vanilla CSS, `/tailwind`, `/bootstrap5`. Start the sample server
to receive the submissions (`../README.md`): the component posts from the
server process with `HttpClient`, so `localhost:4280` is the server's own
localhost.

## How the form is integrated

- `Program.cs`: `AddRazorComponents().AddInteractiveServerComponents()` as in
  the stock template, plus `AddHttpClient()`, because the component declares
  `@inject HttpClient Http` and posts the payload on a valid submit.
- Each page brings in the variant's namespace (folders become namespaces)
  and renders `<EventRegistrationForm @rendermode="InteractiveServer" />`.
  Interactivity is needed for the validation messages, the condition and
  the submit.
- Vanilla CSS: nothing to add; the build bundles the scoped stylesheet.
- Tailwind: the page adds Tailwind through `<HeadContent>` (the Play CDN
  here; a real app generates its CSS with the Tailwind CLI and links it in
  `App.razor`).
- Bootstrap 5: the page links Bootstrap's CSS through `<HeadContent>` (the
  stock Blazor templates ship it under `wwwroot/lib/bootstrap`).
- The links in `MainLayout.razor` carry `data-enhance-nav="false"`, so a
  page switch reloads the document and each page's head holds only its own
  stylesheet.

## Into your project

1. `dotnet new blazor`, or any .NET 8 Blazor app (Server or WebAssembly).
2. Copy `EventRegistrationForm.razor` (and `.razor.css`) into `Components/`
   and register `HttpClient` (WebAssembly templates already do).
3. Use `<EventRegistrationForm @rendermode="InteractiveServer" />`, or your
   app's interactive render mode.
