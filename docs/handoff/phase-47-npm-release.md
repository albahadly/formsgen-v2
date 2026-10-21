# Phase 47: npm release — the two packages under the user's scope

## Status

Repo side complete (2026-10-21), on `main`. Gate: `pnpm verify` green on
the Windows checkout (lint, typecheck, renderer 228 / builder 395 / cli 12 / server 9 tests, all builds); `npm pack --dry-run` and
`pnpm publish --dry-run` clean for both packages. **Nothing is on npm
until the user publishes the first version by hand and names the
workflow as each package's trusted publisher** (see "How to verify").

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
  (Actions → Release → Run workflow) or a `v*` tag; frozen install,
  `pnpm verify`, then for each package `npm view <name>@<version>` and,
  when it is not on npm yet, `pnpm pack` (resolves `workspace:` specs)
  followed by `npm publish <tarball> --access public`. It authenticates
  through **npm trusted publishing (GitHub OIDC)** — `permissions:
  id-token: write`, npm upgraded to ≥ 11.5 on the runner, no token and
  no secret. Re-running after a failure is safe; a new release is a
  version bump in both `package.json` files. No provenance attestation:
  npm only attests public repositories, and this one is private.
- **What the first run taught (2026-10-21).** The token route is closing:
  a granular token without "Bypass 2FA" is refused with `E403 … bypass
  2fa enabled is required`; the newer *stage-only* tokens can only
  `npm stage publish` for a maintainer to approve with 2FA; npm targets
  January 2027 to end direct publishing with bypass-2FA tokens. Trusted
  publishing is npm's recommended destination, but it can only be
  configured for a package that already exists — so the first version is
  published by hand with 2FA, and the workflow takes over from there.
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

What the user does once (both packages are built in `dist/` by
`pnpm verify`):

1. **First publish by hand, with 2FA**, from the repo root:
   ```sh
   npm login                                   # opens the browser; 2FA
   pnpm --filter @albahadly/formsgen-renderer publish --access public --no-git-checks
   pnpm --filter @albahadly/formsgen-cli publish --access public --no-git-checks
   ```
   npm asks for the one-time code once per package.
2. **Name the workflow as the trusted publisher**, for each package:
   npmjs.com → the package → *Settings* → *Trusted publisher* →
   *GitHub Actions*: organization or user `albahadly`, repository
   `formsgen-v2`, workflow filename `release.yml`, environment empty.
   npm expires a trusted-publisher configuration that has not published
   within 2 days, so do this when a release is near — or run the
   workflow right away: it skips versions already on npm, so the first
   OIDC publish happens at the next version bump.
3. Remove the `NPM_TOKEN` repository secret and the npm token: nothing
   reads them any more.
4. Later releases: bump `version` in `packages/renderer/package.json` and
   `packages/cli/package.json`, commit, *Actions → Release → Run
   workflow* (or push `v0.2.0`). Check
   https://www.npmjs.com/package/@albahadly/formsgen-renderer and
   https://www.npmjs.com/package/@albahadly/formsgen-cli, or
   `npx @albahadly/formsgen-cli targets` anywhere.

Repo side:

```sh
pnpm verify
pnpm --filter @albahadly/formsgen-renderer publish --dry-run --no-git-checks
pnpm --filter @albahadly/formsgen-cli publish --dry-run --no-git-checks
```

## Known issues / gotchas

- Tokens: the first run (2026-10-21) failed with `E403 … bypass 2fa
  enabled is required` and nothing was uploaded; npm's token UI now
  steers to *stage-only* tokens (`npm stage publish` + a maintainer's
  `npm stage approve --otp`). The workflow no longer uses a token.
- A trusted-publisher configuration must publish within 2 days or it
  expires; trusted publishing needs GitHub-hosted runners and npm ≥ 11.5
  (the workflow installs the latest npm).
- The OIDC publish step calls `npm publish` on a `pnpm pack` tarball, not
  `pnpm publish`: the OIDC exchange is the npm CLI's, and the tarball has
  the `workspace:` specs resolved.
- `npm pack` names a scoped tarball `albahadly-formsgen-renderer-<v>.tgz`;
  the monorepo install line in the READMEs uses that pattern.
- The unscoped `formsgen` package on npm belongs to someone else; the
  scoped names are unrelated to it.

## Pointers for the next phase

- After the first publish: the Vue (renderer) export could offer a
  version-pinned install line, and the CLI README a `package.json`
  scripts example.
