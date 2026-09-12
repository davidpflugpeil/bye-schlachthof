#!/usr/bin/env bash
# Exercises every endpoint of the API.
#
#   ./scripts/check-api.sh [base-url] [report-token]
#
# Example: ./scripts/check-api.sh https://example.org secret
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

# Solves the proof of work and returns the issued token, or nothing on
# failure. Python does the hashing — a shell loop would take far too long.
enrol() {
  local kind="${1:-web}"
  curl -s "$API/clients/challenge" | python3 -c "
import hashlib, json, sys, urllib.request

data = json.load(sys.stdin)
if not data.get('ok'):
    sys.exit(1)
task = data['challenge']
salt, target = task['salt'], task['challenge']

for number in range(task['maxNumber'] + 1):
    if hashlib.sha256(f'{salt}{number}'.encode()).hexdigest() == target:
        break
else:
    sys.exit(1)

body = json.dumps({**task, 'number': number, 'kind': '$kind'}).encode()
request = urllib.request.Request(
    '$API/clients', data=body, headers={'Content-Type': 'application/json'}
)
try:
    with urllib.request.urlopen(request) as response:
        print(json.load(response).get('token', ''))
except Exception:
    sys.exit(1)
"
}

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
echo "Enrollment"
CLIENT_TOKEN="$(enrol shortcut || true)"
if [ -n "$CLIENT_TOKEN" ]; then
  check "POST /clients (challenge solved)" "ok" "ok"
  CLIENT_HEADER=(-H "X-Client-Token: $CLIENT_TOKEN")
else
  check "POST /clients (challenge solved)" "ok" "failed"
  CLIENT_HEADER=()
fi
check "GET /clients/challenge"        200 "$(status "$API/clients/challenge")"
check "POST /clients unsolved"        400 "$(status -X POST "$API/clients" -H 'Content-Type: application/json' -d '{"salt":"x","challenge":"y","number":1,"expires":9999999999999,"signature":"z"}')"

echo
echo "Writing — error cases"
check "POST without severity"         400 "$(status -X POST "$API/reports" -H 'Content-Type: application/json' -d '{"latitude":48.1258,"longitude":11.5528}')"
check "POST without location"         400 "$(status -X POST "$API/reports" -H 'Content-Type: application/json' -d '{"severity":3}')"
check "POST unknown address"          422 "$(status -X POST "$API/reports" -H 'Content-Type: application/json' -d '{"severity":3,"address":"Qxzyv Nichtstrasse 999"}')"
check "POST unreadable body"          400 "$(status -X POST "$API/reports" -H 'Content-Type: application/json' -d '{broken')"
check "POST outside the area"         422 "$(status -X POST "$API/reports" -H 'Content-Type: application/json' -d '{"severity":3,"latitude":52.52,"longitude":13.405}')"
check "POST unknown client token"     401 "$(status -X POST "$API/reports" -H 'Content-Type: application/json' -H 'X-Client-Token: bs1.deadbeefdead.nope' -d '{"severity":3,"latitude":48.1258,"longitude":11.5528}')"
if [ -n "$TOKEN" ]; then
  check "POST wrong token"            401 "$(status -X POST "$API/reports" -H 'Content-Type: application/json' -H 'X-Report-Token: wrong' -d '{"severity":3,"latitude":48.1258,"longitude":11.5528}')"
fi

echo
echo "Writing — success cases"
check "POST coordinates (JSON)"       201 "$(status -X POST "$API/reports" "${TOKEN_HEADER[@]}" "${CLIENT_HEADER[@]}" -H 'Content-Type: application/json' -d '{"severity":2,"latitude":48.1258,"longitude":11.5528,"odorType":"rotten","duration":"short","comment":"Prüflauf der Schnittstelle"}')"
check "POST form data"                201 "$(status -X POST "$API/reports" "${TOKEN_HEADER[@]}" "${CLIENT_HEADER[@]}" -H 'Content-Type: application/x-www-form-urlencoded' -d 'severity=3&latitude=48.1273&longitude=11.5602')"
check "POST address instead of coords" 201 "$(status -X POST "$API/reports" "${TOKEN_HEADER[@]}" "${CLIENT_HEADER[@]}" -H 'Content-Type: application/json' -d '{"severity":2,"address":"Tumblingerstraße, München"}')"

KEY="check-$(date +%s)-$RANDOM"
check "POST with Idempotency-Key"     201 "$(status -X POST "$API/reports" "${TOKEN_HEADER[@]}" "${CLIENT_HEADER[@]}" -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" -d '{"severity":4,"latitude":48.1232,"longitude":11.5560}')"
check "POST same key (no second row)" 200 "$(status -X POST "$API/reports" "${TOKEN_HEADER[@]}" "${CLIENT_HEADER[@]}" -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" -d '{"severity":4,"latitude":48.1232,"longitude":11.5560}')"

echo
echo "Sample response"
curl -s -X POST "$API/reports" "${TOKEN_HEADER[@]}" "${CLIENT_HEADER[@]}" -H 'Content-Type: application/json' \
  -d '{"severity":4,"latitude":48.1252,"longitude":11.5559}' |
  python3 -m json.tool 2>/dev/null | head -30

echo
printf 'Result: \033[32m%d passed\033[0m' "$passed"
if [ "$failed" -gt 0 ]; then
  printf ', \033[31m%d failed\033[0m\n' "$failed"
  exit 1
fi
printf '\n'
