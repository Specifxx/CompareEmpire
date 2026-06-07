#!/usr/bin/env bash
# CompareEmpire smoke test — hits every running app and checks key pages render
# with the right content. Start the apps first (npm run dev), then run this.
#
#   bash scripts/smoke-test.sh
set -uo pipefail

pass=0; fail=0
ck() { # ck "name" "url" "needle (literal)"
  if curl -s -m 25 "$2" | grep -qF "$3"; then echo "  ✓ $1"; pass=$((pass+1));
  else echo "  ✗ $1  (missing: $3)"; fail=$((fail+1)); fi
}
co() { # co "name" "url"  (expect HTTP 200)
  local c; c=$(curl -s -o /dev/null -m 25 -w '%{http_code}' "$2")
  if [ "$c" = "200" ]; then echo "  ✓ $1 (200)"; pass=$((pass+1));
  else echo "  ✗ $1 ($c)"; fail=$((fail+1)); fi
}

echo "== CompareEmpire hub (3000) =="
co  "home"        "http://127.0.0.1:3000/"
ck  "lists DexCompare"    "http://127.0.0.1:3000/" "DexCompare"
ck  "lists LaptopCompare" "http://127.0.0.1:3000/" "LaptopCompare"

echo "== DexCompare (3003) =="
co  "home"   "http://127.0.0.1:3003/"
co  "browse" "http://127.0.0.1:3003/browse?priced=1&sort=price_desc"
ck  "search" "http://127.0.0.1:3003/api/search?q=charizard" "Charizard"

echo "== CameraCompare (3002) =="
co  "home"   "http://127.0.0.1:3002/"
co  "brand"  "http://127.0.0.1:3002/browse?set=SONY"

echo "== CarCompare (3004) =="
co  "home"   "http://127.0.0.1:3004/"
co  "fuel"   "http://127.0.0.1:3004/browse?type=Electric"

echo "== PhoneCompare (3005) =="
co  "home"   "http://127.0.0.1:3005/"
co  "brand"  "http://127.0.0.1:3005/browse?set=APPLE"

echo "== LaptopCompare (3006) =="
co  "home"   "http://127.0.0.1:3006/"
co  "os"     "http://127.0.0.1:3006/browse?type=macOS"

echo ""
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
