# From CRUD to production: an Angular and Spring Boot application, served as a seven-course meal

<!-- lede -->
Most tutorials stop where the real work starts. This one starts there. AssetCare is a complete asset-maintenance manager, built in the open with Angular 22, Spring Boot 4.1 on Java 25, PostgreSQL 18, Keycloak, OpenTelemetry, Helm and GitHub Actions, and deployed for free on one Oracle Cloud ARM machine. Every course below says why the piece exists, what was built, how it was built, and what proves it works. Nothing is claimed that was not run; where something was not executed, it says so.

<!-- eyebrow: Before we sit down -->
## Why a reference application, and why a meal

A new project loses its first two weeks to the same questions every time. Which Java, which Spring Boot, which Angular. How do we log. How do users log in. How do migrations run. How does it get into a container, into a cluster, behind TLS. How do we know it is up. Every team answers these again, under deadline, and the answers calcify into the architecture for a decade.

AssetCare answers them once, with reasons, in a repository you can clone: [spring-angular-production-blueprint](https://github.com/Janaka2/spring-angular-production-blueprint). The domain is deliberately small. People own assets (a car, a boiler, a laptop), assets need maintenance on a schedule, someone has to prove what was done and when. Small enough to hold in your head, rich enough to need every production concern: ownership, roles, concurrent edits, audit, files, money, time.

It is served as a meal because the order matters. You do not plate the main course before the kitchen is set. Each course ends with something that verifiably works and a commit that says what it added.

| Course | Name | What arrives at the table |
|---|---|---|
| 1 | Mise en place | requirements, architecture, version matrix, standards, decisions, environment |
| 2 | Starter | the domain in code, PostgreSQL schema with Liquibase |
| 3 | Soup | the Spring Boot service: API, security, audit, Problem Details, observability hooks |
| 4 | Main course | the Angular application |
| 5 | Side dishes | tests at every level, scans, SBOM, load test, backup and restore |
| 6 | Dessert | metrics, logs, traces, dashboards, alerts |
| 7 | Coffee | images, Helm, K3s on OCI, TLS, CI/CD, runbook |

> **Free first, enterprise ready.** Everything runs on free tiers and open source. Where an enterprise would swap a piece (Oracle for PostgreSQL, a corporate identity provider, a vault, managed Kubernetes), the seam is a documented value, not a rewrite. `docs/PRODUCTION-GAPS.md` lists every such seam honestly.

<!-- eyebrow: Course 1 · Mise en place -->
## Everything in its place before the heat goes on

**Why.** The expensive mistakes are the ones made before the first line of code: an unverified version, a dependency direction nobody enforces, a security model invented under pressure. Mise en place is writing those down first.

**What.** A [version matrix](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/VERSION-MATRIX.md) where every version was checked against its official source on the day it was written: Java 25 LTS, Spring Boot 4.1.1, Angular 22.1, PostgreSQL 18.6, Keycloak 26.7, Helm 4.3. An [architecture document](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/docs/architecture/ARCHITECTURE.md) with the context, container, request-trace and deployment diagrams. A [domain model](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/docs/architecture/DOMAIN-MODEL.md). Eleven [architecture decision records](https://github.com/Janaka2/spring-angular-production-blueprint/tree/main/docs/adr): why a modular monolith and not microservices, why UUIDs, why archive instead of delete, why optimistic locking, why Keycloak. Coding standards, security principles, and a [Definition of Done](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/docs/DEFINITION-OF-DONE.md) with twenty-four things a developer must be able to do before the project counts as finished.

**How.** The architecture is clean architecture with the boundary enforced, not described. The domain package may depend on the JDK and the persistence and validation annotations, nothing else; the application layer defines ports; adapters implement them. The rule is an ArchUnit test, so a pull request that imports Spring into the domain fails the build.

```text
adapter/in/web  ─────▶  application (use cases, ports)  ◀─────  adapter/out/persistence
                                   │
                                   ▼
                              domain (entities, rules, exceptions)
```

**Proof.** The backend and frontend skeletons compile; the standards are the ones every later course is held to.

> **Decision you will reuse.** Kafka, Redis and a second service are absent because no requirement needs them. The ADRs say what requirement would change that and where the seam is: an outbox table next to the audit events for Kafka, the cache abstraction already in place for Redis.

<!-- eyebrow: Course 2 · Starter -->
## The domain in code, and a schema that explains itself

**Why.** The schema outlives every framework in the stack. Getting it right, with constraints and indexes that carry their reasons, is worth a whole course.

**What.** Six entities: [Asset](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/backend/src/main/java/me/janaka/assetcare/domain/Asset.java), Category, MaintenanceItem with recurrence, ServiceRecord, Attachment and AuditEvent. Money is a value object with amount and currency. Every table has `created_at`, `created_by`, `updated_at`, `updated_by` and a `version` column for optimistic locking. Archiving is a timestamp, not a delete.

**How.** [Liquibase changelogs in YAML](https://github.com/Janaka2/spring-angular-production-blueprint/tree/main/backend/src/main/resources/db/changelog/changes), one file per table, each with a comment that says why the constraint or index exists, and a rollback block. Hibernate runs with `ddl-auto: validate`, so the schema in Git is the only schema. Reference data (categories) is a CSV change set; demo data is a separate change set that runs only in the `dev` context.

```yaml
- changeSet:
    id: 002-asset
    comment: >
      Owner index because every list query filters by owner. Partial index on
      archived_at IS NULL because the common query is "my active assets".
    changes: [...]
    rollback: [...]
```

**Proof.** Domain unit tests for the rules (a maintenance item completes into its successor, a currency must be a valid ISO code) run locally. The migration applies to a real PostgreSQL 18 in Testcontainers and a schema test asserts the constraints; that runs in CI, where Docker is available.

<!-- eyebrow: Course 3 · Soup -->
## The service: an API that behaves the same on its worst day as on its best

**Why.** Anyone can return 200 on the happy path. Production is about the other paths: two people editing the same record, a retried request after a timeout, a token from the wrong audience, an error a client can act on.

**What.** A REST API under `/api/v1`: assets with pagination, filtering, sorting and search; maintenance planning and completion; service history; attachments; categories; a dashboard. Keycloak as the identity provider with three roles: USER, ADMIN, AUDITOR. Every error is an RFC 9457 Problem Details document with a stable type URI. Every write produces an audit event in the same transaction, carrying the request id and trace id.

**How.** Three patterns carry most of the weight.

- **Optimistic locking through HTTP.** Every read returns an `ETag` with the entity version. Every update must send `If-Match`; without it the answer is 428, with a stale one it is 409 with a Problem Details body that names who changed the record and when. The [controller](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/backend/src/main/java/me/janaka/assetcare/adapter/in/web/AssetController.java) does the HTTP part; the [use case](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/backend/src/main/java/me/janaka/assetcare/application/AssetService.java) does the rule.
- **Idempotency keys.** A create with an `Idempotency-Key` header is stored with its response; the same key returns the same response instead of a duplicate asset. Retries become safe.
- **Roles as data, not as `if`s.** An [authorization policy](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/backend/src/main/java/me/janaka/assetcare/application/AuthorizationPolicy.java) in the application layer decides what a user may do to an asset. The web layer never reasons about roles.

```http
PUT /api/v1/assets/7c9e...  HTTP/1.1
If-Match: "3"

HTTP/1.1 409 Conflict
Content-Type: application/problem+json
{ "type": "https://assetcare.janaka.me/problems/stale-version", "title": "The asset was changed by someone else",
  "status": 409, "changedBy": "bob", "changedAt": "2026-09-16T09:12:44Z", "currentVersion": 4 }
```

**Proof.** Unit tests for the use cases against in-memory fakes; the ArchUnit suite; and an [integration test](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/backend/src/test/java/me/janaka/assetcare/api/AssetApiIT.java) that walks the whole workflow, from create to conflict to archive to audit history, with real JWTs against real PostgreSQL. The integration tests run in CI; the unit and architecture tests ran locally (21 tests).

<!-- eyebrow: Course 4 · Main course -->
## The Angular application people actually use

**Why.** The frontend is where every backend decision becomes visible. A 409 is only useful if the screen explains it. A role is only real if the button is not there.

**What.** An Angular 22 standalone application with Angular Material: login through Keycloak with PKCE, a dashboard, an asset list with search, filters, sorting and pagination, create and edit forms with validation, an asset detail with maintenance planning, service history, attachments and audit history. Loading, empty, error and forbidden states everywhere. Keyboard and screen-reader friendly.

**How.** Signals for state, typed reactive forms, an interceptor that attaches the token and one that turns Problem Details into a typed error. The [API client](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/frontend/src/app/core/api/assets.api.ts) returns the body and the ETag together, so the [edit form](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/frontend/src/app/features/assets/asset-form.ts) can send `If-Match` and show the conflict dialog with "changed by bob two minutes ago, reload?". Configuration is loaded at runtime from `config.json`, so the same build runs in every environment.

**Proof.** The build (548 kB initial, under budget), lint and ten unit tests ran locally. A [Playwright flow](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/frontend/e2e/assetcare.spec.ts) logs in, creates an asset, plans and completes maintenance, and provokes a conflict from a second browser session; it runs in CI against the real stack.

<!-- eyebrow: Course 5 · Side dishes -->
## The things nobody sees until they are missing

**Why.** Quality that is not automated decays. Security that is not scanned is assumed. A backup that was never restored is a hope.

**What.** Testcontainers for integration tests, ArchUnit for the architecture, Playwright for the flow, k6 with SLO thresholds for load, CodeQL and Trivy and dependency review for security, a CycloneDX SBOM for every build, gitleaks over the history, and tested [backup and restore scripts](https://github.com/Janaka2/spring-angular-production-blueprint/tree/main/scripts).

**How.** The [k6 scripts](https://github.com/Janaka2/spring-angular-production-blueprint/tree/main/performance/k6) obtain a real token and fail the run when the 95th percentile exceeds the SLO. The restore script restores into a side database and swaps it in, so a bad dump never leaves you with nothing. Rate limiting is at two layers: a filter in the API and a Traefik middleware at the edge. Resilience is honest: the service has one downstream, its database, so there is no circuit breaker to show; the document says where one would go if a second downstream appeared.

**Proof.** The CI pipeline runs all of it, including a backup-wipe-restore drill that compares row counts. Locally, without Docker, the scans and the drill were not executed; the report says so.

<!-- eyebrow: Course 6 · Dessert -->
## Seeing what it does: metrics, logs and traces that agree with each other

**Why.** At three in the morning the question is not "is it up" but "which request, for whom, failed where". Three signals that share an id answer that in one search.

**What.** Micrometer metrics to Prometheus, structured JSON logs to Loki, OpenTelemetry traces to Tempo, one collector in between, and a Grafana dashboard that lives in Git with twenty-two panels: request rate, error rate, latency percentiles, JVM, database pool, business counters. Alert rules with a sentence each on why they exist.

**How.** Every request gets an `X-Request-Id` (yours or a new one) and a trace id; both go into the MDC so every log line carries them, and the same ids appear in the audit events. The [compose file](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/docker-compose.observability.yml) starts the stack locally; on Kubernetes the same configuration is [values for the upstream charts](https://github.com/Janaka2/spring-angular-production-blueprint/tree/main/deploy/helm/observability).

**Proof.** The configuration files are validated in CI. Dashboards showing real traffic require a running stack; on the author's machine there was no Docker daemon, so that is documented as not executed rather than shown with a fake screenshot.

<!-- eyebrow: Course 7 · Coffee -->
## Into a container, into a cluster, behind a certificate, every day

**Why.** A deployment that lives in one person's shell history is not a deployment. It has to be a file, a command and a rollback.

**What.** Two [multi-arch, non-root images](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/backend/Dockerfile): the API on a JRE with container-aware heap and graceful shutdown, the SPA on unprivileged nginx with a Content-Security-Policy and a `config.json` rendered from the environment. A [Helm chart](https://github.com/Janaka2/spring-angular-production-blueprint/tree/main/deploy/helm/assetcare) with probes, resource limits, rolling updates that never drop below capacity, Traefik ingress, cert-manager TLS, a nightly backup CronJob, optional autoscaling, and switches for an external database, identity provider and object storage. Terraform for the [OCI Always Free VM](https://github.com/Janaka2/spring-angular-production-blueprint/tree/main/infra/oci), an installer for K3s, and three workflows: CI, security, release.

**How.** The chart's defaults are the free deployment; every enterprise substitution is a value. The release workflow builds for amd64 and arm64, scans the pushed image, signs it with cosign and attaches provenance. The [runbook](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/docs/operations/RUNBOOK.md) is written for the person on call: symptom, check, action, confirmation. The [OCI guide](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/docs/operations/OCI-FREE-TIER.md) says what each step costs beyond the free tier, which is nothing until you exceed 4 cores, 24 GB, 200 GB of disk or 10 TB of traffic.

```bash
helm upgrade --install assetcare deploy/helm/assetcare -n assetcare --create-namespace \
  --set global.host=assetcare.example.com --set image.tag=1.0.0 \
  --set api.existingSecret=assetcare-secrets --wait
scripts/smoke-test.sh https://assetcare.example.com
```

**Proof.** `helm lint` and `helm template` pass for the free and the enterprise value sets, executed locally. Image builds, Trivy and the config render check run in CI. The OCI installation is documented step by step with a verification per step and was not executed by the author's build environment.

<!-- eyebrow: Closing the kitchen -->
## What you can do now, and what an enterprise would change

The [Definition of Done](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/docs/DEFINITION-OF-DONE.md) lists twenty-four capabilities, from "clone and run in ten minutes" to "restore last night's backup" to "explain why the architecture looks like this". The README's verification report marks each check PASS with a date, or NOT EXECUTED with the reason. That honesty is the point: a reference you cannot trust is worse than none.

| The reference uses | An enterprise would use | Where the seam is |
|---|---|---|
| PostgreSQL in the cluster | managed PostgreSQL or Oracle | `postgres.enabled=false`, `docs/architecture/ORACLE-MIGRATION.md` |
| Keycloak in the cluster | corporate Keycloak, Entra ID, Okta | `externalKeycloak.issuer`; roles claim mapping in one class |
| MinIO | OCI Object Storage, S3 | `externalObjectStorage.*` |
| chart-created Secret | vault with External Secrets Operator | `api.existingSecret` |
| one K3s node | managed Kubernetes, several nodes | `api.autoscaling.enabled=true` |
| Caffeine cache | Redis, when a second instance needs the same cache | the Spring cache abstraction already in place |
| audit table | Kafka, when another system must consume events | an outbox next to `audit_event` |
| `helm upgrade` from a laptop | Argo CD | point it at the chart directory |

Clone it. Set up the machine with [the environment guide](https://github.com/Janaka2/spring-angular-production-blueprint/blob/main/docs/ENVIRONMENT-SETUP.md), which starts from what a terminal is and checks after every step, then `docker compose up -d --wait`, `make backend`, `make frontend`, and log in as `alice`. Then read one ADR a day and change the thing you disagree with. The kitchen is yours.
