#!/bin/bash
# Usage: run-matrix.sh <outdir> <Component> <html-basename> <e2e.mjs> <tag>
#   env ONLY=web     only the nine HTML/React/Vue runtimes
#   env ONLY=blazor  only the three Blazor runtimes
#
# Drives one demo through all 12 runtimes and compares what the scenario saw
# in each with the HTML vanilla run. <outdir> holds the exports written by
# export-demo.sh. For each CSS framework the React export is bundled with
# esbuild and the Vue export with Vite, the three are served by
# static-server.mjs, and the Blazor export is built into the host project and
# run. The scenario script gets (url, kind, screenshot) and prints a JSON
# object; results are res-<run>.json (+ err-<run>.txt, shots/), the
# comparison normalises "size" numbers (file sizes are never deterministic).
# Prints "<run>: IDENTICAL" or "<run>: DIFFERS: …" per run and CHECK-DONE at
# the end; everything also goes to <outdir>/matrix.log.
set -u
source "$(dirname "$0")/lib.sh"
if [ $# -lt 5 ]; then echo "usage: run-matrix.sh <outdir> <Component> <html-basename> <e2e.mjs> <tag>" >&2; exit 2; fi
OUT=$(cd "$1" && pwd); COMP=$2; HTML=$3; E2E=$(cd "$(dirname "$4")" && pwd)/$(basename "$4"); TAG=$5
ONLY=${ONLY:-}
mkdir -p "$OUT/shots" "$WORK/react" "$WORK/vue"
exec > >(tee -a "$OUT/matrix.log") 2>&1

cleanup() { stop_bg static; stop_bg blazor; blazor_cleanup; }
trap cleanup EXIT

# Compare a result with the HTML vanilla baseline: the "errors" list is shown
# separately, whitespace and file sizes are normalised, the first diff lines
# are printed when they differ.
norm='import json,sys,re;d=json.load(open(sys.argv[1]));e=d.pop("errors",[]);print("errors:",e,file=sys.stderr);s=re.sub(r"\s+","",json.dumps(d,indent=1));s=re.sub(r"\"size\":\d+","\"size\":N",s);print(s.replace(",",",\n"))'
cmp() {
  # A run that crashed leaves an empty result: never "identical" by accident.
  if ! python3 -c "import json,sys;json.load(open(sys.argv[1]))" "$1" 2>/dev/null; then echo "NO RESULT (see err file)"; return; fi
  if diff <(python3 -c "$norm" "$OUT/res-html-vanilla.json" 2>/dev/null) <(python3 -c "$norm" "$1") > /dev/null; then
    echo "IDENTICAL"
  else
    echo "DIFFERS:"; diff <(python3 -c "$norm" "$OUT/res-html-vanilla.json" 2>/dev/null) <(python3 -c "$norm" "$1") | head -20
  fi
}
drive() { # drive <run> <url> <kind>
  (cd "$PROOF" && node "$E2E" "$2" "$3" "$OUT/shots/$TAG-$1.png" > "$OUT/res-$1.json" 2> "$OUT/err-$1.txt")
  echo -n "$1: "; cmp "$OUT/res-$1.json" 2>&1 | tr '\n' ' '; echo
}

if [ "$ONLY" != blazor ]; then
  stop_bg static
  start_bg static node "$PROOF/static-server.mjs" "$OUT" "$FG_STATIC_PORT"
  wait_http "http://$FG_HOST:$FG_STATIC_PORT/" 20 || true
  for fw in vanilla tailwind bootstrap5; do
    # The framework's CDN tag, taken from the HTML export so the bundles load
    # exactly what it loads (nothing for vanilla).
    head=$(grep -o '<script src="https://cdn.tailwindcss.com[^>]*></script>\|<link rel="stylesheet" href="https://cdn.jsdelivr[^>]*>' "$OUT/$fw-html-$HTML.html" | head -1)
    # React: component + its stylesheet, bundled by esbuild from tools/proof
    # (where react and react-dom are installed).
    rm -f "$WORK/react/$COMP.css"
    cp "$OUT/$fw-react-$COMP.tsx" "$WORK/react/$COMP.tsx"
    css=""
    if [ -f "$OUT/$fw-react-$COMP.css" ]; then cp "$OUT/$fw-react-$COMP.css" "$WORK/react/$COMP.css"; css="<link rel=\"stylesheet\" href=\"react-$fw.css\">"; cp "$OUT/$fw-react-$COMP.css" "$OUT/react-$fw.css"; fi
    printf '{ "extends": "../../react-harness/tsconfig.json", "files": ["./%s.tsx", "../../react-harness/env.d.ts"] }\n' "$COMP" > "$WORK/react/tsconfig.json"
    printf "import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport C from './%s'\ncreateRoot(document.getElementById('root')!).render(<C />)\n" "$COMP" > "$WORK/react/main.tsx"
    (cd "$PROOF" && npx esbuild "$WORK/react/main.tsx" --bundle --jsx=automatic --outfile="$OUT/react-$fw.js" --define:process.env.NODE_ENV='"production"' --log-level=error)
    echo "<!doctype html><html><head><meta charset=utf-8>$head$css</head><body style=\"max-width:720px;margin:24px auto\"><div id=root></div><script src=\"react-$fw.js\"></script></body></html>" > "$OUT/react-$fw.html"
    # Vue: the standalone component as Form.vue in the work root, built by
    # Vite with the builder's plugin-vue and Vue (see vue-harness/).
    cp "$OUT/$fw-vue-standalone-$COMP.vue" "$WORK/vue/Form.vue"
    cp "$PROOF/vue-harness/main.ts" "$WORK/vue/main.ts"
    HEAD_TAG="$head" python3 - "$PROOF/vue-harness/index.html" "$WORK/vue/index.html" <<'PY'
import os, sys
open(sys.argv[2], 'w').write(open(sys.argv[1]).read().replace('<!-- FG_HEAD -->', os.environ['HEAD_TAG']))
PY
    (cd "$WORK/vue" && FG_VUE_ROOT="$WORK/vue" node "$BUILDER_NM/vite/bin/vite.js" build --config "$PROOF/vue-harness/vite.config.mjs" --outDir "$OUT/vue-$fw" --emptyOutDir --base ./ > "$WORK/vite-$fw.log" 2>&1) || { echo "vue-$fw: VITE BUILD FAILED"; cat "$WORK/vite-$fw.log" | head -20; }
  done
  for run in html-vanilla html-tailwind html-bootstrap5 react-vanilla react-tailwind react-bootstrap5 vue-vanilla vue-tailwind vue-bootstrap5; do
    k=${run%%-*}; fw=${run#*-}
    case $k in
      html) url="http://$FG_HOST:$FG_STATIC_PORT/$fw-html-$HTML.html" ;;
      react) url="http://$FG_HOST:$FG_STATIC_PORT/react-$fw.html" ;;
      vue) url="http://$FG_HOST:$FG_STATIC_PORT/vue-$fw/index.html" ;;
    esac
    drive "$run" "$url" "$k"
  done
  stop_bg static
fi

if [ "$ONLY" != web ]; then
  for fw in vanilla tailwind bootstrap5; do
    rm -f "$OUT/res-blazor-$fw.json"
    blazor_prepare "$fw" "$COMP" "$OUT"
    build=$(blazor_build "$WORK/matrix-blazor-$fw.log" | head -5 | tr '\n' ' ')
    echo -n "$build"
    if echo "$build" | grep -q " error "; then echo "blazor-$fw: BUILD FAILED DIFFERS"; continue; fi
    # Run the built app directly (no "dotnet run" wrapper process, so the pid
    # is the server's); Development keeps the scoped-CSS bundle served.
    stop_bg blazor
    (cd "$BLAZOR" && ASPNETCORE_ENVIRONMENT=Development start_bg blazor dotnet bin/Debug/net8.0/FgProof.dll --urls "http://0.0.0.0:$FG_BLAZOR_PORT")
    wait_http "http://$FG_HOST:$FG_BLAZOR_PORT/" 60 || { echo "blazor-$fw: SERVER DID NOT START DIFFERS"; stop_bg blazor; continue; }
    drive "blazor-$fw" "http://$FG_HOST:$FG_BLAZOR_PORT/" blazor
    stop_bg blazor
  done
fi
echo "CHECK-DONE"
