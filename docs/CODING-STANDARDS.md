# Coding standards

## Java

- Java 25 language level. Records for immutable transport types and value objects; sealed interfaces where a closed
  set of cases exists; pattern matching in switch over them.
- Constructor injection only. No field injection, no `@Autowired` on fields.
- No Lombok. Records, compact constructors and IDE generation cover what Lombok would.
- Small classes with one reason to change. A controller maps HTTP to a use case and back; a use case orchestrates
  domain objects and ports; a domain object holds rules. Nothing else lives in any of them.
- Explicit names: `ArchiveAssetUseCase`, not `AssetManager`. `findByOwnerAndStatus`, not `find2`.
- Exceptions: domain exceptions extend `DomainException` and carry a stable `code`; the web adapter maps them to
  Problem Details. Never catch and swallow.
- Null: JSpecify `@NullMarked` on packages; `Optional` for return values that may be absent; never for fields or parameters.
- Comments explain why, never what. A comment that restates the code is deleted in review.
- Logging: SLF4J with structured key-value arguments (`log.atInfo().addKeyValue("assetId", id).log("ASSET_UPDATED")`).
  Never log tokens, passwords, or personal data beyond an identifier.
- Time: `java.time` only, UTC in the database, an injectable `Clock` so tests control time.
- Money: `BigDecimal` with scale 2 plus an ISO 4217 code. Never `double`.

## SQL and migrations

- Every changeset has an `author`, a stable `id`, a comment with the reason, and a rollback.
- Every index has a comment naming the query it serves. No index without a query.
- Column names are `snake_case`; tables are singular (`asset`, `maintenance_item`).
- No `SELECT *` in native queries; prefer Spring Data derived queries and JPQL; native SQL is allowed for search.

## TypeScript and Angular

- Standalone components, signals for state, signal forms, `httpResource` for reads, `inject()` over constructors.
- `OnPush` is the default in Angular 22; components do not opt out.
- Strict TypeScript and Angular strict templates. No `any`.
- ESLint (angular-eslint) and Prettier are the formatter; CI fails on lint errors.
- Accessibility: every control has a label; dialogs trap focus; colour is never the only signal; the app is usable
  with a keyboard. Angular Material components provide most of this; custom ones must match.

## Git

- `main` is protected. Work on feature branches; open a pull request; CI must be green.
- Conventional commit prefixes: `feat`, `fix`, `test`, `docs`, `chore`, `ci`, `refactor`.
- Tags are semantic versions (`v1.0.0`) and correspond to image tags.

## Reviews

A reviewer checks: does the change belong in the layer it is in; is the failure path tested; does the API contract
still match the OpenAPI document; is anything logged that should not be; is there a migration and a rollback.
