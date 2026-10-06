#!/bin/bash
# One-time setup of the verification toolkit in a fresh container.
#
#   bash tools/proof/setup.sh
#
# Installs the harness dependencies (React, esbuild, TypeScript, Playwright)
# under tools/proof/node_modules with npm (tools/proof is deliberately not a
# pnpm workspace package) and checks that the tools the matrix needs are
# present: Node 20+, the .NET 8 SDK, a Chromium binary and the builder's own
# node_modules. Playwright's browser download is skipped on purpose: the
# container ships Chromium at /opt/pw-browsers/chromium and lib.sh points
# PLAYWRIGHT_CHROMIUM at it. Exits non-zero when something is missing.
set -u
source "$(dirname "$0")/lib.sh"

missing=0
problem() { echo "setup: MISSING: $*" >&2; missing=1; }

# Node 20 or newer (needed for npm itself, the e2e scripts and the servers).
if ! command -v node >/dev/null 2>&1; then
  echo "setup: node not found on PATH; install Node 20 or newer" >&2
  exit 1
fi
node_major=$(node -p 'Number(process.versions.node.split(".")[0])')
if [ "$node_major" -lt 20 ]; then
  echo "setup: node $(node --version) is too old; the toolkit needs Node 20 or newer" >&2
  exit 1
fi
echo "setup: node $(node --version)"

# Harness dependencies. PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD keeps npm from
# fetching a browser: the e2e helper uses PLAYWRIGHT_CHROMIUM instead.
echo "setup: npm install in $PROOF"
if ! (cd "$PROOF" && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-audit --no-fund); then
  echo "setup: npm install failed in $PROOF (see the output above)" >&2
  exit 1
fi

# .NET 8 SDK for the Blazor host (strict.sh builds it, run-matrix.sh runs it).
if ! command -v dotnet >/dev/null 2>&1; then
  problem "dotnet not found on PATH; the Blazor runs need the .NET 8 SDK"
else
  dotnet_version=$(dotnet --version 2>/dev/null || echo unknown)
  case "$dotnet_version" in
    8.*) echo "setup: dotnet $dotnet_version" ;;
    *) problem "dotnet $dotnet_version found but the Blazor host targets .NET 8 (need an 8.x SDK)" ;;
  esac
fi

# Chromium for Playwright. lib.sh exports PLAYWRIGHT_CHROMIUM when the
# container's binary exists; otherwise the user must point it at one, since
# this script never runs "playwright install".
if [ -n "${PLAYWRIGHT_CHROMIUM:-}" ] && [ -x "$PLAYWRIGHT_CHROMIUM" ]; then
  echo "setup: chromium $PLAYWRIGHT_CHROMIUM"
else
  problem "no Chromium binary: /opt/pw-browsers/chromium is absent and PLAYWRIGHT_CHROMIUM is not set to an executable (playwright install is not run by this script)"
fi

# The Vue harness and export-demo.sh use the builder's installed packages.
if [ -f "$BUILDER_NM/vite/bin/vite.js" ] && [ -d "$BUILDER_NM/@vitejs/plugin-vue" ]; then
  echo "setup: builder node_modules $BUILDER_NM"
else
  problem "$BUILDER_NM is incomplete; run 'pnpm install' at the repository root first"
fi

# What the scripts will use for this container.
echo "setup: FG_HOST=$FG_HOST static=$FG_STATIC_PORT blazor=$FG_BLAZOR_PORT submit=$FG_SUBMIT_PORT captcha=$FG_CAPTCHA_PORT"
if [ -n "${PROXY_CA_SPKI:-}" ]; then
  echo "setup: PROXY_CA_SPKI computed (browsers will trust the agent proxy for CDN loads)"
else
  echo "setup: no agent proxy CA found; browsers run without proxy settings"
fi

if [ "$missing" -ne 0 ]; then
  echo "setup: finished with missing tools (see MISSING lines above)" >&2
  exit 1
fi
echo "setup: done"
