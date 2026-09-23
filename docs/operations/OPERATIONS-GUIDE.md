# Keeping AssetCare running: the plain-language operations guide

This is for the person who looks after AssetCare day to day and did not build it. It assumes you finished
`docs/ENVIRONMENT-SETUP.md`. It tells you what to do, what you should see, and when to stop and get help. The expert
version, with every detail, is `RUNBOOK.md`; each section here points to it.

Two settings appear throughout:
- **Local** means the copy on your own computer (Local track).
- **Production** means the server on the internet (Production track). Before any production command, open a terminal,
  go to the project folder, and type `export KUBECONFIG=~/.kube/assetcare.yaml` (and open the SSH tunnel if you set
  one up in P6).

## 1. Is everything OK right now?

The one command to remember.

```bash
scripts/health.sh                    # local
scripts/health.sh k8s assetcare      # production
```

**You should see.** A list of lines, each starting with `OK`, and the last line `health: OK`.

**If a line says WARN.** Nothing is broken, but something needs attention soon (a backup older than a day, a pod that
restarted a few times). Read the text after the line; it names the section of this guide or of `RUNBOOK.md`.

**If a line says FAIL.** Something is broken. Read the text after the line, then go to section 6 of this guide.

Do this every morning in production, and after every change. It takes ten seconds.

## 2. Starting and stopping

### Local

| Do | Command | You should see |
|---|---|---|
| start the database, login server, file storage | `docker compose up -d --wait` | prompt returns, `docker compose ps` shows three `healthy` |
| start the backend | `make backend` (own window) | `Started AssetCareApplication` |
| start the frontend | `make frontend` (own window) | `Local: http://localhost:4200/` |
| stop backend or frontend | `Ctrl + C` in its window | prompt returns |
| stop the containers, keep the data | `docker compose down` | `Removed` lines |
| stop and delete all local data | `make deps-down` | same; next start is fresh with example data |

### Production

Production does not get "started" or "stopped": Kubernetes keeps it running and restarts anything that crashes, even
after the server reboots. The only reasons to touch it are updating (section 4), rolling back (section 5), or
restoring (section 7).

To restart one part on purpose (for example after changing a secret):

```bash
kubectl -n assetcare rollout restart deploy/assetcare-api
kubectl -n assetcare rollout status deploy/assetcare-api
```

**You should see.** `deployment "assetcare-api" successfully rolled out`. Users notice nothing: the new copy starts
before the old one stops.

## 3. Looking at what is happening

### Logs (what the program wrote down)

```bash
# local: look at the backend window; or if you started it elsewhere:
docker compose logs -f --tail=100 keycloak       # or postgres, minio
# production
kubectl -n assetcare logs deploy/assetcare-api --since=10m | jq -r '.message'
kubectl -n assetcare logs deploy/assetcare-api --since=10m | grep -i error
```

Every log line in production is one JSON object. `jq -r '.message'` prints just the human sentence; drop that part
to see everything, including `requestId`, `traceId` and the user.

### One person's problem

Ask them for the **request id** shown on the error page (it looks like `3f9c2a1e-...`). Then:

```bash
kubectl -n assetcare logs deploy/assetcare-api --since=24h | grep 3f9c2a1e
```

**You should see.** Every log line of exactly that request, including the error. If the observability profile is
installed (`OBSERVABILITY.md`), paste the id into Grafana → Explore → Loki instead and click the trace link to see
where the time went.

### The dashboards

Local: `make observability`, then http://localhost:3000 (`admin` / `admin`). Production: `OBSERVABILITY.md` explains
the install; then `kubectl -n observability port-forward svc/kps-grafana 3000:80` and open http://localhost:3000.
The dashboard "AssetCare overview" shows requests per second, errors, speed, memory and database connections.
Green and flat is good. What each alert means and where it sends you: `HEALTH-MONITORING.md` section 3.

## 4. Updating to a new version

New versions arrive as tags on GitHub (`v1.1.0`). Updating production is one command, and it is safe: the old
version keeps serving until the new one is ready, and the database is changed in a way both versions understand.

**Before.** Read the release notes on GitHub (Releases → the version): the "Operator notes" line says if anything
needs your attention (a new setting, a longer start). Run `scripts/health.sh k8s assetcare` and make sure it is
`health: OK`; never update something that is already broken.

**Do this.** (same command as P12, with the new number)

```bash
helm upgrade --install assetcare deploy/helm/assetcare -n assetcare \
  --set global.host=assetcare.yourdomain.tld \
  --set image.tag=1.1.0 \
  --set api.existingSecret=assetcare-secrets \
  --wait --timeout 15m
scripts/smoke-test.sh https://assetcare.yourdomain.tld
scripts/health.sh k8s assetcare
```

**You should see.** `Release "assetcare" has been upgraded`, `smoke test passed`, `health: OK`. Then open the site,
log in, and click through one screen. Keep an eye on the dashboard or run `health.sh` again after fifteen minutes.

**If not.** Section 5, roll back. Updating never leaves you stuck: the previous version is one command away.

Tip: keep the exact `helm upgrade` command in a file (`~/assetcare-upgrade.sh`) so updating is "change the number,
run the file".

## 5. Going back to the previous version

```bash
helm -n assetcare history assetcare
helm -n assetcare rollback assetcare <the REVISION number of the last good line>
kubectl -n assetcare rollout status deploy/assetcare-api
scripts/health.sh k8s assetcare
```

**You should see.** `Rollback was a success! Happy Helming!`, then `health: OK`.

**Good to know.** Rollback swaps the program back; it leaves the database as it is. That is fine: every database
change in this project is written so that the previous program still works with it. If a release note ever says
otherwise, it will say exactly what to do. Details: `RUNBOOK.md` → Procedures → Roll back.

## 6. When something is wrong

**Do not restart things at random.** First look, then act. The order:

1. `scripts/health.sh k8s assetcare` (or the local one). Read the first `FAIL` line.
2. Match it to a row in this table.
3. Do the action. Run `health.sh` again. If it is `OK`, write down what happened (section 9).
4. If it is not `OK` after one try, or the row says "get help", stop and get help. Send them the `health.sh` output
   and the logs from section 3. Nothing you did so far made it worse.

| What health.sh says | What it usually means | What to do |
|---|---|---|
| `liveness` FAIL or `pod assetcare-api ... CrashLoopBackOff` | the backend keeps crashing | `kubectl -n assetcare logs deploy/assetcare-api --previous \| tail -30` shows why. Out of memory: get help to raise the limit. A message about `databasechangeloglock`: RUNBOOK "Liquibase lock". Anything else: roll back (section 5). |
| `readiness` FAIL, `dependency: db` DOWN | the database is not reachable | `kubectl -n assetcare get pods`: is `postgres-0` Running? If not, `kubectl -n assetcare describe pod assetcare-postgres-0`, look at Events. Disk full is the common cause: next row. |
| `volume ... FAIL` or an alert "VolumeNearlyFull" | the disk is filling up | RUNBOOK "Disk full": lower backup retention (`backup.keep`) or log retention; do not delete database files by hand. |
| `dependency: identityProvider` DOWN | the login server is down; people cannot log in, but those already logged in keep working | `kubectl -n assetcare get pods`: `keycloak-0` not Running → `describe` it. Often it is restarting after a memory issue; wait five minutes, then get help if it stays down. |
| `dependency: storage` DOWN | attachments cannot be uploaded or opened; everything else works | `minio-0` not Running → `describe` it. Same approach as above. |
| `certificate ... not ready` | the HTTPS certificate could not be renewed | `kubectl -n assetcare describe challenge`: if it mentions DNS, check the A record (P8); if it mentions a timeout, check the doors (P7). Certificates renew a month early, so you have time. |
| `last successful backup ... FAIL` | the nightly backup did not run | `kubectl -n assetcare get jobs`; look at the newest backup job's logs. Usually disk full. Run one by hand (P14) once fixed. |
| `anonymous API call is refused` FAIL | the API answered a request without a login. This is a security problem. | Roll back immediately (section 5), then get help. |
| `firing alerts: ...` | Prometheus noticed something | the alert name is a row in `HEALTH-MONITORING.md` section 3 with the runbook section to open. |
| users say "it is slow" but health is OK | the server is busy | dashboard → which screen is slow? `kubectl top pods -n assetcare`. `RUNBOOK.md` "Slow requests"; `SCALING.md` if it is simply too much traffic. |
| a user got a red page with a request id | one request failed | section 3, "One person's problem". If it is a bug, open a GitHub issue with the log lines. |
| "someone else changed this asset" message in the app | not a problem | two people edited the same thing; the app asks the second one to reload. Working as designed. |

**Local copies.** The same table applies with `docker compose ps` instead of `kubectl get pods`, and
`docker compose logs <name>` instead of `kubectl logs`. Local problems are solved by `docker compose down`,
`docker compose up -d --wait`, and starting the backend again far more often than anything else.

## 7. Backups and restoring

**What is backed up.** The database (every asset, maintenance item, record, user reference, audit history) every
night at 02:30 into a compressed file on the server. Attachments live in the file storage, which is not part of that
dump. Off the server: Hetzner takes a nightly snapshot of the whole server and keeps seven (enabled by Terraform in
P5, visible in the Hetzner console under the server → Backups); if you also set `backup.s3Bucket` the dumps are copied
to that S3-compatible bucket.

**Check that backups exist.**

```bash
kubectl -n assetcare get cronjob assetcare-backup
kubectl -n assetcare get jobs --sort-by=.status.startTime | tail -3
```

**You should see.** `LAST SCHEDULE` within the last day, and the newest job `1/1` completions.

**Restore.** Only when data was lost or corrupted, and always with a second person. Follow `BACKUP-RESTORE.md`
step by step; it stops the backend, restores into a separate database, swaps it in, starts the backend, and runs the
smoke test. Practise it once a month on the local copy: `make backup`, delete something in the app, `make restore`,
see it come back. Five minutes, and the only real proof that backups work.

## 8. Users and passwords

Users live in Keycloak, not in AssetCare. Open `https://assetcare.yourdomain.tld/auth/admin/`, log in as `admin` with
the password from P10, choose realm `assetcare` (top left).

| Do | Where |
|---|---|
| add a user | Users → Add user → fill username and email → Create → Credentials tab → Set password (untick Temporary if you do not want them to change it at first login) → Role mapping → Assign role → `USER` (or `ADMIN`, `AUDITOR`) |
| reset a password | Users → the user → Credentials → Reset password |
| remove a user | Users → the user → Delete. Their assets stay, marked with their id; an ADMIN can see them. |
| what the roles mean | `USER` manages their own assets. `ADMIN` can also restore and hard-delete archived assets. `AUDITOR` reads everything and changes nothing. |

Never share the Keycloak admin password. Never type any production password into a terminal command; the secrets in
P10 are the only ones the application uses and they are already stored.

## 9. Keeping a diary

Whenever you do something in production (update, restart, restore, a new user with ADMIN), write one line in a file
you keep, with the date and the command. When something breaks, the diary is the first thing that helps. After an
incident that affected users, fill in `POST-MORTEM-TEMPLATE.md`; it is a form, and the last question ("what would
have made this shorter") is the one that improves the system.

## 10. The monthly checklist

```text
[ ] scripts/health.sh k8s assetcare is OK
[ ] newest backup is from last night (section 7)
[ ] restore drill done on the local copy (section 7)
[ ] kubectl -n assetcare get certificate shows READY True and an expiry more than 30 days away
[ ] GitHub → Security tab: no open critical findings; Dependabot pull requests reviewed
[ ] a newer AssetCare version? read its notes; update (section 4) in a quiet hour
[ ] Hetzner console → Billing: the month's cost is the CX33, its IPv4 and backups; nothing unexpected listed
[ ] Hetzner console → the server → Backups: seven recent backups listed
[ ] diary up to date (section 9)
```

## When to get help instead of continuing

- `health.sh` shows FAIL and the action in section 6 did not fix it on the first try.
- Anything involving deleting data, the database volume, or the server.
- The words `OOMKilled`, `Liquibase`, `CrashLoopBackOff` or `NotAuthenticated` and you are not sure what they mean.
- A security question: the anonymous-access alert, a password that may have leaked, a user you do not recognise.

Send: the output of `health.sh`, the last 50 log lines (section 3), what you changed last, and the diary line.
