#!/usr/bin/env bash
# Cloudflare Workers Builds entry point (build command: "bash build.sh",
# deploy command: "npx wrangler deploy"). Same pattern as the docs repo.
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable pnpm 2>/dev/null || npm install -g pnpm@10
fi

pnpm --version
pnpm install --frozen-lockfile
pnpm --filter @formsgen/builder build
