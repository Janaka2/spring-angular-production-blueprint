# AssetCare: a production-ready Angular + Spring Boot reference application

**What is this?** A complete, working asset-maintenance manager (AssetCare) built the way a serious application is
built inside a bank, an insurer or a large company: one Angular 22 SPA, one Spring Boot 4.1 service on Java 25,
PostgreSQL 18 with Liquibase, Keycloak for identity, OpenTelemetry observability, tests at every level, multi-arch
containers, a Helm chart, GitHub Actions, and a free Kubernetes deployment on Oracle Cloud.

**Why does it exist?** So that you do not spend your first two weeks on a new project figuring out logging,
authentication, migrations, Docker, Kubernetes, monitoring, testing and CI/CD. Clone it, run it, read why each piece is
there, and evolve it. It is also the reference project for the [Janaka Academy](https://janaka.me/academy/) course
*From CRUD to Production*, told as a seven-course meal.

**What will I learn?** Clean architecture with enforced boundaries, optimistic locking and idempotency, Problem
Details errors, OIDC with PKCE and a resource server, structured logs correlated with traces and metrics, Testcontainers,
ArchUnit, Playwright, k6, non-root multi-arch images, Helm, K3s, TLS with cert-manager, backup and restore, and the
honest difference between a free reference deployment and an enterprise platform.

```mermaid
flowchart LR
    U[Browser] -->|HTTPS| ING[Ingress + TLS]
    ING --> FE[Angular SPA]
    ING --> API[Spring Boot API]
    ING --> KC[Keycloak]
    API --> PG[(PostgreSQL 18)]
    API --> OBJ[(Object storage)]
    API -.metrics.-> PROM[Prometheus] --> GRAF[Grafana]
    API -.traces.-> TEMPO[Tempo] --> GRAF
    API -.logs.-> LOKI[Loki] --> GRAF
```

## Status

This repository is being built course by course. The table is updated at the end of each course and only lists what
has been executed.

| Course | State |
|---|---|
| 1 Mise en place: architecture, domain, standards, environment | done |
| 2 Starter: PostgreSQL schema and migrations | done |
| 3 Soup: Spring Boot service | done (integration tests run in CI) |
| 4 Main course: Angular application | done (end-to-end flow runs in CI) |
| 5 Side dishes: quality, security, reliability | done (scans, SBOM and the restore drill run in CI) |
| 6 Dessert: observability | done (stack starts with `make observability`) |
| 7 Coffee: deployment, CI/CD, operations | done (chart linted and rendered; images built in CI; OCI install documented, NOT EXECUTED) |
| Academy article | done: [janaka.me/academy/production-ready-spring-angular](https://janaka.me/academy/production-ready-spring-angular/) (source: `docs/academy/ARTICLE.md`) |

## How do I run it?

Requirements: Java 25, Node 24, Docker with Compose v2. `make doctor` checks. Never done this before? `docs/ENVIRONMENT-SETUP.md` starts from
zero (what a terminal is) and takes you to a running local copy (L1 to L12) and to production (P1 to P14), checking
after every step. Then `docs/operations/OPERATIONS-GUIDE.md` explains how to keep it running.

```bash
git clone https://github.com/Janaka2/spring-angular-production-blueprint.git
cd spring-angular-production-blueprint
cp .env.example .env          # development credentials, labelled as such
docker compose up -d --wait   # PostgreSQL 18, Keycloak 26 with the assetcare realm, MinIO
make backend                  # API on http://localhost:8080
make frontend                 # SPA on http://localhost:4200  (second terminal)
```

| What | URL | Credentials (development only) |
|---|---|---|
| Angular SPA | http://localhost:4200 | `alice` / `alice-dev-password` (USER), `admin` / `admin-dev-password` (ADMIN), `audrey` / `audrey-dev-password` (AUDITOR) |
| API | http://localhost:8080/api/v1 | bearer token from Keycloak |
| OpenAPI UI | http://localhost:8080/swagger-ui.html | |
| Health | http://localhost:8080/actuator/health | |
| Keycloak admin | http://localhost:8081 | `admin` / `admin-dev-password` |
| MinIO console | http://localhost:9001 | `assetcare` / `assetcare-dev-password` |
| Grafana (observability profile) | http://localhost:3000 | `admin` / `admin` |

## How do I test it?

```bash
make unit-test          # backend unit tests, no Docker
make integration-test   # backend against PostgreSQL 18 in Testcontainers
make test               # backend unit tests + frontend tests
make e2e                # Playwright against the running stack
```

## How do I deploy it?

See `docs/operations/DEPLOYMENT.md` (Helm on any Kubernetes) and `docs/operations/OCI-FREE-TIER.md` (K3s on an OCI
Always Free ARM VM with TLS from Let's Encrypt). `make helm-lint` and `make helm-template` validate the chart.

## How do I monitor it?

`make status` (or `scripts/health.sh k8s assetcare` on a cluster) prints a one-screen health summary that names the
runbook section for anything failing. `make observability` starts Prometheus, Alertmanager, the blackbox exporter,
Grafana, Loki, Tempo and the OpenTelemetry Collector. Dashboards and alert rules are in `observability/` and checked
into Git. What healthy means, the SLOs and the alert-to-runbook map: `docs/operations/HEALTH-MONITORING.md`.

## How do I extend it?

Read `docs/architecture/ARCHITECTURE.md` for the dependency direction and where a new feature goes, then
`docs/CODING-STANDARDS.md` and `docs/DEFINITION-OF-DONE.md`. Decisions that constrain you are in `docs/adr/`.

## Documentation map

- `docs/ENVIRONMENT-SETUP.md` — setup from zero, local and production, written for beginners; each step verified
- `docs/operations/OPERATIONS-GUIDE.md` — keeping it running, in plain language; `RUNBOOK.md` is the expert version
- `docs/HOW-TO-MODIFY.md` — the playbook for common changes; the same playbook as AI skills in `.claude/skills/`
- `docs/architecture/` — architecture, domain model, database model (ER diagram, every column and index), UI wireframes (every screen, state and role), Oracle migration
- `docs/adr/` — architecture decision records
- `docs/operations/` — deployment, OCI free tier, runbook, health monitoring, backup and restore, scaling, observability, post-mortem template
- `docs/security/` — security principles, threat model
- `docs/PRODUCTION-GAPS.md` — what an enterprise replaces
- `docs/academy/` — the seven-course roadmap and the Academy article
- `docs/TOOLS-AND-LIBRARIES.md` — every tool and library, what it does here and what it makes easy
- `VERSION-MATRIX.md` — every version, verified against its official source

## Verification report

Updated at the end of each course. Only executed checks are marked PASS.

```text
Executed by the author (2026-09-16, macOS, no Docker daemon available):
Backend compile (Java 25, Spring Boot 4.1.1)        PASS   ./mvnw compile
Backend unit + architecture tests                   PASS   21 tests: domain, use cases, ArchUnit
Frontend build (Angular 22.1)                       PASS   ng build, 548 kB initial, under budget
Frontend lint + format (angular-eslint, Prettier)   PASS
Frontend unit tests (Vitest)                        PASS   10 tests
Helm lint (Helm 4.3.0)                              PASS   0 charts failed
Helm template, core values                          PASS   19 objects rendered
Helm template, enterprise values (external DB/IdP/  PASS   10 objects rendered, no development password in output
  object storage, existingSecret, HPA, ServiceMonitor)
Version matrix                                      PASS   every version checked against its official source

Delegated to GitHub Actions (.github/workflows on branch ci/pipeline; needs the workflow scope to be pushed):
Integration tests (Testcontainers, PostgreSQL 18)   NOT EXECUTED locally; job backend
Backup → wipe → restore drill                       NOT EXECUTED locally; job backup-restore
E2E (Playwright, real Keycloak + API + SPA)         NOT EXECUTED locally; job e2e
Docker builds amd64/arm64, config.json render check NOT EXECUTED locally; jobs images (ci) and images (release)
Trivy (fs, images), CodeQL, dependency review,      NOT EXECUTED locally; workflow security
  gitleaks
k6 load test                                        NOT EXECUTED; scripts and thresholds in performance/
Observability stack with real traffic               NOT EXECUTED; docker-compose.observability.yml validated in CI
Terraform validate (infra/oci)                      NOT EXECUTED locally; job helm

Not executed anywhere yet:
OCI VM + K3s installation, DNS, TLS issuance        NOT EXECUTED (no OCI tenancy in the build environment); documented step by step with a check per step
Smoke test against a deployed instance              NOT EXECUTED; scripts/smoke-test.sh runs in the e2e job against localhost
```

## Licence

Apache-2.0. See `LICENSE`.
