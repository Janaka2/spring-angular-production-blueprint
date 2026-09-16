# ADR-006: OpenTelemetry-based observability with the Grafana stack

**Status:** accepted · **Date:** 2026-09-16

## Context

Operations need metrics, logs and traces that correlate, using components that are current and open.

## Options

Vendor APM agent; Micrometer with a proprietary backend; OpenTelemetry with Prometheus, Loki, Tempo and Grafana.

## Decision

Micrometer for metrics (Prometheus scrape), spring-boot-starter-opentelemetry for traces (OTLP to a collector, then Tempo), structured JSON logs on stdout collected into Loki, Grafana dashboards and alert rules in Git.

## Consequences

Open formats, no lock-in, transferable to any OTLP-compatible backend. Five extra containers in the observability profile; the core profile runs without them.
