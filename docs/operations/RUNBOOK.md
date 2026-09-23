# Runbook

This is the expert reference. If you are new to operating software, start with `OPERATIONS-GUIDE.md`, which covers
the same situations in plain language and points back here.

For the person on call. Each entry: how you notice, what to check, what to do, how to confirm. Alerts are defined in
`observability/prometheus/rules.yml`; dashboards in Grafana → AssetCare.

## Where things are

First command, always: `scripts/health.sh` locally or `scripts/health.sh k8s assetcare` on a cluster. It prints OK /
WARN / FAIL per check and the section of this runbook to open. What each signal means: `HEALTH-MONITORING.md`.

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml       # on the VM
kubectl -n assetcare get pods -o wide
kubectl -n assetcare logs deploy/assetcare-api --since=10m | jq -r '.message'      # structured JSON logs
kubectl -n assetcare port-forward svc/assetcare-api 8080:8080                        # actuator, never exposed
curl -s localhost:8080/actuator/health | jq
```

Every response carries `X-Request-Id`; every log line carries `requestId` and `traceId`. Ask the user for the request
id from the error page and search Loki: `{app="assetcare-api"} |= "<requestId>"`, then open the trace in Tempo.

## Symptoms

### API pods restarting / not ready

Check: `kubectl -n assetcare describe pod <api pod>` (last state: OOMKilled? probe failures?), then the logs.
- OOMKilled: raise `api.resources.limits.memory` (the heap is 75 % of the limit) or look for a leak in the heap
  dashboard. Do not restart in a loop; the exit is deliberate (`ExitOnOutOfMemoryError`).
- Readiness failing, liveness fine: a dependency is down. `curl localhost:8080/actuator/health` names it (`db`,
  `diskSpace`). Fix the dependency; the pod recovers on its own.
- Liquibase lock error at start after a crash: `kubectl exec` into postgres and `UPDATE databasechangeloglock SET locked=false;`
  only if no other API pod is starting.

Confirm: `kubectl -n assetcare get pods` shows `1/1 Running`, smoke test passes.

### 401 or 403 for everyone

Check: is Keycloak ready (`kubectl -n assetcare get pods`)? Does the issuer in the token match
`ASSETCARE_OIDC_ISSUER` (`kubectl -n assetcare get cm assetcare-api -o yaml`)? Keycloak behind a proxy must see
`X-Forwarded-*` headers (`--proxy-headers=xforwarded` in the chart) or it issues tokens with the wrong issuer.
- Certificate expired: `kubectl -n assetcare get certificate`; cert-manager renews 30 days ahead; if it did not, check
  `kubectl -n cert-manager logs deploy/cert-manager` for ACME failures (DNS, port 80 blocked).

Confirm: log in as `alice`; `/api/v1/me` returns the user.

### 409 stale-version complaints

Expected behaviour, not an incident: two people edited the same asset. The UI shows who changed it and offers reload.
If a single client sees it repeatedly, it is sending a stale `If-Match`; check the client, not the server.

### Slow requests (alert `AssetCareApiSlow`)

Check the RED dashboard: is it all endpoints (database, node) or one (a query)? `kubectl top pods -n assetcare`.
- PostgreSQL CPU high: look for sequential scans on `asset` (`pg_stat_statements` if enabled); indexes are documented
  in `002-asset.yaml`; the search endpoint uses `lower(...) LIKE`, add a trigram index if search grows.
- Node saturated: the observability profile can be scaled down (retention) or moved off the node.

### Disk full

Check: `df -h /` on the VM; PVCs live on the boot volume under `/var/lib/rancher/k3s/storage`.
- Backups volume: lower `backup.keep`.
- Loki or Tempo: lower retention in `deploy/helm/observability/*.yaml`.
- PostgreSQL: `VACUUM` runs automatically; large `audit_event` growth is expected; archive old rows by date.

### Attachments failing (5xx on upload)

Check: MinIO pod, `MINIO_ROOT_*` in the Secret, bucket exists (`assetcare-minio-init` Job). Files over 10 MB and
disallowed content types are 4xx by design (`assetcare.attachments.*`).
`NoSuchBucketException` in the API log means the bucket was never created: `assetcare-minio-init` is a post-install /
post-upgrade hook, and Helm skips hooks when a release fails (`helm -n assetcare history assetcare` shows `failed` or
`pending-upgrade`). Fix what made the release fail, upgrade again, or run the Job's `mc mb --ignore-existing` by hand.

### Certificate not issued

`kubectl -n assetcare describe certificaterequest`, then `describe order` and `describe challenge`. Usual causes: DNS
does not resolve to the VM yet, port 80 blocked by the Hetzner cloud firewall `assetcare-web` (or on OCI the
security list or iptables), rate limit (use staging).

## Procedures

### Deploy a new version

`docs/operations/DEPLOYMENT.md` section 4. Watch `kubectl -n assetcare rollout status deploy/assetcare-api`.

### Roll back

`helm -n assetcare rollback assetcare <revision>`. Migrations are expand/contract; a schema rollback is a separate,
deliberate step using the Liquibase rollback blocks. Decide with: does the old version still work against the new
schema? If yes (the normal case), only roll back the release.

### Restore the database

`docs/operations/BACKUP-RESTORE.md`. Scale the API to zero first, restore, scale back, smoke test.

### Rotate a secret

Update the Secret (`kubectl -n assetcare create secret ... --dry-run=client -o yaml | kubectl apply -f -`), then
`kubectl -n assetcare rollout restart deploy/assetcare-api` (pods read the Secret at start). Database password: change
it in PostgreSQL and in the Secret in the same window.

### Disaster: the VM is gone

1. Create a VM (`infra/hetzner`: `terraform apply`; or restore a Hetzner server backup into a new server), run
   `deploy/k3s/install.sh`, apply the cluster issuer, point DNS at the new IP.
2. Install the chart with the same values and secrets (they are in your vault, not in Git).
3. Restore the latest dump from Object Storage (`BACKUP-RESTORE.md`); attachments come back from the object storage
   bucket if `externalObjectStorage` was used, otherwise they are lost with the VM (documented in PRODUCTION-GAPS).
4. Point DNS at the new IP; cert-manager issues a new certificate.
Expected time: under an hour once the VM exists. Practise it once; the drill is the only proof.

### Scale

One node cannot scale horizontally. `docs/operations/SCALING.md` covers the order: measure (k6), tune the pool and
JVM, then more nodes and `api.autoscaling.enabled=true`, then a managed database.

## Past incidents

None recorded yet. Write one with `POST-MORTEM-TEMPLATE.md` and link it here.
