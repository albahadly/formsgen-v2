#!/bin/bash
# Usage: element-check.sh <schema.json> <e2e.mjs> <tag>
#
# The web component as a thirteenth runtime: the CLI exports the demo with the
# "web-component" target (the host page, the project file and the renderer's
# element bundle) into work/<tag>-element, static-server.mjs serves it, the
# scenario script drives the page (kind "element") and the result is compared
# with the HTML vanilla result of the same demo's matrix run
# (work/<tag>/res-html-vanilla.json), exactly as run-matrix.sh compares.
# Needs the renderer's element build and the CLI build (pnpm -r build), and
# the sample server on FG_SUBMIT_PORT for demos that post.
set -u
source "$(dirname "$0")/lib.sh"
if [ $# -lt 3 ]; then echo "usage: element-check.sh <schema.json> <e2e.mjs> <tag>" >&2; exit 2; fi
SCHEMA=$1; E2E=$(cd "$(dirname "$2")" && pwd)/$(basename "$2"); TAG=$3
OUT=$WORK/$TAG-element
BASE=$WORK/$TAG/res-html-vanilla.json
[ -f "$BASE" ] || { echo "element-check: no baseline $BASE (run the demo's matrix first)" >&2; exit 2; }
rm -rf "$OUT"; mkdir -p "$OUT/shots"
sed "s#FG_HOST#$FG_HOST#g" "$SCHEMA" > "$OUT/demo.json"
node "$ROOT/packages/cli/dist/formsgen.mjs" export "$OUT/demo.json" --target web-component --out "$OUT/site" > "$OUT/export.log" 2>&1 || { cat "$OUT/export.log"; exit 1; }
[ -f "$OUT/site/formsgen-element.js" ] || { echo "element-check: the export carries no element bundle (build the renderer first)" >&2; exit 1; }
page=$(ls "$OUT/site"/*.html | head -1)

cleanup() { stop_bg static-element; }
trap cleanup EXIT
stop_bg static-element
start_bg static-element node "$PROOF/static-server.mjs" "$OUT/site" "$FG_STATIC_PORT"
wait_http "http://$FG_HOST:$FG_STATIC_PORT/" 20 || true

norm='import json,sys,re;d=json.load(open(sys.argv[1]));e=d.pop("errors",[]);print("errors:",e,file=sys.stderr);s=re.sub(r"\s+","",json.dumps(d,indent=1));s=re.sub(r"\"size\":\d+","\"size\":N",s);print(s.replace(",",",\n"))'
(cd "$PROOF" && node "$E2E" "http://$FG_HOST:$FG_STATIC_PORT/$(basename "$page")" element "$OUT/shots/$TAG-element.png" > "$OUT/res-element.json" 2> "$OUT/err-element.txt")
echo -n "element: "
if ! python3 -c "import json,sys;json.load(open(sys.argv[1]))" "$OUT/res-element.json" 2>/dev/null; then echo "NO RESULT (see $OUT/err-element.txt)"; exit 1; fi
if diff <(python3 -c "$norm" "$BASE" 2>/dev/null) <(python3 -c "$norm" "$OUT/res-element.json") > /dev/null; then
  echo "IDENTICAL"
else
  echo "DIFFERS:"; diff <(python3 -c "$norm" "$BASE" 2>/dev/null) <(python3 -c "$norm" "$OUT/res-element.json") | head -20
  exit 1
fi
