#!/bin/bash
# Usage: parity-check.sh [outdir]
#   env ONLY=metrics   skip the screenshots
#   env WIDTHS=1200,390   the widths to measure at (default)
#
# Proves that the three CSS flavours (vanilla, Tailwind, Bootstrap 5) render
# the same form: exports the kitchen sink and the examples template with the
# HTML target in each flavour, serves them, measures each page with
# e2e/metrics.mjs at every width and compares the flavours with
# metrics-compare.mjs (colours and font families excluded). Prints
# "<form>@<width>: IDENTICAL" or "<form>@<width>: N DIFFERING METRICS" (the
# table is in <outdir>/compare-<form>-<width>.md), then the screenshots
# (e2e/shots.mjs: 390/768/1200, dark, error state) under <outdir>/shots/,
# and CHECK-DONE. Everything also goes to <outdir>/parity.log.
set -u
source "$(dirname "$0")/lib.sh"
OUT=${1:-$WORK/parity}
mkdir -p "$OUT/pages" "$OUT/shots"
OUT=$(cd "$OUT" && pwd)
WIDTHS=${WIDTHS:-1200,390}
ONLY=${ONLY:-}
exec > >(tee -a "$OUT/parity.log") 2>&1
cleanup() { stop_bg parity-static; }
trap cleanup EXIT

for form in ks ex; do
  case $form in
    ks) schema=$ROOT/fixtures/kitchen-sink.formsgen.json; base=kitchen_sink ;;
    ex) schema=$ROOT/examples/form/event-registration.formsgen.json; base=event_registration ;;
  esac
  bash "$PROOF/export-demo.sh" "$schema" "$OUT/$form" > "$OUT/export-$form.log" 2>&1 || { echo "export of $form failed (log: $OUT/export-$form.log)"; exit 1; }
  for fw in vanilla tailwind bootstrap5; do cp "$OUT/$form/$fw-html-$base.html" "$OUT/pages/$form-$fw.html"; done
done

start_bg parity-static node "$PROOF/static-server.mjs" "$OUT/pages" "$FG_STATIC_PORT"
wait_http "http://$FG_HOST:$FG_STATIC_PORT/ks-vanilla.html" 20 || { echo "static server did not start"; exit 1; }

status=0
for form in ks ex; do
  for width in ${WIDTHS//,/ }; do
    for fw in vanilla tailwind bootstrap5; do
      (cd "$PROOF" && node e2e/metrics.mjs "http://$FG_HOST:$FG_STATIC_PORT/$form-$fw.html" "$OUT/metrics-$form-$fw-$width.json" "$width" > /dev/null 2> "$OUT/err-metrics-$form-$fw-$width.txt") || echo "$form-$fw@$width: METRICS FAILED (see err-metrics-$form-$fw-$width.txt)"
    done
    if node "$PROOF/metrics-compare.mjs" "$OUT/metrics-$form-vanilla-$width.json" "$OUT/metrics-$form-tailwind-$width.json" "$OUT/metrics-$form-bootstrap5-$width.json" > "$OUT/compare-$form-$width.md" 2>&1; then
      echo "$form@$width: IDENTICAL"
    else
      n=$(tail -1 "$OUT/compare-$form-$width.md" | grep -o '^[0-9]*')
      echo "$form@$width: ${n:-?} DIFFERING METRICS (compare-$form-$width.md)"
      status=1
    fi
  done
done

if [ "$ONLY" != metrics ]; then
  for form in ks ex; do
    for fw in vanilla tailwind bootstrap5; do
      (cd "$PROOF" && node e2e/shots.mjs "http://$FG_HOST:$FG_STATIC_PORT/$form-$fw.html" "$OUT/shots" "$form-$fw" > /dev/null 2> "$OUT/err-shots-$form-$fw.txt") || echo "$form-$fw: SCREENSHOTS FAILED"
    done
  done
  echo "screenshots: $(ls "$OUT/shots" | wc -l) files in $OUT/shots"
fi
echo "CHECK-DONE"
exit $status
