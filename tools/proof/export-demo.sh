#!/bin/bash
# Usage: export-demo.sh <schema.json> <outdir>
#
# Writes the 12 exports of a form schema (html, react, vue-standalone, blazor
# x vanilla, tailwind, bootstrap5) into <outdir>, named
# "<framework>-<target>-<file>", exactly as the builder would generate them.
# The exports are produced by the builder's own target code, run through a
# throw-away vitest test so the builder's module aliases and TypeScript
# transforms apply without a separate build. The schema is copied to
# <outdir>/demo.json first with the literal placeholder FG_HOST replaced by
# this container's host (the demo schemas point their submit URL at it).
set -u
source "$(dirname "$0")/lib.sh"

if [ $# -lt 2 ]; then
  echo "usage: export-demo.sh <schema.json> <outdir>" >&2
  exit 2
fi
SCHEMA=$1
OUT=$2
if [ ! -f "$SCHEMA" ]; then
  echo "export-demo: schema not found: $SCHEMA" >&2
  exit 2
fi
mkdir -p "$OUT"
# vitest runs with apps/builder as its working directory, so the paths handed
# to the test must be absolute.
OUT=$(cd "$OUT" && pwd)

sed "s#FG_HOST#$FG_HOST#g" "$SCHEMA" > "$OUT/demo.json"

# The throw-away test lives next to the real target tests so its relative
# imports ('../css', '.') resolve. It is gitignored and removed on exit, even
# when the run fails or is interrupted.
TEST=$ROOT/apps/builder/src/export/targets/__proof_dump.test.ts
trap 'rm -f "$TEST"' EXIT
cat > "$TEST" <<'TS'
import { parseFormSchema } from '@formsgen/renderer'
import { readFileSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { getCssAdapter, type CssFrameworkId } from '../css'
import { getTarget } from '.'
it('dump', () => {
  const r = parseFormSchema(JSON.parse(readFileSync(process.env.FG_PROOF_SCHEMA!, 'utf8'))); if (!r.ok) throw new Error(r.errors.join())
  for (const fw of ['vanilla', 'tailwind', 'bootstrap5'] as CssFrameworkId[])
    for (const t of ['html', 'react', 'vue-standalone', 'blazor'])
      for (const f of getTarget(t)!.generate({ schema: r.schema, css: getCssAdapter(fw) })) writeFileSync(process.env.FG_PROOF_OUT + '/' + fw + '-' + t + '-' + f.path, f.content)
})
TS

LOG=$WORK/export-demo.log
(cd "$ROOT" && FG_PROOF_SCHEMA="$OUT/demo.json" FG_PROOF_OUT="$OUT" \
  pnpm --filter @formsgen/builder exec vitest run src/export/targets/__proof_dump.test.ts) > "$LOG" 2>&1
status=$?
if [ "$status" -ne 0 ]; then
  cat "$LOG"
  echo "export-demo: vitest failed (status $status); log: $LOG" >&2
  exit "$status"
fi

# List what was written: every export file follows the <fw>-<target>- prefix.
count=0
for f in "$OUT"/{vanilla,tailwind,bootstrap5}-{html,react,vue-standalone,blazor}-*; do
  [ -f "$f" ] || continue
  echo "$f"
  count=$((count + 1))
done
echo "export-demo: $count files written to $OUT (schema: $OUT/demo.json)"
