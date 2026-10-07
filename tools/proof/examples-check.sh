#!/bin/bash
# Usage: examples-check.sh [outdir]
#   env ONLY=web     only the ten HTML/React/Vue runtimes
#   env ONLY=blazor  only the three Blazor runtimes
#
# Proves the example projects (examples/): builds the React and Vue apps and
# the Blazor app as a developer would, serves them, drives each of the 13
# runtimes (HTML x3, React x3, Vue x3 + the @formsgen/renderer variant,
# Blazor x3) with e2e/event-registration.mjs and compares what the scenario
# saw with the HTML vanilla run. The sample server (4280) is started when it
# is not already answering. Results: <outdir>/res-<run>.json (+ err-<run>.txt,
# shots/); prints "<run>: IDENTICAL" or "<run>: DIFFERS: …" per run and
# CHECK-DONE at the end; everything also goes to <outdir>/check.log.
set -u
source "$(dirname "$0")/lib.sh"
OUT=${1:-$WORK/examples}
mkdir -p "$OUT/shots"
OUT=$(cd "$OUT" && pwd)
ONLY=${ONLY:-}
EX=$ROOT/examples
E2E=$PROOF/e2e/event-registration.mjs
: "${FG_REACT_PORT:=4181}"
: "${FG_VUE_PORT:=4182}"
exec > >(tee -a "$OUT/check.log") 2>&1

cleanup() { stop_bg ex-html; stop_bg ex-react; stop_bg ex-vue; stop_bg ex-blazor; stop_bg ex-submit; }
trap cleanup EXIT

# The sample server the forms post to (and the scenario reads back from).
if ! curl -s -o /dev/null "http://$FG_HOST:$FG_SUBMIT_PORT/submissions"; then
  mkdir -p "$WORK/examples-subs"
  start_bg ex-submit node "$ROOT/packages/submit-server/server.mjs" --port "$FG_SUBMIT_PORT" --dir "$WORK/examples-subs"
  wait_http "http://$FG_HOST:$FG_SUBMIT_PORT/submissions" 20 || { echo "sample server did not start"; exit 1; }
fi

# Compare a result with the HTML vanilla baseline: "errors" and "extra" are
# shown separately, whitespace is normalised, the first diff lines are printed.
norm='import json,sys,re;d=json.load(open(sys.argv[1]));e=d.pop("errors",[]);x=d.pop("extra",{});print("errors:",e,"extra:",x,file=sys.stderr);s=re.sub(r"\s+","",json.dumps(d,indent=1));print(s.replace(",",",\n"))'
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
  (cd "$PROOF" && node "$E2E" "$2" "$3" "$OUT/shots/$1.png" > "$OUT/res-$1.json" 2> "$OUT/err-$1.txt")
  echo -n "$1: "; cmp "$OUT/res-$1.json" 2>&1 | tr '\n' ' '; echo
}

if [ "$ONLY" != blazor ]; then
  echo "building the React and Vue examples"
  (cd "$ROOT" && pnpm --filter formsgen-example-react build && pnpm --filter formsgen-example-vue build) > "$WORK/examples-build.log" 2>&1 \
    || { echo "BUILD FAILED (log: $WORK/examples-build.log)"; tail -20 "$WORK/examples-build.log"; exit 1; }
  start_bg ex-html node "$PROOF/static-server.mjs" "$EX/html" "$FG_STATIC_PORT"
  start_bg ex-react node "$PROOF/static-server.mjs" "$EX/react/dist" "$FG_REACT_PORT"
  start_bg ex-vue node "$PROOF/static-server.mjs" "$EX/vue/dist" "$FG_VUE_PORT"
  wait_http "http://$FG_HOST:$FG_STATIC_PORT/vanilla/event_registration.html" 20 || true
  wait_http "http://$FG_HOST:$FG_REACT_PORT/index.html" 20 || true
  wait_http "http://$FG_HOST:$FG_VUE_PORT/index.html" 20 || true
  for fw in vanilla tailwind bootstrap5; do
    drive "html-$fw" "http://$FG_HOST:$FG_STATIC_PORT/$fw/event_registration.html" html
  done
  for fw in vanilla tailwind bootstrap5; do
    drive "react-$fw" "http://$FG_HOST:$FG_REACT_PORT/index.html?css=$fw" react
  done
  for fw in vanilla tailwind bootstrap5 renderer; do
    drive "vue-$fw" "http://$FG_HOST:$FG_VUE_PORT/index.html?css=$fw" vue
  done
  stop_bg ex-html; stop_bg ex-react; stop_bg ex-vue
fi

if [ "$ONLY" != web ]; then
  APP=$EX/dotnet/EventRegistration
  echo "building the Blazor example"
  (cd "$APP" && dotnet build > "$WORK/examples-blazor-build.log" 2>&1 < /dev/null)
  grep -E " error | warning |Error\(s\)|Warning\(s\)" "$WORK/examples-blazor-build.log" | sed "s#$APP/##g" | sort -u | cut -c1-200
  if grep -q " error " "$WORK/examples-blazor-build.log"; then echo "blazor: BUILD FAILED"; exit 1; fi
  (cd "$APP" && ASPNETCORE_ENVIRONMENT=Development start_bg ex-blazor dotnet bin/Debug/net8.0/EventRegistration.dll --urls "http://0.0.0.0:$FG_BLAZOR_PORT")
  wait_http "http://$FG_HOST:$FG_BLAZOR_PORT/" 60 || { echo "blazor: SERVER DID NOT START"; exit 1; }
  drive blazor-vanilla "http://$FG_HOST:$FG_BLAZOR_PORT/" blazor
  drive blazor-tailwind "http://$FG_HOST:$FG_BLAZOR_PORT/tailwind" blazor
  drive blazor-bootstrap5 "http://$FG_HOST:$FG_BLAZOR_PORT/bootstrap5" blazor
  stop_bg ex-blazor
fi
echo "CHECK-DONE"
