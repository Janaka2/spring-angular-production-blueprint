# The seven-course roadmap

The project is built and taught in the order a professional kitchen works. Each course ends with something that
verifiably works, a logical commit, and a summary of what now works. Nothing is claimed that was not run.

| Course | Name | Delivers | Verified by |
|---|---|---|---|
| 1 | Mise en place | Requirements, architecture, domain model, version matrix, repository structure, standards, security principles, Definition of Done, ADRs, dev environment | documents reviewed; backend and frontend skeletons compile |
| 2 | Starter | Domain model in code, Liquibase migrations, constraints and indexes with reasons, auditing columns, optimistic locking, test data | migrations apply on PostgreSQL 18 (Testcontainers in CI), schema tests |
| 3 | Soup | The Spring Boot service: REST API under `/api/v1`, clean architecture, Problem Details, pagination/filter/sort/search, Keycloak resource server, OpenAPI, audit events, structured logs, health, metrics, traces | unit + integration tests, ArchUnit, security tests; API works end to end against PostgreSQL and Keycloak |
| 4 | Main course | Angular SPA: login, dashboard, list/search/filter/paginate, create/view/update/archive, concurrency conflicts, maintenance, history, attachments, states, accessibility | frontend unit tests; Playwright end-to-end flow against the real stack |
| 5 | Side dishes | Testcontainers, ArchUnit, API tests, security tests, static analysis, dependency and container scanning, SBOM, k6, resilience, backup/restore, secure configuration | CI pipeline green; scans documented |
| 6 | Dessert | Prometheus, Grafana dashboards in Git, Tempo tracing, Loki logs, OTel collector, correlation ids, alerts | stack runs locally with `docker compose`; dashboards show real traffic |
| 7 | Coffee and closing | Docker images (multi-arch, non-root), Helm chart, K3s on one Hetzner CX33, TLS, DNS, backups, GitHub Actions, rollback, runbook, scaling, disaster recovery | `helm lint`/`template`, image builds in CI, deployment documented with what was and was not executed |

## Checklist

```text
[✓] Version matrix verified against official sources
[✓] Architecture and domain model
[✓] Repository structure
[✓] Backend skeleton compiles (Spring Boot 4.1.1, Java 25)
[✓] Frontend skeleton compiles (Angular 22)
[✓] Course 2: PostgreSQL schema and migrations
[✓] Course 3: backend API with security, audit, observability
[✓] Course 4: Angular application (Playwright flow written; executed in CI)
[✓] Course 5: quality, security and reliability (scans and SBOM run in CI)
[✓] Course 6: observability stack
[✓] Course 7: deployment, CI/CD, operations (chart linted and rendered; images built in CI; production trial on a Hetzner CX33, ADR-012)
[ ] Academy article
```

## Assumptions

1. One tenant. Ownership is per user; organisations are a later extension (a `tenant_id` column is left out on purpose
   until a requirement exists; adding it is a migration plus a filter in the application layer).
2. Keycloak is the identity provider for all environments. Local development uses a realm import with three demo users
   and clearly labelled development passwords. No other authentication mechanism exists.
3. The reference deployment is one Hetzner Cloud CX33 (4 vCPU, 8 GB) running K3s (ADR-012). It costs a few euros a
   month; an earlier OCI Always Free VM was dropped because free capacity could not be obtained on demand.
4. Attachments are limited to 10 MB per file and to a list of document and image content types.
5. Currency is stored per amount; no conversion is performed.
6. English is the only UI language in the reference; the SPA is structured so a second locale is a translation file.

## What one small server cannot do, and the lighter configuration

The core chart (Keycloak, PostgreSQL, MinIO, the API and the frontend) fits in the CX33's 8 GB with headroom; the full
observability stack (collector, Prometheus, Loki, Tempo, Grafana) on the same node does not, and needs a CX43 (16 GB) or
a second server (ADR-012). Two Helm profiles therefore exist:

- **core**: frontend, API, PostgreSQL, Keycloak, MinIO. Roughly 3 GB of requests.
- **observability**: adds the five observability components with retention set to days, not weeks.

The server, its IPv4 address and server backups cost money every month; `ENVIRONMENT-SETUP.md` P4 points at Hetzner's
price page rather than quoting numbers that go stale.

## Definition of Done

The activity-by-activity list with proof and status, from clone to routine operations and the known improvements,
is `docs/PATH-TO-PRODUCTION.md`.


The project is done when a developer can do every one of the 24 steps in `docs/DEFINITION-OF-DONE.md`, and the
verification report at the end of `README.md` shows each check as PASS or NOT EXECUTED with the reason.
