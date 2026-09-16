---
name: architecture-review
description: Review a change or a proposal against AssetCare's architecture, ADRs, coding standards, security principles and production readiness, producing a findings list. Use before merging a non-trivial change or when asked "is this the right way".
---

# Architecture review

Produce findings, most severe first, each with file:line, the rule it breaks (ADR or standard), and the fix. No findings
without a rule; no rule without a link.

## Checklist
**Boundaries** (ADR-002, `ArchitectureTest`)
- Domain has no Spring, no adapters, no Jackson. Application uses ports only. Controllers contain no business rules.
- New port? It is an interface in `application/port`, implemented in an adapter, faked in `support/Fakes`.

**Data** (ADR-005 UUID, ADR-010 archive, ADR-009 optimistic locking)
- Changeset with reason and rollback, expand/contract safe. Entity has audit columns and `@Version`. No hard delete.
- Indexes for the queries the feature adds. Money as `Money`, time as `Instant`/`LocalDate` with a `Clock`.

**API** (ADR-006 Problem Details, ADR-007 versioning)
- Under `/api/v1`. DTOs validated. Errors are Problem Details with a registered type. Reads return `ETag`; updates
  require `If-Match`; creates accept `Idempotency-Key`. OpenAPI annotations present. Pagination bounded (`size` ≤ 200).

**Security** (`docs/security/SECURITY-PRINCIPLES.md`)
- Authorization through `AuthorizationPolicy`; auditor cannot write; owner checks on every asset-scoped call.
- No secret, token or PII in logs or audit diffs. Upload limits and content-type allow-list respected.
- Input that reaches SQL goes through JPA/Specifications, never string concatenation.

**Observability** (ADR-008)
- New use case emits its audit event with requestId/traceId. Long operations have a span name. A new failure mode has
  a metric or is visible in an existing panel; if it needs an alert, it comes with a runbook entry.

**Frontend**
- Standalone, signals, typed forms, no `any`. Four states present. Conflict (409) handled where updates happen.
  Controls hidden for roles that cannot use them, and 403 still handled. Accessible: labels, focus, keyboard.

**Operations**
- Config through `ASSETCARE_*` environment with a documented default in `application.yml` and the Helm values.
- Migrations and config changes noted for the release notes. Nothing requires a manual step on deploy.

**Free-first / enterprise-ready**
- Runs on the free reference; the enterprise substitution is a value, not a rewrite. New gap → `PRODUCTION-GAPS.md`.

## Output
```
1. [HIGH] adapter/in/web/AssetController.java:142 — role check in controller; rule: CLAUDE.md #6 / ADR-003. Fix: move to AuthorizationPolicy.canArchive(...)
2. [MEDIUM] ...
No findings: say so, and list what was checked.
```
