#!/usr/bin/env bash
# Launch every CompareEmpire app on its own port. Ctrl-C stops them all.
set -euo pipefail
cd "$(dirname "$0")/.."

declare -A PORTS=( [hub]=3000 [cameracompare]=3002 [dexcompare]=3003 [carcompare]=3004 [phonecompare]=3005 )

pids=()
for app in hub cameracompare dexcompare carcompare phonecompare; do
  port="${PORTS[$app]}"
  echo "▶ starting $app on http://localhost:$port"
  ( cd "apps/$app" && npx next dev -p "$port" ) &
  pids+=($!)
done

trap 'echo; echo "stopping…"; kill "${pids[@]}" 2>/dev/null || true' INT TERM
wait
