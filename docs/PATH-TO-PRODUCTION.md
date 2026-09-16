# The path to production: every activity, in order, with its proof

What has to be done, from cloning the code to a system that runs smoothly and can be changed with confidence, and
what proves each activity is done. The status column is honest as of 2026-09-16: **done** means executed and seen,
**written** means the code or document exists but has not been executed yet, **open** means still to do. Update the
column as you go; this page is the project's to-do list and its evidence at the same time.

Guides referenced: `ENVIRONMENT-SETUP.md` (L and P steps), `operations/OPERATIONS-GUIDE.md`, `HOW-TO-MODIFY.md`,
`operations/HEALTH-MONITORING.md`, `PRODUCTION-GAPS.md`.

## Phase 0: before touching the code

| # | Activity | Proof | Status |
|---|---|---|---|
| 0.1 | Read `README.md`, `docs/architecture/ARCHITECTURE.md`, `docs/DEFINITION-OF-DONE.md` | you can say in one sentence what the system is and what "done" means | per person |
| 0.2 | Decide the audience: yourself, a team, or paying users. It changes phases 4 and 6 | a line in the diary (`OPERATIONS-GUIDE.md` §9) | open |
| 0.3 | Have a GitHub account; fork the repository if you will change it | the fork exists | per person |
| 0.4 | Make the repository visibility match the intent (it is private now; the reference intends public) | Settings → General → Visibility | open (owner decision) |

## Phase 1: run it locally (verifies the code, teaches the stack)

| # | Activity | Proof | Status |
|---|---|---|---|
| 1.1 | Machine ready: Git, Java 25, Node 24, Docker, make, jq (`ENVIRONMENT-SETUP.md` L1 to L6) | `make doctor` prints `doctor: ready` | per machine |
| 1.2 | Clone, create `.env` (L7) | folder exists, `.env` present | per machine |
| 1.3 | Start PostgreSQL, Keycloak, MinIO (L8) | three containers `healthy`; realm answers | written (author's machine has no Docker) |
| 1.4 | Start the backend (L9) | health `UP`, anonymous call `401`, token call returns `alice` | written |
| 1.5 | Start the frontend and log in (L10) | dashboard as `alice`; create, edit, plan, complete, upload, archive, restore as `admin`; auditor sees but cannot change | written |
| 1.6 | Run every test level (L11) | unit 23 pass **(done locally)**; integration, frontend 13 **(done locally)**, lint **(done)**, e2e 3 pass | partly done; ITs and e2e not executed locally |
| 1.7 | Observability profile (L12): dashboards, a log line found by request id, its trace | Grafana panel moves; Loki query returns the line; Tempo opens the trace | written |
| 1.8 | Backup and restore drill on the local copy | `make backup`, delete something, `make restore`, it is back | written (drill runs in CI, not yet executed) |
| 1.9 | Load test once to know the baseline | `k6 run performance/k6/read.js` passes thresholds; numbers in `performance/README.md` | open |

## Phase 2: continuous verification (so every change is checked by a machine)

| # | Activity | Proof | Status |
|---|---|---|---|
| 2.1 | Grant the `workflow` scope and push the workflows (P2) | `gh auth status` shows `workflow`; `.github/workflows/*` on `main` | **open: blocks everything below** (`gh auth refresh -h github.com -s workflow`, then merge `ci/pipeline`) |
| 2.2 | First green `ci` run: Testcontainers ITs, ArchUnit, Playwright, restore drill, Helm, Terraform validate, image builds, Trivy | `gh run list` shows `ci` completed success | written |
| 2.3 | First green `security` run: CodeQL, Trivy fs, gitleaks, dependency review | Security tab shows results, no critical | written |
| 2.4 | Fix whatever the first runs find (expect a few: nothing here has run against Docker yet) | runs green | open |
| 2.5 | Protect `main`: require the `ci` jobs, require a PR | Settings → Branches | open |
| 2.6 | Enable Dependabot alerts and let the first grouped PRs run through CI | PRs open and green | written |
| 2.7 | Tag `v1.0.0`: multi-arch images, SBOM, cosign signature, chart package (P3) | `release` completed success; `cosign verify` passes; two packages on GHCR | written |

## Phase 3: prove it can be changed (the first modification, on purpose)

Do one small change end to end before you need to do a real one under pressure.

| # | Activity | Proof | Status |
|---|---|---|---|
| 3.1 | Read `HOW-TO-MODIFY.md`; open the `/add-feature` and `/add-migration` skills | you know which layer a change starts in | per person |
| 3.2 | Practice change: add a field (e.g. `asset.color`) through domain → migration → use case → DTO → UI → tests | PR with a changeset that has a rollback, a unit test, an IT, a spec; CI green | open |
| 3.3 | Practice ADR: write `ADR-012` for a decision you disagreed with or a gap you closed | file in `docs/adr`, linked | open |
| 3.4 | Run `/architecture-review` (or the checklist by hand) on that PR | findings list, all addressed | open |
| 3.5 | Release it as `v1.0.1` and deploy it (phase 4 or the local Helm dry run) | new version visible in `/actuator/info` | open |
| 3.6 | Practice rollback: `helm rollback` to `v1.0.0` and back | both versions serve; smoke test passes each time | open |

## Phase 4: production on the free tier

| # | Activity | Proof | Status |
|---|---|---|---|
| 4.1 | Tools, Oracle account, API key (P1, P4) | `terraform validate` ok **(done)**; `~/.oci/config` valid | tools done; account open |
| 4.2 | Create the VM (P5) | `ssh` shows `aarch64`, 4 cores, 23 GB | written (Terraform not executed) |
| 4.3 | K3s, Helm, cert-manager (P6); firewall (P7) | node Ready; `curl http://<ip>` 404 | written |
| 4.4 | DNS and issuers (P8, P9) | `dig` returns the IP; issuers Ready | open |
| 4.5 | Production secrets and realm host (P10, P11) | 7 keys; realm file has the host | open |
| 4.6 | Install with staging TLS, then prod TLS (P12) | 5 pods Running, certificate Ready, padlock | written (chart linted and rendered **done**; install not executed) |
| 4.7 | Smoke test, health, login (P13) | `smoke test passed`, `health: OK`, dashboard over HTTPS | written |
| 4.8 | Change or remove the demo users; create real users | Keycloak admin console shows only real users | open |
| 4.9 | Backups: manual run (P14), then off-VM copy (`backup.s3Bucket`) | `backup written` log; object in the bucket | written |
| 4.10 | Restore drill on production data, once, with a second person | `BACKUP-RESTORE.md` steps; row counts match; time noted | open |
| 4.11 | Observability profile on the cluster; alert routing to a real address (`HEALTH-MONITORING.md` §4) | a test alert arrives on your phone or inbox | written |
| 4.12 | Keycloak in production mode (`start` with `KC_DB=postgres`, hostname strict) instead of `start-dev` | `PRODUCTION-GAPS.md` item closed; realm survives pod restart from PostgreSQL | open |
| 4.13 | Disaster recovery rehearsal: destroy the VM, rebuild from Terraform + Helm + backup | back online within the hour documented in `RUNBOOK.md` | open |

## Phase 5: running it smoothly (the routine)

| # | Activity | Cadence | Proof |
|---|---|---|---|
| 5.1 | `scripts/health.sh k8s assetcare` | every morning and after every change | `health: OK` |
| 5.2 | React to alerts by the runbook, not by restarting | on alert | diary line; post-mortem if users were affected |
| 5.3 | Update to new versions (`OPERATIONS-GUIDE.md` §4) | when released, in a quiet hour | smoke test and health after; dashboard calm for 15 min |
| 5.4 | Review Dependabot PRs; merge green ones after reading the changelog | weekly | PRs closed |
| 5.5 | Security tab review | weekly | no open critical |
| 5.6 | Restore drill (local) and backup check (production) | monthly | diary |
| 5.7 | Certificate, secrets and user review | quarterly | `kubectl get certificate`; rotated per `RUNBOOK.md` |
| 5.8 | Free-tier bill check and capacity look (`kubectl top nodes`) | monthly | 0.00; headroom noted |
| 5.9 | Post-mortem for every user-visible incident; one alert or runbook line added each time | per incident | file under `docs/operations/incidents/` linked from the runbook |

## Phase 6: from "works" to "perfect" (known gaps, in the order they pay off)

These are the improvements the author knows about. None blocks phases 1 to 5; each removes a risk or a manual step.

| # | Improvement | Why | Where |
|---|---|---|---|
| 6.1 | Execute everything marked *written* above at least once and flip it to *done* in this table and in the README report | a reference nobody has run is a hypothesis | phases 1, 2, 4 |
| 6.2 | Extend Playwright to attachments (upload, download) and to the ADMIN restore path | today the e2e covers create/maintain/conflict/auditor only; uploads are covered by the API IT | `frontend/e2e/assetcare.spec.ts` |
| 6.3 | Run k6 in CI on a schedule against a compose stack and store the trend | latency regressions found by a machine, not by users | `.github/workflows`, `performance/` |
| 6.4 | Scheduled synthetic login (Playwright against production, nightly) | the only check that proves Keycloak + API + SPA together, from outside | `HEALTH-MONITORING.md` §6 |
| 6.5 | Idempotency-key cleanup job and audit-event archiving by date | the two tables that grow without bound | `HOW-TO-MODIFY.md` "scheduled job" |
| 6.6 | Managed PostgreSQL (or Oracle, `ORACLE-MIGRATION.md`) once there are users you would apologise to | one VM, one disk, no HA | `PRODUCTION-GAPS.md` |
| 6.7 | Secrets from a vault (External Secrets Operator + OCI Vault) instead of a hand-made Secret | rotation and audit of secrets | `DEPLOYMENT.md` §3 |
| 6.8 | Second node, PodDisruptionBudgets, HPA on | zero-downtime node maintenance; real scaling | `SCALING.md`, `values.yaml` |
| 6.9 | Argo CD watching the chart | every change to production is a Git commit with a reviewer | `DEPLOYMENT.md` §7 |
| 6.10 | Frontend error reporting to a backend endpoint or a service | today errors go to the user's console only | `frontend/src/app/core/error-handler.ts` |
| 6.11 | Second locale, and a Keycloak theme with the product's look | the SPA is structured for it; the login page is Keycloak's default | `frontend/`, Keycloak theme |
| 6.12 | Multi-tenancy (`tenant_id`) when organisations, not people, own assets | the model is single-tenant by decision | `docs/academy/ROADMAP.md` assumption 1, new ADR |
| 6.13 | Rate-limit and abuse alerts at the edge (Traefik metrics) | today rate limiting exists but is not observed | `observability/prometheus/rules.yml` |
| 6.14 | A status page fed by the blackbox probe | users see "we know" before they email | `HEALTH-MONITORING.md` §6 |

## How to use this page

Work top to bottom. Each row's proof is what you write in the diary. When a row flips from *written* or *open* to
*done*, change it here and, for the rows that appear there, in the README verification report. When you add a
capability, add its row. The day every row in phases 1 to 5 says *done* and phase 6 is a plan with dates, the
system is not perfect, but it is trustworthy, which is the thing perfection was standing in for.
