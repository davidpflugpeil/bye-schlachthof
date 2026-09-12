#!/usr/bin/env bash
# Exercises every endpoint of the API.
#
#   ./scripts/check-api.sh [base-url] [report-token]
#
# Example: ./scripts/check-api.sh https://example.org secret
#
# The write tests store twelve reports and therefore need the hourly limit's
# full headroom. A second run within the same hour from the same address gets
# 429 back and reports failures that are not defects.
set -uo pipefail

BASE="${1:-http://localhost:3000}"
TOKEN="${2:-}"
API="$BASE/api/v1"

passed=0
failed=0

if [ -n "$TOKEN" ]; then
  TOKEN_HEADER=(-H "X-Report-Token: $TOKEN")
else
  TOKEN_HEADER=()
fi

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    printf '  \033[32m✓\033[0m %-46s %s\n' "$name" "$actual"
    passed=$((passed + 1))
  else
    printf '  \033[31m✗\033[0m %-46s %s (expected %s)\n' "$name" "$actual" "$expected"
    failed=$((failed + 1))
  fi
}

status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "Checking API: $API"
[ -n "$TOKEN" ] && echo "With token" || echo "Without token"
echo

echo "Read endpoints"
check "GET /meta"                     200 "$(status "$API/meta")"
check "GET /openapi"                  200 "$(status "$API/openapi")"
check "GET /situation"                200 "$(status "$API/situation")"
check "GET /streets?days=7"           200 "$(status "$API/streets?days=7")"
check "GET /reports?limit=3"          200 "$(status "$API/reports?limit=3")"
check "GET /addresses?q=Zenettistr"   200 "$(status "$API/addresses?q=Zenettistra%C3%9Fe")"
check "GET /addresses (too short)"    200 "$(status "$API/addresses?q=ab")"

echo
echo "Preflight (CORS)"
check "OPTIONS /reports"              204 "$(status -X OPTIONS "$API/reports")"
check "OPTIONS /situation"            204 "$(status -X OPTIONS "$API/situation")"

echo
echo "Writing — error cases"
check "POST without severity"         400 "$(status -X POST "$API/reports" -H 'Content-Type: application/json' -d '{"latitude":48.1258,"longitude":11.5528}')"
check "POST without location"         400 "$(status -X POST "$API/reports" -H 'Content-Type: application/json' -d '{"severity":3}')"
check "POST unknown address"          422 "$(status -X POST "$API/reports" -H 'Content-Type: application/json' -d '{"severity":3,"address":"Qxzyv Nichtstrasse 999"}')"
check "POST unreadable body"          400 "$(status -X POST "$API/reports" -H 'Content-Type: application/json' -d '{broken')"
if [ -n "$TOKEN" ]; then
  # A wrong token must not cost the report — it only forfeits the raised limit.
  check "POST wrong token still stores" 201 "$(status -X POST "$API/reports" -H 'Content-Type: application/json' -H 'X-Report-Token: wrong' -d '{"severity":3,"latitude":48.1258,"longitude":11.5528}')"
fi

echo
echo "Writing — success cases"
check "POST coordinates (JSON)"       201 "$(status -X POST "$API/reports" ${TOKEN_HEADER[@]+"${TOKEN_HEADER[@]}"} -H 'Content-Type: application/json' -d '{"severity":2,"latitude":48.1258,"longitude":11.5528,"odorType":"rotten","duration":"short","comment":"Prüflauf der Schnittstelle"}')"
check "POST form data"                201 "$(status -X POST "$API/reports" ${TOKEN_HEADER[@]+"${TOKEN_HEADER[@]}"} -H 'Content-Type: application/x-www-form-urlencoded' -d 'severity=3&latitude=48.1273&longitude=11.5602')"
check "POST address instead of coords" 201 "$(status -X POST "$API/reports" ${TOKEN_HEADER[@]+"${TOKEN_HEADER[@]}"} -H 'Content-Type: application/json' -d '{"severity":2,"address":"Tumblingerstraße, München"}')"

# Field shapes a hand-built shortcut produces. Each of these used to be
# rejected with location_missing.
check "POST lat/lon short names"      201 "$(status -X POST "$API/reports" ${TOKEN_HEADER[@]+"${TOKEN_HEADER[@]}"} -H 'Content-Type: application/json' -d '{"severity":2,"lat":48.1258,"lon":11.5528}')"
check "POST capitalised keys"         201 "$(status -X POST "$API/reports" ${TOKEN_HEADER[@]+"${TOKEN_HEADER[@]}"} -H 'Content-Type: application/json' -d '{"Intensity":3,"Latitude":"48.1258","Longitude":"11.5528"}')"
check "POST location as one string"   201 "$(status -X POST "$API/reports" ${TOKEN_HEADER[@]+"${TOKEN_HEADER[@]}"} -H 'Content-Type: application/json' -d '{"severity":2,"location":"48.1258, 11.5528"}')"
check "POST nested location object"   201 "$(status -X POST "$API/reports" ${TOKEN_HEADER[@]+"${TOKEN_HEADER[@]}"} -H 'Content-Type: application/json' -d '{"severity":2,"location":{"latitude":48.1258,"longitude":11.5528}}')"
check "POST decimal comma"            201 "$(status -X POST "$API/reports" ${TOKEN_HEADER[@]+"${TOKEN_HEADER[@]}"} -H 'Content-Type: application/json' -d '{"severity":2,"latitude":"48,1258","longitude":"11,5528"}')"

# The house number is stored but admin-only. It must never reach a public
# response — neither the created report nor the public list.
check "POST response hides house number"  absent "$(curl -s -X POST "$API/reports" ${TOKEN_HEADER[@]+"${TOKEN_HEADER[@]}"} -H 'Content-Type: application/json' -d '{"severity":2,"latitude":48.12584,"longitude":11.55283}' | grep -q -i 'housenumber\|house_number' && echo present || echo absent)"
check "GET /reports hides house number"   absent "$(curl -s "$API/reports?limit=50" | grep -q -i 'housenumber\|house_number' && echo present || echo absent)"

KEY="check-$(date +%s)-$RANDOM"
check "POST with Idempotency-Key"     201 "$(status -X POST "$API/reports" ${TOKEN_HEADER[@]+"${TOKEN_HEADER[@]}"} -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" -d '{"severity":4,"latitude":48.1232,"longitude":11.5560}')"
check "POST same key (no second row)" 200 "$(status -X POST "$API/reports" ${TOKEN_HEADER[@]+"${TOKEN_HEADER[@]}"} -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" -d '{"severity":4,"latitude":48.1232,"longitude":11.5560}')"

echo
echo "Sample response"
curl -s -X POST "$API/reports" ${TOKEN_HEADER[@]+"${TOKEN_HEADER[@]}"} -H 'Content-Type: application/json' \
  -d '{"severity":4,"latitude":48.1252,"longitude":11.5559}' |
  python3 -m json.tool 2>/dev/null | head -30

echo
printf 'Result: \033[32m%d passed\033[0m' "$passed"
if [ "$failed" -gt 0 ]; then
  printf ', \033[31m%d failed\033[0m\n' "$failed"
  exit 1
fi
printf '\n'
