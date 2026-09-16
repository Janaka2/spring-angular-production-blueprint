# Scaling AssetCare

Instances are stateless: no HTTP session, no local file state (attachments are in object storage), no in-memory state
that another replica would need. That is what makes every step below a configuration change rather than a code change.

## Step 0: what you have

One Angular container (nginx), one API replica, one PostgreSQL, one Keycloak. Fine for hundreds of users.

## What breaks first, and what to do

| Symptom | Likely bottleneck | Action |
|---|---|---|
| p95 latency rises with concurrent users; `hikaricp_connections_pending` > 0 | API pool exhausted | more API replicas (`replicaCount` in Helm); pool size × replicas must stay under PostgreSQL `max_connections` minus 20 for admin and Keycloak |
| PostgreSQL CPU high on list/search | missing or wrong index; `ILIKE` without trigram support | check `EXPLAIN ANALYZE` (see below); add a `pg_trgm` GIN index on searched columns when search volume justifies it |
| Same reference data read on every request | categories fetched per call | Caffeine cache on categories with a 5-minute TTL and invalidation on admin change (already in place); Redis only when several replicas must share invalidation instantly |
| Slow reports | analytical queries on the transactional database | read replica; later a reporting service |
| Attachment traffic | object storage bandwidth | it already scales independently; put a CDN in front for downloads |
| Static assets | nginx pod | CDN in front of the SPA; it is just files |
| Notifications, document processing | synchronous work in requests | transactional outbox → broker → a worker; extract a service when its scaling profile differs |

## Sizing the pool

`spring.datasource.hikari.maximum-pool-size` defaults to 10. With 3 replicas that is 30 connections. PostgreSQL 18's
default `max_connections` is 100. Leave room for Keycloak (its own pool), migrations and administrators.
Measure with `hikaricp_connections_active` and `hikaricp_connections_pending` before changing anything.

## Reading a plan

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM asset
WHERE owner = 'sub-1' AND status <> 'ARCHIVED' AND name ILIKE '%laptop%'
ORDER BY updated_at DESC LIMIT 20;
```

Look for `Seq Scan` on `asset` with many rows filtered: that is the signal the `(owner, status, updated_at)` index is
not being used or a trigram index is missing. `Buffers: shared hit` versus `read` tells you whether the working set is
in memory.

## Beyond one database

Managed HA PostgreSQL (or Oracle RAC in enterprises) for failover; read replicas for read scaling; sharding is not on
this application's horizon and should not be pretended.
