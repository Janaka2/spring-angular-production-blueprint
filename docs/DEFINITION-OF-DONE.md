# Definition of Done

The project is complete only when a developer, following `README.md` on a clean machine, can do all of the following.
Each line maps to a verification in the report at the end of the README. A line is PASS only if it was run.

| # | A developer can… | Course | Verified how |
|---|---|---|---|
| 1 | clone the repository | 1 | `git clone` |
| 2 | start the required dependencies | 1 | `docker compose up -d` (PostgreSQL, Keycloak, MinIO) |
| 3 | compile the Spring Boot backend | 1 | `./mvnw -q compile` |
| 4 | compile the Angular frontend | 1 | `npm run build` |
| 5 | log in | 3, 4 | Playwright: login as `alice` through Keycloak |
| 6 | create an asset | 3, 4 | API test and Playwright |
| 7 | retrieve the asset | 3, 4 | API test and Playwright |
| 8 | search assets | 3, 4 | API test (search, filter, sort, paginate) and Playwright |
| 9 | update the asset | 3, 4 | API test and Playwright |
| 10 | handle concurrent modification | 3, 4 | API test: stale `If-Match` → 409; Playwright: conflict dialog |
| 11 | add maintenance information | 3, 4 | API test and Playwright |
| 12 | see audit history | 3, 4 | API test and Playwright |
| 13 | upload and view an attachment | 3, 4 | API test against MinIO; Playwright |
| 14 | view application metrics | 6 | `/actuator/prometheus` scraped by Prometheus; Grafana panel shows data |
| 15 | view logs | 6 | JSON log lines in Loki with `traceId` and `requestId` |
| 16 | view distributed traces | 6 | a request's trace in Tempo, linked from its log line |
| 17 | run automated tests | 5 | `make test`, `make integration-test`, `make e2e` |
| 18 | build Docker images | 7 | `docker build` for amd64 and arm64 in CI |
| 19 | deploy through Helm | 7 | `helm lint`, `helm template`, `helm upgrade --install` |
| 20 | deploy to the documented OCI/K3s environment | 7 | documented step by step; executed only when an OCI tenancy is available |
| 21 | access the application over HTTPS | 7 | cert-manager certificate issued for the configured host |
| 22 | perform a database backup | 5, 7 | `scripts/backup.sh` produces a timestamped, compressed dump |
| 23 | restore a database backup | 5, 7 | `scripts/restore.sh` restores into a fresh database and the smoke test passes |
| 24 | understand how the architecture scales | 1, 7 | `docs/architecture/ARCHITECTURE.md` §6 and `docs/operations/SCALING.md` |

## Per-change definition

A pull request is done when: it compiles; unit, integration and architecture tests pass; new behaviour has a test; the
OpenAPI description reflects any API change; a schema change is a Liquibase changeset with a rollback; a decision that
constrains the future has an ADR; no secret is committed; the CI pipeline is green.
