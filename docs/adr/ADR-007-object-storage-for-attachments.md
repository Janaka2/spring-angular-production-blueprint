# ADR-007: Object storage for attachments instead of database BLOBs

**Status:** accepted · **Date:** 2026-09-16

## Context

Documents and photos are large and grow without bound; a relational database is the wrong place for them (backup size, memory, cost).

## Options

bytea columns; a filesystem on the API pod; an S3-compatible object store behind a port.

## Decision

A storage port in the application layer with three adapters: local filesystem (development), MinIO (compose and K3s), OCI Object Storage (cloud). The database stores metadata and a SHA-256.

## Consequences

Attachments survive pod restarts and scale independently. One more component (MinIO) in the core profile; OCI Object Storage above the free 20 GB costs money and is labelled.
