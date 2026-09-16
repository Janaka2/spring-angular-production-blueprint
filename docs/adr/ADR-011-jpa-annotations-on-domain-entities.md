# ADR-011: JPA annotations on domain entities, as a documented compromise

**Status:** accepted · **Date:** 2026-09-16

## Context

Pure hexagonal architecture keeps the domain free of every framework, which means a second set of persistence classes
and mappers for every aggregate. For a service of this size that doubles the model code for a benefit that only
materialises if the persistence technology changes.

## Options

Separate JPA entities plus mappers; JPA annotations on the domain classes; an active-record style with Spring Data
inside the domain.

## Decision

Domain classes carry `jakarta.persistence` and `jakarta.validation` annotations, plus JSpecify nullness annotations and, for JSON columns only, Hibernate's `@JdbcTypeCode`; nothing else from outside the JDK.
No Spring, no Hibernate-specific types, no HTTP, no cloud SDK. ArchUnit enforces exactly that allowlist. Ports are
interfaces in the application layer; Spring Data repositories in the persistence adapter extend them.

## Consequences

Half the classes, one place to read an aggregate's rules and its mapping. The domain can still be unit-tested without a
database. If the persistence technology ever changes, the annotations move to adapter classes and mappers appear; the
rest of the code does not notice.
