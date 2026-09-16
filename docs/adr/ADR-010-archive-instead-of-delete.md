# ADR-010: Archive instead of physical delete

**Status:** accepted · **Date:** 2026-09-16

## Context

Asset history has value to owners and auditors; a physically deleted row cannot be explained later.

## Options

Hard delete; soft delete flag; a lifecycle status with an archive step and an audited admin-only hard delete.

## Decision

DELETE /api/v1/assets/{id} archives. Archived assets are hidden from default lists, restorable by an admin, and hard-deletable only by an admin when no service records reference them. Every transition is an audit event.

## Consequences

Storage grows; a retention job can purge archived assets after a policy period. The API stays RESTful (DELETE means the resource is gone from the collection) while the business record survives.
