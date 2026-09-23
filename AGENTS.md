# AssetCare: guidance for AI coding assistants

Read this before changing anything. It is short on purpose; the documents it links are the source of truth.

## What this is
A production-ready reference application: Angular 22 SPA, Spring Boot 4.1 API on Java 25, PostgreSQL 18 with Liquibase,
Keycloak OIDC, OpenTelemetry, Helm chart for K3s on a Hetzner CX33 (ADR-012). Domain: people own assets that need maintenance.
Start with `README.md`, then `docs/architecture/ARCHITECTURE.md` and `docs/DEFINITION-OF-DONE.md`.

## Non-negotiable rules
1. **Dependency direction is enforced.** `domain` depends only on the JDK, `jakarta.persistence`, `jakarta.validation`,
   `org.jspecify`, `org.hibernate.annotations`. `application` depends on `domain` and defines ports. `adapter/*` and
   `infrastructure` depend inward. `backend/src/test/java/me/janaka/assetcare/architecture/ArchitectureTest.java`
   fails the build otherwise. Never weaken that test; move the code instead.
2. **Schema changes are Liquibase changesets** in `backend/src/main/resources/db/changelog/changes/`, with a comment
   that says why, and a rollback block. Hibernate runs with `ddl-auto: validate`. Never edit an applied changeset.
3. **Nothing is deleted, it is archived** (ADR-010). Every entity carries audit columns and `@Version`.
4. **Every write records an audit event** through `AuditRecorder`, in the same transaction.
5. **Errors are RFC 9457 Problem Details** with a type under `https://assetcare.janaka.me/problems/`. Domain exceptions
   in `domain/exception` map to them in `ProblemDetailsHandler`. No ad-hoc error bodies.
6. **Authorization is a policy, not an `if`.** `application/AuthorizationPolicy` decides; controllers never check roles.
7. **Updates need `If-Match`** (428 without, 409 `stale-version` when stale). Creates accept `Idempotency-Key`.
8. **No secrets in Git.** Development credentials only in `.env.example` and the realm export, labelled as such.
9. **Never claim a check passed that was not run.** The README verification report says PASS or NOT EXECUTED.
10. **No new infrastructure without a requirement** (Kafka, Redis, a second service). ADR-001 says when and where.

## Where things go
| Change | Path | Skill |
|---|---|---|
| a new field, endpoint, use case or entity | domain → application → adapters, see `docs/HOW-TO-MODIFY.md` | `/add-feature` |
| a schema change | `db/changelog/changes/NNN-*.yaml` + master include | `/add-migration` |
| a decision that constrains the future | `docs/adr/ADR-NNN-*.md` | `/write-adr` |
| a release | tag `vX.Y.Z`; `release.yml` builds, scans, signs | `/release` |
| an incident or health question | `docs/operations/RUNBOOK.md`, `HEALTH-MONITORING.md` | `/operate` |
| "does this change respect the architecture?" | ArchUnit, ADRs, coding standards | `/architecture-review` |

## Commands
`make doctor`, `docker compose up -d --wait`, `make backend`, `make frontend`, `make unit-test`, `make integration-test`
(Docker), `make test`, `make lint`, `make e2e`, `make helm-lint`, `make status`, `scripts/health.sh`.
Backend tests: unit `*Test` via surefire, integration `*IT` via failsafe (Testcontainers). Frontend: Vitest, Playwright.

## Conventions
Commits `feat:|fix:|test:|docs:|chore:|ci:` with a body that says why. Java: records for DTOs and value objects,
constructor injection, no Lombok, `@NullMarked` packages. Angular: standalone components, signals, typed reactive forms,
no `any`, Material components, every screen has loading, empty, error and forbidden states. See `docs/CODING-STANDARDS.md`.
