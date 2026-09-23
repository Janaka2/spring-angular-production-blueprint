#!/usr/bin/env bash
# Loads the showcase data (scripts/demo-data/showcase.json) for the public demo account through the real API, so every
# write is authorized, validated and audited exactly like a user's. Safe to re-run: assets whose DEMO- tag already
# exists are skipped. Dates are relative to today, so overdue / due soon / warranty ending always look current.
#
#   scripts/seed-demo.sh            seed production (https://assetcare.janaka.me) as the "demo" user
#
# There is no in-place reset: asset tags stay unique per owner even after archiving, and archived assets are kept
# (ADR-010). To start the demo over, give the demo account a fresh identity (RUNBOOK "Reset the demo data") and re-run.
#
# Credentials: the demo password and the assetcare-seed client secret are read from the Kubernetes Secret
# assetcare-demo-accounts (namespace $NAMESPACE) unless DEMO_PASSWORD / SEED_CLIENT_SECRET are set.
# Local stack example (development realm, no client secret):
#   BASE_URL=http://localhost:8080 KC_TOKEN_URL=http://localhost:8081/realms/assetcare/protocol/openid-connect/token \
#   SEED_CLIENT_ID=assetcare-dev-cli DEMO_USER=bob DEMO_PASSWORD=bob-dev-password scripts/seed-demo.sh
set -euo pipefail

BASE="${BASE_URL:-https://assetcare.janaka.me}"
TOKEN_URL="${KC_TOKEN_URL:-$BASE/auth/realms/assetcare/protocol/openid-connect/token}"
CLIENT_ID="${SEED_CLIENT_ID:-assetcare-seed}"
NAMESPACE="${NAMESPACE:-assetcare}"
USERNAME="${DEMO_USER:-demo}"
DIR="$(cd "$(dirname "$0")/demo-data" && pwd)"
DATA="${DEMO_DATA:-$DIR/showcase.json}"
RUN="$(date +%s)"

for tool in curl jq; do command -v "$tool" >/dev/null || { echo "needs $tool" >&2; exit 1; }; done

from_secret() { kubectl -n "$NAMESPACE" get secret assetcare-demo-accounts -o jsonpath="{.data.$1}" 2>/dev/null | base64 -d; }
PASSWORD="${DEMO_PASSWORD:-$(from_secret demo)}"
SECRET="${SEED_CLIENT_SECRET:-}"
[[ -z "$SECRET" && "$CLIENT_ID" == "assetcare-seed" ]] && SECRET="$(from_secret seed-client-secret)"
[[ -n "$PASSWORD" ]] || { echo "no password for $USERNAME: set DEMO_PASSWORD or give kubectl access to the Secret" >&2; exit 1; }

TOKEN=""
login() {
  local args=(-d grant_type=password -d "client_id=$CLIENT_ID" --data-urlencode "username=$USERNAME" --data-urlencode "password=$PASSWORD")
  [[ -n "$SECRET" ]] && args+=(--data-urlencode "client_secret=$SECRET")
  TOKEN="$(curl -s --fail-with-body "${args[@]}" "$TOKEN_URL" | jq -r .access_token)" \
    || { echo "login as $USERNAME failed at $TOKEN_URL" >&2; exit 1; }
}

# api METHOD PATH [curl args...]: prints the body; stops the script with the Problem Details on any non-2xx
api() {
  local method="$1" path="$2"; shift 2
  local out code
  out="$(curl -s -w $'\n%{http_code}' -X "$method" -H "Authorization: Bearer $TOKEN" "$@" "$BASE$path")"
  code="${out##*$'\n'}"; out="${out%$'\n'*}"
  if [[ "$code" != 2* ]]; then echo "$method $path -> $code: $out" >&2; exit 1; fi
  printf '%s' "$out"
}
json() { api "$1" "$2" -H 'Content-Type: application/json' -d "$3" "${@:4}"; }

# offset in days -> ISO date; null stays null
DATES='def day: if . == null then null else (now + . * 86400 | strftime("%Y-%m-%d")) end;'

login
CATEGORIES="$(api GET /api/v1/categories | jq 'if type == "array" then . else .items end | map(select(.active)) | map({(.code): .id}) | add')"
missing="$(jq -r --argjson cats "$CATEGORIES" '[.assets[].category | select($cats[.] == null)] | unique | join(", ")' "$DATA")"
[[ -z "$missing" ]] || { echo "category not found or inactive at $BASE: $missing (nothing was changed)" >&2; exit 1; }

find_asset() {  # tag -> id or empty; archived assets count, because their tags stay taken
  api GET "/api/v1/assets?search=$1&includeArchived=true&size=100" | jq -r --arg t "$1" '.items[] | select(.assetTag == $t) | .id' | head -1
}

created=0; skipped=0
count="$(jq '.assets | length' "$DATA")"
for i in $(seq 0 $((count - 1))); do
  login   # tokens are short-lived; one login per asset keeps a slow run from expiring mid-way
  a="$(jq ".assets[$i]" "$DATA")"
  tag="$(jq -r .tag <<<"$a")"
  archived="$(jq -r '.archived // false' <<<"$a")"
  if [[ -n "$(find_asset "$tag")" ]]; then echo "skip  $tag (exists)"; skipped=$((skipped + 1)); continue; fi

  body="$(jq -c --argjson cats "$CATEGORIES" "$DATES"' {
      name, description, assetTag: .tag, serialNumber: .serial, categoryId: $cats[.category],
      manufacturer, model, purchaseDate: (.purchase | day), purchasePrice: .price, currency,
      warrantyUntil: (.warranty | day), location, notes }' <<<"$a")"
  asset="$(json POST /api/v1/assets "$body" -H "Idempotency-Key: seed-${tag,,}-$RUN")"
  id="$(jq -r .id <<<"$asset")"

  items="$(jq '.maintenance // [] | length' <<<"$a")"
  for m in $(seq 0 $((items - 1))); do
    item="$(jq ".maintenance[$m]" <<<"$a")"
    req="$(jq -c "$DATES"' {type, description, dueDate: (.due | day), recurrence, cost, currency, serviceProvider, notes}' <<<"$item")"
    item_id="$(json POST "/api/v1/assets/$id/maintenance" "$req" | jq -r .id)"
    desc="$(jq -r .description <<<"$item")"
    done_n="$(jq '.completions // [] | length' <<<"$item")"
    for c in $(seq 0 $((done_n - 1))); do
      # a recurring item's next occurrence is a new item: complete whichever planned one with this description is earliest
      item_id="$(api GET "/api/v1/assets/$id/maintenance" \
        | jq -r --arg d "$desc" 'if type == "array" then . else .items end | map(select(.status == "PLANNED" and .description == $d)) | sort_by(.dueDate) | .[0].id')"
      rec="$(jq -c "$DATES"" .completions[$c] | {performedOn: (.performedOn | day), performedBy, summary, cost, currency, notes}" <<<"$item")"
      json POST "/api/v1/maintenance/$item_id/complete" "$rec" >/dev/null
    done
    [[ "$(jq -r '.cancel // false' <<<"$item")" == true ]] && api DELETE "/api/v1/maintenance/$item_id" >/dev/null
  done

  records="$(jq '.serviceRecords // [] | length' <<<"$a")"
  for r in $(seq 0 $((records - 1))); do
    rec="$(jq -c "$DATES"" .serviceRecords[$r] | {performedOn: (.performedOn | day), performedBy, summary, cost, currency, notes}" <<<"$a")"
    json POST "/api/v1/assets/$id/service-records" "$rec" >/dev/null
  done

  for f in $(jq -r '.attachments // [] | .[]' <<<"$a"); do
    case "$f" in *.pdf) type=application/pdf;; *.png) type=image/png;; *.jpg) type=image/jpeg;; *) type=text/plain;; esac
    api POST "/api/v1/assets/$id/attachments" -F "file=@$DIR/files/$f;type=$type" >/dev/null
  done

  # lifecycle last: an archived or in-repair asset may refuse new children
  status="$(jq -r '.status // "ACTIVE"' <<<"$a")"
  if [[ "$status" != ACTIVE ]]; then
    version="$(jq -r .version <<<"$(api GET "/api/v1/assets/$id")")"
    json PATCH "/api/v1/assets/$id/status" "{\"status\":\"$status\"}" -H "If-Match: \"$version\"" >/dev/null
  fi
  [[ "$archived" == true ]] && api DELETE "/api/v1/assets/$id" >/dev/null

  label=""; [[ "$status" != ACTIVE ]] && label=", $status"; [[ "$archived" == true ]] && label=", archived"
  echo "added $tag ($items maintenance, $records records, $(jq '.attachments // [] | length' <<<"$a") files$label)"
  created=$((created + 1))
done
echo "done: $created added, $skipped skipped, for $USERNAME at $BASE"
