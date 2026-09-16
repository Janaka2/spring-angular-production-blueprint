# Observability

Three signals, one place to look, and identifiers that tie them together.

| Signal | Produced by | Collected by | Looked at in |
|---|---|---|---|
| Metrics | Spring Boot Actuator + Micrometer at `/actuator/prometheus` (HTTP, JVM, GC, HikariCP, cache, custom) | Prometheus scrape every 15 s | Grafana dashboard *AssetCare · overview* |
| Traces | `spring-boot-starter-opentelemetry`: one span per request, JDBC and outbound calls as children, exported over OTLP | OpenTelemetry Collector → Tempo | Grafana Explore (TraceQL), or the link from a log line |
| Logs | Structured JSON on stdout (`ASSETCARE_LOG_FORMAT=ecs`), every line with `traceId`, `spanId`, `requestId` | Collector's filelog receiver → Loki | Grafana Explore (LogQL), or the link from a trace |
| Business audit | `audit_event` table, with `request_id` and `trace_id` | the database | the History tab, or SQL |

## Correlation

A request enters with or without `X-Request-Id`. `RequestIdFilter` puts it in the MDC and returns it in the response.
The tracer puts `traceId` and `spanId` in the MDC. Every log line during the request carries all three. The audit event
written by the use case stores `requestId` and `traceId`. The Problem Details body of an error carries both. Grafana's
Loki data source turns a `traceId` in a log line into a link to the trace in Tempo, and Tempo links back to the logs of
that trace. A support ticket that quotes a request id can therefore be traced from the user's screen to the SQL.

## Running it locally

```bash
make observability            # collector, Prometheus, Loki, Tempo, Grafana on http://localhost:3000 (admin/admin)
ASSETCARE_LOG_FORMAT=ecs make backend
```

Prometheus scrapes the API on the host through `host.docker.internal`. Traces go to the collector on `localhost:4318`.
Open Grafana, folder *AssetCare*, dashboard *overview*: requests per second, error rate, p50/p95/p99, JVM heap, GC,
threads, CPU, Hikari active/idle/pending and utilisation, and the Kubernetes row when the metrics exist.

## What each panel tells you

- **Latency percentiles** rising while **requests per second** is flat: the database or the pool. Check the Hikari row.
- **Pending connections** above zero: the pool is exhausted; requests are queueing for a connection. See SCALING.md.
- **GC pause time** rising with **heap** near max: a leak or an under-sized container.
- **5xx rate** with normal latency: a bug; find the trace of a failed request by `status_code=500` in Tempo.

## Alerts

`observability/prometheus/rules.yml`, each with its threshold explained: API down 2 minutes, 5xx above 2% for
5 minutes, p95 above 500 ms for 10 minutes, pool above 85% for 5 minutes, pending connections, heap above 90%,
pod restarts, volume nearly full. The Helm chart loads the same rules into the observability profile.

## Health probes

`/actuator/health/liveness` says the process is alive (JVM up, application context not broken). `/actuator/health/readiness`
says it can serve traffic: the database is reachable. Kubernetes restarts a pod that fails liveness and stops routing to a
pod that fails readiness. A process can be alive and not ready (database down, migrations running); that is why both exist.

## Never logged

Access tokens, refresh tokens, passwords, secret keys, attachment contents, or personal data beyond identifiers.
The `Authorization` header is not logged by any component in this repository.
