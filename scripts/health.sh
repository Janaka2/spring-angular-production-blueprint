#!/usr/bin/env bash
# One-screen health summary. Each line: OK / WARN / FAIL, what was checked, and the runbook section to open on failure.
#
#   scripts/health.sh                    local: compose services + API on localhost:8080
#   scripts/health.sh k8s [namespace]    a cluster: pods, probes, certificate, ingress, backup age, volumes, alerts
#   BASE_URL=https://host/api scripts/health.sh url    only the HTTP checks against a deployed API
set -uo pipefail
MODE="${1:-local}"; NS="${2:-assetcare}"; BASE="${BASE_URL:-http://localhost:8080}"
FAILS=0
ok()   { printf '  \033[32mOK  \033[0m %-52s %s\n' "$1" "${2:-}"; }
warn() { printf '  \033[33mWARN\033[0m %-52s %s\n' "$1" "${2:-}"; }
fail() { printf '  \033[31mFAIL\033[0m %-52s %s\n' "$1" "${2:-}"; FAILS=$((FAILS+1)); }
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 8 "$@" 2>/dev/null || echo 000; }
json() { curl -s --max-time 8 "$@" 2>/dev/null; }

http_checks() {
  echo "API at $BASE"
  [[ "$(code "$BASE/actuator/health/liveness")" == 200 ]]  && ok "liveness" || fail "liveness" "RUNBOOK: API pods restarting"
  [[ "$(code "$BASE/actuator/health/readiness")" == 200 ]] && ok "readiness (database reachable)" || fail "readiness" "RUNBOOK: readiness failing → dependency down"
  deps=$(json "$BASE/actuator/health/dependencies")
  for c in db storage identityProvider; do
    st=$(echo "$deps" | sed -n "s/.*\"$c\":{\"status\":\"\([A-Z_]*\)\".*/\1/p" | head -1)
    case "$st" in UP) ok "dependency: $c";; "") warn "dependency: $c" "not reported (endpoint exposed? details need auth)";; *) fail "dependency: $c is $st" "RUNBOOK: 401 for everyone / attachments failing";; esac
  done
  [[ "$(code "$BASE/api/v1/assets")" == 401 ]] && ok "anonymous API call is refused (401)" || fail "security" "anonymous request did not get 401"
  info=$(json "$BASE/actuator/info"); v=$(echo "$info" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p' | head -1); c=$(echo "$info" | sed -n 's/.*"commit":{"id":"\([^"]*\)".*/\1/p' | head -1)
  [[ -n "$v" ]] && ok "build info" "version $v commit ${c:-?}" || warn "build info" "not available"
  ms=$( { /usr/bin/time -p curl -s -o /dev/null --max-time 8 "$BASE/actuator/health/liveness"; } 2>&1 | awk '/real/ {print $2*1000}')
  [[ -n "$ms" ]] && { (( ${ms%.*} < 500 )) && ok "liveness latency" "${ms%.*} ms" || warn "liveness latency" "${ms%.*} ms (>500 ms: RUNBOOK slow requests)"; }
}

local_checks() {
  echo "Compose dependencies"
  if ! docker info >/dev/null 2>&1; then fail "docker daemon" "start Docker (ENVIRONMENT-SETUP L5)"; return; fi
  for s in postgres keycloak minio; do
    st=$(docker compose ps --format '{{.Service}} {{.Health}}' 2>/dev/null | awk -v s=$s '$1==s {print $2}')
    case "$st" in healthy) ok "$s" "healthy";; "") fail "$s" "not running: docker compose up -d --wait";; *) fail "$s" "$st: docker compose logs $s";; esac
  done
  if command -v docker >/dev/null && docker compose ps postgres --format '{{.Health}}' 2>/dev/null | grep -q healthy; then
    n=$(docker compose exec -T postgres sh -c 'psql -tA -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) from pg_stat_activity where datname=current_database()"' 2>/dev/null)
    ok "postgres connections" "${n:-?} sessions"
  fi
  newest=$(ls -1t backups/assetcare-*.sql.gz 2>/dev/null | head -1)
  if [[ -n "$newest" ]]; then age=$(( ( $(date +%s) - $(stat -f %m "$newest" 2>/dev/null || stat -c %Y "$newest") ) / 3600 )); (( age < 48 )) && ok "newest backup" "$newest, ${age}h old" || warn "newest backup" "${age}h old (BACKUP-RESTORE.md)"; else warn "backups" "none in backups/ (scripts/backup.sh)"; fi
}

k8s_checks() {
  echo "Kubernetes namespace $NS"
  kubectl get ns "$NS" >/dev/null 2>&1 || { fail "namespace $NS" "kubectl context? KUBECONFIG?"; return; }
  kubectl -n "$NS" get pods --no-headers 2>/dev/null | while read -r name ready status restarts rest; do
    r=${restarts%% *}
    if [[ "$status" == Running && "${ready%/*}" == "${ready#*/}" ]]; then
      if [[ "$r" =~ ^[0-9]+$ ]] && (( r > 3 )); then warn "pod $name" "$ready $status, $r restarts (RUNBOOK: pods restarting)"; else ok "pod $name" "$ready $status"; fi
    elif [[ "$status" == Completed ]]; then ok "job pod $name" "Completed"
    else fail "pod $name" "$ready $status (kubectl -n $NS describe pod $name)"; fi
  done
  cert=$(kubectl -n "$NS" get certificate -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.conditions[?(@.type=="Ready")].status}{" "}{.status.notAfter}{"\n"}{end}' 2>/dev/null)
  if [[ -z "$cert" ]]; then warn "tls certificate" "none (ingress disabled or cert-manager missing)"; else
    while read -r n st exp; do [[ "$st" == True ]] && ok "certificate $n" "expires $exp" || fail "certificate $n" "not ready: kubectl -n $NS describe challenge"; done <<< "$cert"; fi
  last=$(kubectl -n "$NS" get jobs -l app.kubernetes.io/component=backup --sort-by=.status.startTime -o jsonpath='{.items[-1:].status.succeeded}{" "}{.items[-1:].status.startTime}' 2>/dev/null)
  cj=$(kubectl -n "$NS" get cronjob -o jsonpath='{.items[?(@.metadata.name=="'$(kubectl -n $NS get cronjob -o name 2>/dev/null | head -1 | cut -d/ -f2)'")].status.lastSuccessfulTime}' 2>/dev/null)
  if [[ -n "$cj" ]]; then age=$(( ( $(date +%s) - $(date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$cj" +%s 2>/dev/null || date -u -d "$cj" +%s) ) / 3600 )); (( age < 30 )) && ok "last successful backup" "${age}h ago" || fail "last successful backup" "${age}h ago (BACKUP-RESTORE.md, RUNBOOK disk full?)"; else warn "backup cronjob" "no successful run recorded yet"; fi
  kubectl -n "$NS" get pvc --no-headers 2>/dev/null | while read -r n st vol cap rest; do [[ "$st" == Bound ]] && ok "volume $n" "$cap" || fail "volume $n" "$st"; done
  if kubectl top pods -n "$NS" >/dev/null 2>&1; then kubectl top pods -n "$NS" --no-headers | awk '{printf "  INFO %-52s %s cpu, %s mem\n", "usage "$1, $2, $3}'; fi
  am=$(kubectl -n observability get svc -o name 2>/dev/null | grep -m1 alertmanager | cut -d/ -f2)
  if [[ -n "$am" ]]; then
    firing=$(kubectl -n observability run -q --rm -i --restart=Never --image=curlimages/curl:8.14.1 amcheck -- -s "http://$am:9093/api/v2/alerts?active=true" 2>/dev/null | grep -o '"alertname":"[^"]*"' | sort -u | tr '\n' ' ')
    [[ -z "$firing" ]] && ok "firing alerts" "none" || fail "firing alerts" "$firing (rules.yml → runbook annotation)"
  else warn "alertmanager" "observability profile not installed"; fi
  api=$(kubectl -n "$NS" get ingress -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null)
  [[ -n "$api" ]] && { BASE="https://$api"; http_checks; }
}

case "$MODE" in
  local) local_checks; http_checks;;
  k8s)   k8s_checks;;
  url)   http_checks;;
  *) echo "usage: $0 [local|k8s [namespace]|url]"; exit 2;;
esac
echo
if (( FAILS == 0 )); then echo "health: OK"; else echo "health: $FAILS check(s) failed. Open docs/operations/RUNBOOK.md at the section named on the line."; exit 1; fi
