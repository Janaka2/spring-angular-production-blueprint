---
name: write-adr
description: Record an architecture decision for AssetCare as an ADR in docs/adr, with context, options, decision, consequences and the requirement that would revisit it. Use whenever a change constrains future work or contradicts an existing ADR.
---

# Write an ADR

Location `docs/adr/ADR-NNN-<kebab-title>.md`, next free number; list it in `docs/adr/README.md` if present, otherwise
in the "Decisions" section of `docs/architecture/ARCHITECTURE.md`.

## When
- A choice that later work must respect: a library, a pattern, a boundary, a data shape, an operational rule.
- A deviation from an existing ADR: write a new ADR that supersedes it (`Status: Accepted, supersedes ADR-004`), and
  mark the old one `Superseded by ADR-NNN`. Never edit the old decision's content.
- Adding infrastructure (queue, cache server, second service, managed cloud service).

## Structure (keep each section short; a page is enough)
```markdown
# ADR-NNN: <decision as a statement, e.g. "Attachments are stored in object storage, not in PostgreSQL">
Status: Proposed | Accepted | Superseded by ADR-NNN     Date: YYYY-MM-DD

## Context
The forces: requirement, constraint, numbers (size, rate, cost), what breaks if we do nothing.

## Options considered
1. <option>: pros / cons, cost, operational load
2. <option>: ...
Free-first / enterprise-ready check: does the free reference still run? What does an enterprise swap?

## Decision
One paragraph. What we do and, if relevant, what we explicitly do not do.

## Consequences
Positive, negative, and the follow-up work (migration, docs, runbook entry, dashboard panel).

## Revisit when
The concrete requirement or number that would reopen this (e.g. "a second consumer of audit events", "> 50 req/s sustained").
```

## Checklist
- The title is the decision, not the topic.
- Every rejected option says why it lost, in one line.
- `docs/PRODUCTION-GAPS.md` updated if the decision leaves a gap in the free reference.
- Code that implements the decision references it in a comment (`// ADR-011`).
- Commit as `docs: ADR-NNN <title>`.
