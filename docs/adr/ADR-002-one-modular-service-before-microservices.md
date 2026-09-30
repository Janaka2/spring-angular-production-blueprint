# ADR-002: One modular service before multiple microservices

> Part of the [AssetCare showcase](https://github.com/Janaka2/spring-angular-production-blueprint). © 2026 Janaka Premathilaka, all rights reserved, view only (see LICENSE). File paths mentioned below refer to the private AssetCare source.

**Status:** accepted · **Date:** 2026-09-16

## Context

The product has one bounded context today. Distributed systems add network failure, versioning, observability and deployment cost that only pays off when teams or scaling profiles diverge.

## Options

Several microservices from day one; a single service with strict internal modules (clean/hexagonal architecture); a monolith without internal boundaries.

## Decision

One Spring Boot service with domain / application / adapter / infrastructure packages, enforced by ArchUnit. Seams for a notification, document and reporting service are documented but not extracted.

## Consequences

One deployable, one database, simple operations. Extraction later is moving code behind an existing port. The team must keep the boundaries honest; the ArchUnit tests fail the build when they are not.
