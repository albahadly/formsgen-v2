#!/bin/bash
# Usage: strict.sh <outdir> <Component>
#
# Runs the strict compilers over the exports that export-demo.sh wrote to
# <outdir>: React through tsc (strict, noUnused*), the Vue standalone
# components through vue-tsc inside the builder (so Vue resolves as it does
# there), and the Blazor components through "dotnet build" of the host
# project, for vanilla, tailwind and bootstrap5. Expected: no tsc or vue-tsc
# output, and three "0 Error(s) 0 Warning(s)" summaries.
set -u
source "$(dirname "$0")/lib.sh"
if [ $# -lt 2 ]; then echo "usage: strict.sh <outdir> <Component>" >&2; exit 2; fi
OUT=$(cd "$1" && pwd); C=$2
LINES_MAX=${LINES_MAX:-20}

VUE_TMP=$ROOT/apps/builder/src/__proof__
cleanup() { rm -rf "$VUE_TMP"; blazor_cleanup; }
trap cleanup EXIT

# React: a per-run tsconfig extends the harness one and lists the component.
mkdir -p "$WORK/react"
for fw in vanilla tailwind bootstrap5; do
  cp "$OUT/$fw-react-$C.tsx" "$WORK/react/$C.tsx"
  rm -f "$WORK/react/$C.css"; [ -f "$OUT/$fw-react-$C.css" ] && cp "$OUT/$fw-react-$C.css" "$WORK/react/$C.css"
  printf '{ "extends": "../../react-harness/tsconfig.json", "files": ["./%s.tsx", "../../react-harness/env.d.ts"] }\n' "$C" > "$WORK/react/tsconfig.json"
  echo "== react $fw"
  (cd "$PROOF" && npx tsc -p "$WORK/react/tsconfig.json" 2>&1 | head -"$LINES_MAX")
done

# Vue: vue-tsc runs in the builder over copies placed under src/__proof__
# (ignored by git and by eslint; removed on exit).
mkdir -p "$VUE_TMP"
for fw in vanilla tailwind bootstrap5; do cp "$OUT/$fw-vue-standalone-$C.vue" "$VUE_TMP/${C}_$fw.vue"; done
echo "== vue"
(cd "$ROOT" && pnpm --filter @formsgen/builder exec vue-tsc --noEmit 2>&1 | head -"$LINES_MAX")
rm -rf "$VUE_TMP"

# Blazor: one build per framework with the component in the host project.
for fw in vanilla tailwind bootstrap5; do
  echo "== blazor $fw"
  blazor_prepare "$fw" "$C" "$OUT"
  blazor_build "$WORK/strict-blazor-$fw.log" | head -"$LINES_MAX"
done
echo "STRICT-DONE"
