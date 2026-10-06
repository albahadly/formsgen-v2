# Blazor proof host

A minimal .NET 8 Blazor Server app that hosts one exported FormsGen component
for the strict build and the 12-runtime matrix. The scripts in `tools/proof/`
copy the component into `Components/Proof/` and render `Components/App.razor`
and `Components/Pages/Home.razor` from the `.template` files (the framework's
CDN tag replaces `<!-- FG_HEAD -->`, `__COMPONENT__` names the form); those
generated files, `bin/` and `obj/` are ignored by git. To build it by hand:

```sh
bash tools/proof/export-demo.sh tools/proof/demos/wizard.json tools/proof/work/wizard
bash tools/proof/strict.sh tools/proof/work/wizard WizDemoForm     # builds it three times
```
