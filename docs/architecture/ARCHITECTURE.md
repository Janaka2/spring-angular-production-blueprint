# AssetCare architecture

AssetCare is a personal and enterprise asset-maintenance manager: the things you own or operate, what they cost,
when their warranties end, what maintenance is due, what was done to them, and a trustworthy history of who changed what.
It is built as **one Angular SPA plus one independently deployable Spring Boot service** on PostgreSQL, with Keycloak
for identity and an OpenTelemetry-based observability stack. Every diagram here is text so it lives in Git.

## 1. System context

```mermaid
flowchart LR
    U[Person: user, admin or auditor] -->|HTTPS| A[AssetCare SPA<br/>Angular 22]
    A -->|OIDC Authorization Code + PKCE| K[Keycloak]
    A -->|REST /api/v1 + Bearer JWT| B[AssetCare API<br/>Spring Boot 4.1]
    B -->|validates JWT against issuer| K
    B -->|JDBC| P[(PostgreSQL 18)]
    B -->|attachments| O[(Object storage<br/>MinIO locally, OCI Object Storage in the cloud)]
```

The browser talks to two things: the SPA's static files and the API. The API is the only component that talks to the
database. Keycloak owns identity; the application never stores a password.

## 2. Container diagram

```mermaid
flowchart TB
    subgraph Browser
        SPA[Angular SPA<br/>static files served by nginx]
    end
    subgraph Kubernetes["Kubernetes (K3s on one OCI ARM VM for the reference deployment)"]
        ING[Traefik ingress + cert-manager TLS]
        FE[frontend container<br/>nginx, non-root]
        API[assetcare-api container<br/>JVM 25, non-root]
        KC[Keycloak]
        PG[(PostgreSQL 18<br/>persistent volume)]
        MINIO[(MinIO<br/>attachments)]
        subgraph Observability
            OTEL[OpenTelemetry Collector]
            PROM[Prometheus]
            LOKI[Loki]
            TEMPO[Tempo]
            GRAF[Grafana]
        end
    end
    SPA --> ING
    ING --> FE
    ING --> API
    ING --> KC
    API --> PG
    API --> MINIO
    API -->|metrics scrape| PROM
    API -->|OTLP traces| OTEL --> TEMPO
    API -->|JSON logs on stdout| LOKI
    PROM --> GRAF
    LOKI --> GRAF
    TEMPO --> GRAF
```

Two Helm profiles exist because the free VM is small: **core** (frontend, API, PostgreSQL, Keycloak, MinIO) and
**observability** (adds the collector, Prometheus, Loki, Tempo, Grafana). See `docs/operations/OCI-FREE-TIER.md`.

## 3. Backend: clean architecture and dependency direction

```mermaid
flowchart LR
    subgraph adapter_in["adapter.in.web"]
        C[REST controllers<br/>DTOs, Problem Details, OpenAPI]
    end
    subgraph application["application"]
        S[Use cases / application services<br/>transactions, authorization checks, audit]
        PORTS[Ports: repositories, storage, clock, current user]
    end
    subgraph domain["domain"]
        D[Asset, Category, MaintenanceItem, ServiceRecord, Attachment, AuditEvent<br/>invariants, lifecycle rules]
    end
    subgraph adapter_out["adapter.out"]
        J[persistence: JPA entities, Spring Data repositories]
        ST[storage: local filesystem, MinIO/S3, OCI Object Storage]
    end
    subgraph infra["infrastructure / configuration"]
        SEC[Spring Security resource server]
        OBS[Actuator, Micrometer, OpenTelemetry]
        CFG[Spring configuration]
    end
    C --> S
    S --> D
    S --> PORTS
    J -. implements .-> PORTS
    ST -. implements .-> PORTS
    SEC --> C
    OBS --> C
```

Arrows point inward. `domain` depends on nothing from Spring, JPA, HTTP, Keycloak or the cloud. `application` depends
on `domain` and defines the ports it needs. Adapters depend on `application` and `domain` and implement the ports.
This is enforced by ArchUnit tests in `backend/src/test/java/.../architecture`, not by convention alone.

Package layout:

```text
me.janaka.assetcare
├── domain              entities as plain Java (records and classes), value objects, domain exceptions
├── application         use-case services, ports (interfaces), commands/queries, authorization policy
├── adapter
│   ├── in.web          controllers, request/response DTOs, mappers, error handling
│   └── out
│       ├── persistence JPA entities, Spring Data repositories, port implementations
│       └── storage     attachment storage implementations
├── infrastructure      security, observability, auditing, idempotency, clock
└── configuration       @Configuration classes and properties
```

Where future services could be extracted, and why not yet: a **notification service** (due-date reminders by e-mail
or push) and a **document service** (attachment processing, previews) would each be a natural boundary because they
have their own scaling profile and external dependencies. A **reporting service** would follow if read load or
analytical queries diverge from transactional ones. None of them exists today because no requirement needs them; the
`application` layer already isolates the seams, so extraction is a move of code behind a port, not a rewrite.

## 4. Deployment architecture (reference)

```mermaid
flowchart TB
    DNS[assetcare.example.com<br/>DNS A record] --> VM
    subgraph VM["OCI Always Free ARM VM (4 OCPU, 24 GB)"]
        subgraph K3s
            T[Traefik ingress<br/>TLS from cert-manager + Let's Encrypt]
            T --> FE[frontend]
            T --> API[assetcare-api]
            T --> KC[Keycloak]
            API --> PG[(PostgreSQL PVC)]
            API --> MINIO[(MinIO PVC)]
            OBS[[observability profile]]
        end
        CRON[backup CronJob: pg_dump → compressed → retained → optional OCI Object Storage]
        CRON --> PG
    end
```

This is one VM. It is not highly available and is not described as such anywhere in this repository.
`docs/PRODUCTION-GAPS.md` lists what an enterprise replaces: managed multi-node Kubernetes, managed HA PostgreSQL or
Oracle, a vault for secrets, corporate PKI, multi-AZ.

## 5. Request trace

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as Angular
    participant I as Ingress
    participant S as Spring Boot
    participant P as PostgreSQL
    B->>A: click "Save asset"
    A->>I: PUT /api/v1/assets/{id} + Authorization: Bearer <JWT> + If-Match: "3"
    I->>S: forward (adds X-Forwarded-*)
    Note over S: RequestIdFilter: X-Request-Id or new UUID → MDC.requestId<br/>OpenTelemetry: traceId/spanId → MDC
    S->>S: JWT validated (issuer, audience, expiry) → roles
    S->>S: AssetService.update(): load, check version, apply, audit
    S->>P: UPDATE asset … WHERE id=? AND version=3
    P-->>S: 1 row (or 0 → OptimisticLockException → 409)
    S->>P: INSERT audit_event (…, request_id, trace_id)
    S-->>I: 200 + ETag: "4" + X-Request-Id
    I-->>A: response
    A-->>B: updated view
```

Every log line the API writes during that request carries `traceId`, `spanId` and `requestId`. The trace is in Tempo,
the metrics in Prometheus, the log lines in Loki, and Grafana links the three by the trace id.

## 6. Scaling path

From one Angular container, one API replica and one PostgreSQL:

1. **First bottleneck: the API's database connection pool and PostgreSQL CPU.** Add API replicas (stateless, so this is
   a number in Helm values) and size Hikari so `replicas × pool` stays below PostgreSQL `max_connections` with headroom.
2. **Read load:** indexes already exist for the list, search and due-date queries; add Caffeine caching for categories and
   reference data. Redis only when several replicas need a shared cache with invalidation.
3. **Database:** move to a managed HA PostgreSQL (or Oracle, see `docs/architecture/ORACLE-MIGRATION.md`); add read replicas
   for reporting when analytical queries appear.
4. **Static assets:** put the SPA behind a CDN.
5. **Asynchronous work:** notifications and document processing through a transactional outbox and a broker, extracted
   into their own services as described above. Kafka appears at that point and not before.

See also `DOMAIN-MODEL.md` (concepts) and `DATABASE-MODEL.md` (the physical schema with diagrams).
