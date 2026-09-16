# Replacing PostgreSQL with Oracle Database

The reference runs PostgreSQL because it is free and trivial to run everywhere. Many enterprises standardise on Oracle.
The application is written so that swapping the database touches the persistence adapter and the migrations, not the
domain or the application layer. This is what changes.

| Area | PostgreSQL (reference) | Oracle | What to do |
|---|---|---|---|
| JDBC driver | `org.postgresql:postgresql` (managed by Spring Boot) | `com.oracle.database.jdbc:ojdbc17` (managed by Spring Boot) | swap the dependency; URL `jdbc:oracle:thin:@//host:1521/SERVICE` |
| Hibernate dialect | auto-detected `PostgreSQLDialect` | auto-detected `OracleDialect` | nothing, unless a native query is used |
| Identifiers | `uuid` column type | `RAW(16)` (Hibernate maps `UUID` to it) | keep `UUID` in Java; Liquibase `type: uuid` maps to `RAW(16)` on Oracle |
| JSON columns | `jsonb` for `audit_event.changed_fields` | `JSON` (Oracle 21c+) or `CLOB` with a check constraint | in Liquibase use `type: ${json.type}` with a property per DBMS |
| Booleans | `boolean` | `NUMBER(1)` with a check constraint (Oracle 23ai has `BOOLEAN`) | Liquibase `type: boolean` handles it |
| Text | `text` | `VARCHAR2(4000)` or `CLOB` | Liquibase `type: clob` for notes; `varchar(n)` elsewhere; Oracle limits index keys |
| Case-insensitive search | `ILIKE` | `UPPER(col) LIKE UPPER(?)` with a function-based index | keep search in one adapter method and provide a dialect-specific implementation, or use `lower()` on both sides everywhere |
| Sequences and identity | not used: UUIDs are generated in the application | same | nothing |
| Timestamps | `timestamptz` | `TIMESTAMP WITH TIME ZONE` | Liquibase `type: timestamp with time zone`; keep UTC in Java |
| Pagination | `LIMIT/OFFSET` | `OFFSET … FETCH NEXT` (12c+) | Hibernate generates it |
| Empty string | distinct from `NULL` | `''` is `NULL` | never rely on empty strings; validation rejects blank values |
| Indexing | B-tree, partial indexes with `WHERE` | no partial indexes; use function-based or filtered by design | replace the partial index on `archived_at IS NULL` with a composite index on `(owner, status)` |
| Locks and MVCC | MVCC, `SELECT … FOR UPDATE` | MVCC with different lock escalation | optimistic locking (`@Version`) behaves identically |
| Testcontainers | `postgres:18` | `gvenzl/oracle-free` | a second integration test profile |
| Operations | `pg_dump`, `pg_restore` | RMAN, Data Pump | replace `scripts/backup.sh` and `restore.sh`; connection pool sizing follows Oracle session limits |

Migration plan: add an Oracle Liquibase property set, run the changelog against `gvenzl/oracle-free` in CI, run the
integration suite against both, then switch the production datasource. Keep native SQL to the search query and write
it twice if needed. Everything above the persistence adapter stays as it is.
