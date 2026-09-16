---
name: operate
description: Diagnose health, incidents, alerts and day-two operations of a running AssetCare, locally or on Kubernetes. Use for "is it healthy", "why is it slow", an alert name, a failed deployment, backup or restore, rollback, secret rotation.
---

# Operate AssetCare

Start with facts, not guesses. The first command is always the health summary.

## 1. Get the picture
```bash
scripts/health.sh                    # local stack (compose + localhost:8080)
scripts/health.sh k8s assetcare      # a cluster namespace: pods, probes, certificate, backup age, volumes, alerts
```
It prints one line per check with OK / WARN / FAIL and the runbook section to open.

## 2. Map the symptom to the runbook
`docs/operations/OPERATIONS-GUIDE.md` (plain language) and `docs/operations/RUNBOOK.md` (expert) are organised by symptom (restarting pods, 401 for everyone, slow requests, disk full,
attachments failing, certificate not issued). Alerts in `observability/prometheus/rules.yml` carry a `runbook`
annotation with the section. Follow the section: check → do → confirm. Do not restart things before the check.

## 3. Correlate a single failing request
Ask for the `X-Request-Id` shown on the error page or in the response headers, then:
- logs: Loki `{service_name="assetcare-api"} |= "<requestId>"`, or `kubectl logs deploy/assetcare-api | grep <requestId>`
- trace: the log line has `traceId`; open it in Tempo (Grafana → Explore → Tempo).
- audit: `select * from audit_event where request_id = '<requestId>'` shows what was written.

## 4. Change something safely
- Deploy or upgrade: `docs/operations/DEPLOYMENT.md` §4; watch `kubectl rollout status`.
- Roll back: `helm rollback` (§5). Schema rollback is separate and deliberate; migrations are expand/contract, so the
  previous version normally runs against the new schema.
- Rotate a secret, restore a backup, recover from a lost VM: RUNBOOK "Procedures".
- Scale: `docs/operations/SCALING.md`: measure with k6 first, then pool and JVM, then nodes and HPA, then managed DB.

## 5. Health model (what "healthy" means)
- Liveness `/actuator/health/liveness`: the JVM is alive. Kubernetes restarts on failure.
- Readiness `/actuator/health/readiness`: `db` is reachable. Traffic stops on failure; no restart.
- `/actuator/health` (authenticated for details) also reports `storage` (object storage or filesystem) and
  `identityProvider` (issuer discovery document). They are informational: a down IdP means logins fail but existing
  tokens still work, so they do not gate readiness.
- SLOs, alert list and notification routing: `docs/operations/HEALTH-MONITORING.md`.

## 6. After an incident
Copy `docs/operations/POST-MORTEM-TEMPLATE.md`, fill it within a day, add the missing alert or runbook entry that
would have shortened it, and link it from the runbook. Blameless: facts, timeline, contributing causes, actions.
