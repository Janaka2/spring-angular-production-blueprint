#!/usr/bin/env bash
# Smoke test a deployment: is it alive, is it ready, does it refuse anonymous API calls, is the OpenAPI document served.
#   scripts/smoke-test.sh http://localhost:8080
#   scripts/smoke-test.sh https://assetcare.example.com   (Kubernetes: the ingress exposes /actuator/health, /actuator/info and /api)
set -euo pipefail
BASE="${1:?base URL of the API}"
fail() { echo "FAIL: $*"; exit 1; }
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$@"; }

[[ "$(code "$BASE/actuator/health/liveness")" == "200" ]]  || fail "liveness"
[[ "$(code "$BASE/actuator/health/readiness")" == "200" ]] || fail "readiness (database?)"
[[ "$(code "$BASE/api/v1/assets")" == "401" ]]             || fail "anonymous request should be 401"
[[ "$(code "$BASE/v3/api-docs")" == "200" ]]               || fail "openapi document"
curl -s --max-time 10 "$BASE/actuator/info" | grep -q '"build"' || fail "build info"
echo "smoke test passed: $BASE"
