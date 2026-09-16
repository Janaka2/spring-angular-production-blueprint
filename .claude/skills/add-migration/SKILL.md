---
name: add-migration
description: Add a Liquibase changeset to the AssetCare PostgreSQL schema with a reason, constraints, indexes, a rollback and backward compatibility for rolling deployments. Use for any table or column change.
---

# Add a migration

Files: `backend/src/main/resources/db/changelog/db.changelog-master.yaml` (includes, in order) and
`changes/NNN-<topic>.yaml`. Numbering: next free `NNN` below 100 for schema, 1xx for reference data, 9xx for dev-only.

## Rules
1. Never modify a changeset that has run anywhere (CI counts). Add a new one.
2. One concern per changeset, a `comment:` that says **why** (which query, which rule), and a `rollback:` block. Liquibase
   auto-rollback works for `createTable`, `addColumn`, `createIndex`; write it explicitly for everything else.
3. Rolling deployments run old and new code against the new schema for a few minutes. Therefore, expand/contract:
   - add columns as nullable or with a default; make them NOT NULL in a later release after a backfill;
   - never rename or drop a column the previous version reads; add the new, migrate, drop next release;
   - new NOT NULL foreign keys get a default row or are nullable first.
4. Types: `uuid` ids, `timestamp with time zone`, `numeric(19,4)` for money amounts, `varchar(n)` with a length that
   matches the DTO validation, `text` only for free text, `jsonb` only for genuinely schemaless data (audit diff).
5. Every foreign key has an index if it is filtered or joined on. Partial indexes for `archived_at IS NULL` queries.
   Note the Oracle difference in `docs/architecture/ORACLE-MIGRATION.md` when you use a PostgreSQL-only feature.
6. Constraints carry names (`ck_asset_status`, `uq_category_name`, `fk_service_record_asset`) so violations are
   readable in Problem Details and logs.

## Template
```yaml
databaseChangeLog:
  - changeSet:
      id: 008-maintenance-item-skipped
      author: <you>
      comment: >
        Skipped maintenance keeps its reason for the audit trail (requirement R-14).
        Nullable now; NOT NULL in a later release after backfill (expand/contract).
      changes:
        - addColumn:
            tableName: maintenance_item
            columns:
              - column: { name: skipped_reason, type: varchar(500) }
      rollback:
        - dropColumn: { tableName: maintenance_item, columnName: skipped_reason }
```
Then add `- include: { file: changes/008-maintenance-item-skipped.yaml, relativeToChangelogFile: true }` to the master.

## Verify
- Entity mapping matches (`ddl-auto: validate` fails the start otherwise): `make unit-test` does not cover it;
  `make integration-test` does (`SchemaIT`).
- `cd backend && ./mvnw -q liquibase:updateSQL` (with a running PostgreSQL) to read the SQL before committing.
- Rollback path: `./mvnw liquibase:rollback -Dliquibase.rollbackCount=1` on a scratch database.
- Update `docs/architecture/DOMAIN-MODEL.md` if the model changed. Commit as `feat:` with the feature, or `chore(db):`.
