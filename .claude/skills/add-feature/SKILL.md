---
name: add-feature
description: Add a field, endpoint, use case or entity to AssetCare as a vertical slice through the clean architecture, with tests, migration, API docs and UI states. Use for any functional change to the backend or frontend.
---

# Add a feature (vertical slice)

Work inside out. Each layer has one job; do not skip a layer because it feels small.

## 1. Requirement and decision
- Write the behaviour as one sentence with the actor: "A USER can mark a maintenance item as skipped with a reason."
- Check `docs/architecture/DOMAIN-MODEL.md` and the ADRs. If the change contradicts an ADR, stop and run `/write-adr`
  first. If it needs new infrastructure, it needs a requirement and an ADR (CLAUDE.md rule 10).

## 2. Domain (`backend/src/main/java/me/janaka/assetcare/domain`)
- Put the rule in the entity or value object as a method with a verb (`skip(reason, actor, now)`), throwing
  `InvalidStateException` or `ValidationException` from `domain/exception` when the rule is violated.
- New value: a record. New state: extend the enum and the transition table in the entity.
- Unit test it in `backend/src/test/java/me/janaka/assetcare/domain/*Test.java` with a fixed `Clock`. No Spring here.

## 3. Schema (only if data changes)
- Run `/add-migration`. Add the column with a reason and a rollback; expand/contract if the column is NOT NULL on
  existing rows (add nullable → backfill → constraint in a later changeset).

## 4. Application (`application/`)
- Add or extend a use case in the service (`AssetService`, `MaintenanceService`, ...). Steps in order: load through the
  port, `AuthorizationPolicy` check, call the domain method, save, `AuditRecorder.record(...)`.
- New persistence need: add a method to the port interface in `application/port`, not a Spring Data call in the service.
- Unit test with `support/Fakes` (in-memory repositories): success, forbidden, invalid state, not found.

## 5. Adapters
- Persistence (`adapter/out/persistence`): implement the new port method in the `*RepositoryAdapter`; Spring Data
  interfaces stay package-private behind it.
- Web (`adapter/in/web`): DTO records with `jakarta.validation` annotations; controller method with `@PreAuthorize`
  only for coarse role gates; `If-Match` handled through `Preconditions` for updates; return `ETag` on reads. Document
  the operation with `@Operation(summary, description)` and the error codes it can return.
- New error type: add the constant to `ProblemDetailsHandler` and the type URI to `docs/api/PROBLEMS.md` if present,
  otherwise to the handler's comment table.

## 6. Integration test
- Extend `backend/src/test/java/me/janaka/assetcare/api/AssetApiIT.java` or add `<Feature>IT.java` using `PostgresIT`
  and `TestUsers.jwt(...)`. Cover the happy path, the 4xx paths, and that an audit event was written.

## 7. Frontend (`frontend/src/app`)
- Model in `core/api/models.ts`; call in the `*.api.ts` returning `Versioned<T>` for anything with an ETag.
- Component under `features/<area>/`: standalone, signals, typed form; states: loading, empty, error (Problem Details
  via `shared/state.ts`), forbidden (hide the control when `auth.canWrite()` is false, and handle a 403 anyway).
- Vitest spec next to the component; extend `e2e/assetcare.spec.ts` if the flow is user-visible.
- Update the wireframe in `docs/architecture/UI-WIREFRAMES.md` (screen, states, who-sees-what table).

## 8. Done when
`make unit-test`, `make integration-test`, `make test`, `make lint` pass; OpenAPI shows the change at
`/v3/api-docs`; the changeset has a rollback; the commit says why; `docs/architecture/DOMAIN-MODEL.md` is updated if
the model changed. Commit as `feat: <verb> <thing>`.
