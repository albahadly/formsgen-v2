# Phase 47: npm release — the two packages under the user's scope

## Status

Complete (2026-10-21), on `main`. **`@albahadly/formsgen-renderer@0.1.0`
and `@albahadly/formsgen-cli@0.1.0` are live on npm** (`latest`, MIT):
staged by Release run 39549631364, approved by the user with 2FA,
checked from a fresh folder (`npx @albahadly/formsgen-cli targets`
answers; `npm i @albahadly/formsgen-renderer vue` imports with
`parseFormSchema`). Gate: `pnpm verify` green on the Windows checkout
(lint, typecheck, renderer 228 / builder 395 / cli 12 / server 9 tests,
all builds). The workflow alone never goes live: it stages, the user
approves (see "How to verify").

## What was built

- **Scope and names.** The npm user `formsgen` does not exist, so the
  `@formsgen` scope would have meant creating an organization; the user
  chose their own scope instead. `@formsgen/renderer` →
  **`@albahadly/formsgen-renderer`**, `@formsgen/cli` →
  **`@albahadly/formsgen-cli`**, renamed across every tracked text file
  (181: builder imports and tests, the Vue (renderer) export's generated
  `import` and README, the CLI, the Vue example, docs, snapshots), and
  the lockfile regenerated. The private `@formsgen/builder` keeps its
  name (never published).
- **License and metadata.** `LICENSE` (MIT, 2026 Salwan Albahadly) at
  the root; both packages carry `license`, `author`, `repository` (with
  `directory`), `homepage`, `bugs`, `keywords` and
  `publishConfig.access: public` (scoped packages are private by default
  on npm, which makes an unpaid publish fail with 402).
- **The Release workflow** (`.github/workflows/release.yml`) — the route
  the user chose: *stage from CI with a token, go live by hand*. Manual
  (Actions → Release → Run workflow) or a `v*` tag; frozen install,
  `pnpm verify`, then for each package `npm view <name>@<version>` and,
  when it is not live yet, `pnpm pack` (resolves the `workspace:` specs,
  keeps the published files), the tarball unpacked, and
  `npm stage publish --access public` in the unpacked directory with the
  `NPM_TOKEN` secret — a granular token with **"Read and write (stage
  only)"**, which can stage but never publish directly. The staged
  version stays private until a maintainer approves it with 2FA on
  npmjs.com (the package → *Staged Packages* → *Approve*) or with
  `npm stage approve <stage-id>`; `npm stage reject <stage-id>` discards
  it. Staging needs npm ≥ 11.15 and Node ≥ 22.14, so the workflow
  upgrades npm. Re-running is safe (live versions are skipped); a new
  release is a version bump in both `package.json` files. The repository
  went public on 2026-10-21, so the stage step passes `--provenance`
  (`permissions: id-token: write`): each version on npm carries an
  attestation naming the commit and the workflow run that built it.
- **What the first runs taught (2026-10-21).** A granular token without
  "Bypass 2FA" is refused with `E403 … bypass 2fa enabled is required`;
  npm's token page now steers automation to *stage-only* tokens, and npm
  targets January 2027 to end direct publishing with bypass-2FA tokens.
  Trusted publishing (OIDC) was the alternative, but it can only be
  configured for a package that already exists and needs no human step;
  the user preferred a human approval before anything goes live, which
  is exactly what staging is for.
- **READMEs**: the renderer's and the CLI's install sections start with
  `npm i @albahadly/formsgen-renderer vue` / `npx @albahadly/formsgen-cli …`
  (the monorepo build-and-pack route stays as the alternative); the Vue
  (renderer) export's README tells users to install from npm; the root
  README has a "Publishing to npm" section; the CLAUDE.md rule "npm
  publish parked" became the release rule.

## What was intentionally NOT done

- No version bump: both packages publish as 0.1.0, their first release.
- No changelog or release notes; the handoffs are the record.
- Publishing from a session: never — the token is the user's, the
  workflow does the publishing.

## Key decisions & why

- **A workflow, not a local `npm publish`**: the publish then runs from
  a verified checkout of `main` with the same gates as CI, and the token
  lives only in the repository secrets.
- **Skip-if-present instead of failing**: the workflow can be re-run or
  triggered by a tag without fear; "already on npm" is a normal outcome.
- **The rename is real, not a `publishConfig` trick**: pnpm cannot
  override `name` at pack time, and the generated Vue (renderer) code
  must import the name people install.

## How to verify

What the user does:

1. **Once**: npmjs.com → avatar → *Access Tokens* → *Generate New Token*
   → *Granular Access Token*, packages permission **"Read and write
   (stage only)"** (all packages, or the `@albahadly` scope); GitHub →
   repository → *Settings* → *Secrets and variables* → *Actions* →
   secret `NPM_TOKEN` with that token.
2. **Each release**: bump `version` in `packages/renderer/package.json`
   and `packages/cli/package.json`, commit, *Actions → Release → Run
   workflow* (or push `v0.1.0`). The log ends with the pending stages.
3. **Go live**: npmjs.com → the package → *Staged Packages* → review →
   *Approve* (2FA prompt), for each of the two packages; or from a
   terminal with `npm login` done: `npm stage list`, then
   `npm stage approve <stage-id>` (2FA prompt). Check
   https://www.npmjs.com/package/@albahadly/formsgen-renderer and
   https://www.npmjs.com/package/@albahadly/formsgen-cli, or
   `npx @albahadly/formsgen-cli targets` anywhere.

The first staging of a package that does not exist yet makes npm publish
a public placeholder version `0.0.0-stage` (its contents stay private);
the real 0.1.0 appears when approved.

Repo side:

```sh
pnpm verify
pnpm --filter @albahadly/formsgen-renderer publish --dry-run --no-git-checks
pnpm --filter @albahadly/formsgen-cli publish --dry-run --no-git-checks
```

## Known issues / gotchas

- A *stage-only* token cannot approve, reject or `npm publish`; a direct
  publish with it fails with `E_STAGE_REQUIRED`. Approval is a
  maintainer with 2FA — on the website or in a logged-in terminal.
- The workflow stages from an unpacked `pnpm pack` tarball, not from the
  workspace directory: `npm stage publish` packs a directory, and the
  tarball is the one with `workspace:` specs resolved and only the
  published files.
- Staging needs npm ≥ 11.15 and Node ≥ 22.14 (the workflow installs the
  latest npm); `npm stage list` from the workflow is informational and
  may be empty on older registries' responses.
- `npm pack` names a scoped tarball `albahadly-formsgen-renderer-<v>.tgz`;
  the monorepo install line in the READMEs uses that pattern.
- The unscoped `formsgen` package on npm belongs to someone else; the
  scoped names are unrelated to it.

## Pointers for the next phase

- After the first publish: the Vue (renderer) export could offer a
  version-pinned install line, and the CLI README a `package.json`
  scripts example.
