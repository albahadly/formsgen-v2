# Phase 47: npm release — the two packages under the user's scope

## Status

Repo side complete (2026-10-21), on `main`. Gate: `pnpm verify` green on
the Windows checkout (lint, typecheck, renderer 228 / builder 395 / cli 12 / server 9 tests, all builds); `npm pack --dry-run` and
`pnpm publish --dry-run` clean for both packages. **Nothing is on npm
until the user adds the `NPM_TOKEN` secret and runs the Release
workflow** (see "How to verify").

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
- **The Release workflow** (`.github/workflows/release.yml`): manual
  (Actions → Release → Run workflow) or a `v*` tag; installs with the
  frozen lockfile, runs `pnpm verify`, then for each package checks
  `npm view <name>@<version>` and publishes only what is not on npm yet
  (`pnpm --filter <name> publish --access public --no-git-checks` with
  `NODE_AUTH_TOKEN` from the `NPM_TOKEN` secret). Re-running after a
  failure is safe; a new release is a version bump in both
  `package.json` files. No provenance attestation: the repository is
  private, and npm only attests public repositories.
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

What the user does once:

1. npmjs.com → profile → *Access Tokens* → *Generate New Token* →
   *Granular Access Token*: **Read and write** on packages (all, or the
   `@albahadly` scope), and **"Bypass two-factor authentication (2FA)"
   turned on** — without it npm answers the workflow's publish with
   `403 … Two-factor authentication or granular access token with bypass
   2fa enabled is required`. Copy the token.
2. GitHub → repository → *Settings* → *Secrets and variables* →
   *Actions* → *New repository secret*: name `NPM_TOKEN`, the token.
3. *Actions* → *Release* → *Run workflow* (branch `main`), or
   `git tag v0.1.0 && git push origin v0.1.0`.
4. Check https://www.npmjs.com/package/@albahadly/formsgen-renderer and
   https://www.npmjs.com/package/@albahadly/formsgen-cli, then in any
   project: `npx @albahadly/formsgen-cli targets`.

Repo side:

```sh
pnpm verify
pnpm --filter @albahadly/formsgen-renderer publish --dry-run --no-git-checks
pnpm --filter @albahadly/formsgen-cli publish --dry-run --no-git-checks
```

## Known issues / gotchas

- The first run (2026-10-21) failed exactly here: a granular token
  without "Bypass 2FA" gets `E403 … bypass 2fa enabled is required`
  (nothing was uploaded). Regenerate the token with that option, replace
  the `NPM_TOKEN` secret, re-run the workflow. Once the packages exist,
  npm's trusted publishing (GitHub OIDC, no token) is an option: it
  needs `id-token: write` and npm ≥ 11.5 on the runner.
- `npm pack` names a scoped tarball `albahadly-formsgen-renderer-<v>.tgz`;
  the monorepo install line in the READMEs uses that pattern.
- The unscoped `formsgen` package on npm belongs to someone else; the
  scoped names are unrelated to it.

## Pointers for the next phase

- After the first publish: the Vue (renderer) export could offer a
  version-pinned install line, and the CLI README a `package.json`
  scripts example.
