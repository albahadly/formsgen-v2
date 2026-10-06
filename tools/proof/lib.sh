#!/bin/bash
# Shared defaults and helpers for the verification toolkit. Every script
# sources this file first:  source "$(dirname "$0")/lib.sh"
#
# Paths are derived from this file's location so the repository can live
# anywhere. Everything can be overridden from the environment (see README).

PROOF=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT=$(cd "$PROOF/../.." && pwd)
WORK=$PROOF/work
mkdir -p "$WORK"
BUILDER_NM=$ROOT/apps/builder/node_modules
BLAZOR=$PROOF/blazor-proof/FgProof

# How a browser reaches servers started on this machine. In the cloud
# container (recognisable by its agent proxy) localhost is not reachable from
# the browser; the host is 192.0.2.2 there.
if [ -z "${FG_HOST:-}" ]; then
  if [ -n "${HTTPS_PROXY:-}" ]; then FG_HOST=192.0.2.2; else FG_HOST=127.0.0.1; fi
fi
: "${FG_STATIC_PORT:=4180}"   # static-server.mjs serving the exports
: "${FG_BLAZOR_PORT:=5139}"   # the Blazor host
: "${FG_SUBMIT_PORT:=4280}"   # sample server the scenarios read back from
: "${FG_CAPTCHA_PORT:=4281}"  # sample server with TURNSTILE_SECRET (spam demo)
export FG_HOST FG_STATIC_PORT FG_BLAZOR_PORT FG_SUBMIT_PORT FG_CAPTCHA_PORT

# When the outbound proxy is present, browsers must trust its CA for the CDN
# loads (Leaflet, Tailwind, Turnstile): the SPKI hash goes to Chromium's
# --ignore-certificate-errors-spki-list. TLS verification itself stays on.
if [ -z "${PROXY_CA_SPKI:-}" ] && [ -f /root/.ccr/agent-proxy-ca.crt ]; then
  PROXY_CA_SPKI=$(openssl x509 -in /root/.ccr/agent-proxy-ca.crt -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64)
  export PROXY_CA_SPKI
fi

# The container ships Chromium; Playwright's own download is never run.
if [ -z "${PLAYWRIGHT_CHROMIUM:-}" ] && [ -x /opt/pw-browsers/chromium ]; then
  export PLAYWRIGHT_CHROMIUM=/opt/pw-browsers/chromium
fi

# start_bg <name> <command...>: run a server in the background, detached from
# this shell, logging to work/<name>.log with its pid in work/<name>.pid.
start_bg() {
  local name=$1; shift
  setsid nohup "$@" > "$WORK/$name.log" 2>&1 < /dev/null &
  echo $! > "$WORK/$name.pid"
}

# stop_bg <name>: stop what start_bg started (the process and its children),
# by pid only: never pkill -f, which can match the calling shell.
stop_bg() {
  local name=$1 pid
  [ -f "$WORK/$name.pid" ] || return 0
  pid=$(cat "$WORK/$name.pid")
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    pkill -P "$pid" 2>/dev/null
    kill "$pid" 2>/dev/null
    sleep 1
    kill -9 "$pid" 2>/dev/null
  fi
  rm -f "$WORK/$name.pid"
}

# wait_http <url> [seconds]: wait until the URL answers (default 60 s).
wait_http() {
  local url=$1 seconds=${2:-60} i
  for ((i = 0; i < seconds; i++)); do
    curl -s -o /dev/null "$url" && return 0
    sleep 1
  done
  echo "lib: $url did not answer within ${seconds}s" >&2
  return 1
}

# blazor_prepare <framework> <Component> <outdir>: put one exported Blazor
# component into the host project. The component files go to
# Components/Proof/ (ignored by git); App.razor and Pages/Home.razor are
# rendered from their .template files: the framework's CDN tag replaces
# <!-- FG_HEAD --> (nothing for vanilla) and __COMPONENT__ names the form.
blazor_prepare() {
  local fw=$1 comp=$2 out=$3 head
  rm -rf "$BLAZOR/Components/Proof"
  mkdir -p "$BLAZOR/Components/Proof"
  cp "$out/$fw-blazor-$comp.razor" "$BLAZOR/Components/Proof/$comp.razor"
  [ -f "$out/$fw-blazor-$comp.razor.css" ] && cp "$out/$fw-blazor-$comp.razor.css" "$BLAZOR/Components/Proof/$comp.razor.css"
  case $fw in
    tailwind) head='<script src="https://cdn.tailwindcss.com"></script>' ;;
    bootstrap5) head='<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />' ;;
    *) head='' ;;
  esac
  FG_HEAD_TAG="$head" FG_COMPONENT="$comp" python3 - "$BLAZOR" <<'PY'
import os, sys
p = sys.argv[1]
app = open(f'{p}/Components/App.razor.template', encoding='utf-8-sig').read().replace('<!-- FG_HEAD -->', os.environ['FG_HEAD_TAG'])
open(f'{p}/Components/App.razor', 'w').write(app)
home = open(f'{p}/Components/Pages/Home.razor.template', encoding='utf-8-sig').read().replace('__COMPONENT__', os.environ['FG_COMPONENT'])
open(f'{p}/Components/Pages/Home.razor', 'w').write(home)
PY
}

# blazor_cleanup: remove the per-run component and the rendered pages.
blazor_cleanup() {
  rm -rf "$BLAZOR/Components/Proof" "$BLAZOR/Components/App.razor" "$BLAZOR/Components/Pages/Home.razor"
}

# blazor_build <logfile>: build the host; prints the error/warning summary
# lines with the project path stripped; returns dotnet's status.
blazor_build() {
  local log=$1 status
  (cd "$BLAZOR" && dotnet build > "$log" 2>&1 < /dev/null)
  status=$?
  grep -E " error | warning |Error\(s\)|Warning\(s\)" "$log" | sed "s#$BLAZOR/##g" | sort -u | cut -c1-260
  return $status
}
