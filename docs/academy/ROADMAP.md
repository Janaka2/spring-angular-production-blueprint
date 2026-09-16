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
| 7 | Coffee and closing | Docker images (multi-arch, non-root), Helm chart, K3s on OCI, TLS, DNS, backups, GitHub Actions, rollback, runbook, scaling, disaster recovery | `helm lint`/`template`, image builds in CI, deployment documented with what was and was not executed |

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
[ ] Course 5: quality, security and reliability
[ ] Course 6: observability stack
[ ] Course 7: deployment, CI/CD, operations
[ ] Academy article
```

## Assumptions

1. One tenant. Ownership is per user; organisations are a later extension (a `tenant_id` column is left out on purpose
   until a requirement exists; adding it is a migration plus a filter in the application layer).
2. Keycloak is the identity provider for all environments. Local development uses a realm import with three demo users
   and clearly labelled development passwords. No other authentication mechanism exists.
3. The reference deployment is a single OCI Always Free ARM VM (VM.Standard.A1.Flex, 4 OCPU, 24 GB) running K3s. It is
   free while capacity exists; OCI may not have capacity in a given region at a given moment.
4. Attachments are limited to 10 MB per file and to a list of document and image content types.
5. Currency is stored per amount; no conversion is performed.
6. English is the only UI language in the reference; the SPA is structured so a second locale is a translation file.

## What the free tier cannot do, and the lighter configuration

The full observability stack (collector, Prometheus, Loki, Tempo, Grafana) plus Keycloak, PostgreSQL, MinIO, the API and
the frontend fits in 24 GB with careful requests and limits, but leaves little room. Two Helm profiles therefore exist:

- **core**: frontend, API, PostgreSQL, Keycloak, MinIO. Roughly 3 GB of requests.
- **observability**: adds the five observability components with retention set to days, not weeks.

Anything that costs money on OCI is called out where it appears: Object Storage beyond the free 20 GB, a public load
balancer beyond the free 10 Mbps flexible one, block volumes beyond 200 GB, and outbound data beyond 10 TB a month.

## Definition of Done

The project is done when a developer can do every one of the 24 steps in `docs/DEFINITION-OF-DONE.md`, and the
verification report at the end of `README.md` shows each check as PASS or NOT EXECUTED with the reason.
