# Backup and restore

A backup that has never been restored is a hope, not protection. This page describes both halves and how each is tested.

## What is backed up

- **PostgreSQL**: everything that is business data, including audit events. `scripts/backup.sh` produces a compressed,
  timestamped `pg_dump` with a SHA-256 checksum, keeps the newest 14 locally, and uploads to an S3-compatible bucket
  (OCI Object Storage's S3 API) when `BACKUP_S3_BUCKET` is set.
- **Attachments** live in object storage, which has its own durability; enable versioning on the bucket and, in an
  enterprise, cross-region replication. MinIO in the reference deployment is backed up by mirroring its bucket
  (`mc mirror`) to the same backup bucket.
- **Keycloak**: the realm is in Git (`deploy/docker/keycloak/assetcare-realm.json`); users created at runtime live in
  Keycloak's own database, which the same `pg_dump` procedure covers when Keycloak shares the PostgreSQL instance.

## Schedule

Local: run `make backup` before risky changes. Kubernetes: a `CronJob` in the Helm chart (`backup.enabled=true`) runs
the same script nightly at 02:30 UTC with the dumps on a persistent volume and, when configured, in Object Storage.

## Restore

```bash
make restore                                  # newest dump into the compose database
make restore FILE=backups/assetcare-20260916-120000.sql.gz
DATABASE_URL=postgres://... scripts/restore.sh dump.sql.gz   # any PostgreSQL
```

The compose restore loads the dump into a `_restore` database, then swaps names so the previous database survives as
`_previous` for one cycle. In Kubernetes the same script runs from a `Job` against the service (`deploy/helm/…/restore-job.yaml`).

## Restore test

The restore is tested, not assumed: CI runs `backup.sh` against a PostgreSQL service, restores the dump into a fresh
database, and checks that the Liquibase changelog and the row counts match (`.github/workflows/ci.yml`, job `backup-restore`).
Record the last manual restore drill in the runbook.

## Recovery objectives (reference deployment)

- RPO: 24 hours (nightly dump). Shorter needs PITR with WAL archiving, which a managed PostgreSQL provides.
- RTO: about 15 minutes for a restore from Object Storage into a fresh pod. Rebuilding the whole VM from scratch with the
  documented steps is about one hour.
