# ADR-005: Liquibase for schema migration

> Part of the [AssetCare showcase](https://github.com/Janaka2/spring-angular-production-blueprint). © 2026 Janaka Premathilaka, all rights reserved, view only (see LICENSE). File paths mentioned below refer to the private AssetCare source.

**Status:** accepted · **Date:** 2026-09-16

## Context

Production schemas must be versioned, reviewed and applied deterministically. Hibernate DDL generation is unreviewable and unsafe.

## Options

Liquibase; Flyway; Hibernate ddl-auto.

## Decision

Liquibase, managed by Spring Boot, with YAML changelogs per course and a changelog per table. ddl-auto is set to validate so a drift between entities and schema fails startup.

## Consequences

Every schema change is a changeset with a rollback and a reason. Liquibase also handles Oracle, which keeps ADR-001 honest.
