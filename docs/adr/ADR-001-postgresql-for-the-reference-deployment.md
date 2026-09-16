# ADR-001: PostgreSQL for the reference deployment, Oracle as a documented migration

**Status:** accepted · **Date:** 2026-09-16

## Context

The reference must run for free on one small VM and be runnable by any developer on a laptop. Many target enterprises run Oracle.

## Options

PostgreSQL 18; Oracle Free/XE; H2 for development with PostgreSQL in production.

## Decision

PostgreSQL 18 everywhere, including tests (Testcontainers). Oracle is documented as a migration path in docs/architecture/ORACLE-MIGRATION.md. H2 is not used: a different database in tests hides real behaviour.

## Consequences

Free, small, well understood. Domain and application code stay database independent; only the persistence adapter and the Liquibase changelogs would change for Oracle. Developers must run PostgreSQL locally, which docker compose provides.
