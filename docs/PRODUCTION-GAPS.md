# Production gaps: what the free reference demonstrates, and what an enterprise replaces

This repository shows a working application on architecture that can grow into an enterprise platform. It is not that
platform. The table is the honest boundary. The left column is real and verified; the right column is what a bank,
insurer or large company would put in its place, and the application code does not change for any of them.

| Concern | Reference deployment (free) | Enterprise production |
|---|---|---|
| Compute | One OCI Always Free ARM VM running K3s | Multi-node managed Kubernetes (OKE, EKS, AKS, GKE, OpenShift) across availability zones |
| Availability | None. One node, one disk. A VM failure is an outage. | Node pools, pod disruption budgets, multi-AZ, tested failover |
| Database | PostgreSQL 18 in a pod on a persistent volume | Managed HA PostgreSQL with automated failover and point-in-time recovery, or Oracle (see ORACLE-MIGRATION.md) |
| Identity | Keycloak in a pod, realm imported from Git with development users | Central IdP (enterprise Keycloak cluster, Entra ID, Okta) with MFA, federation and lifecycle management |
| Secrets | Kubernetes Secrets (base64, not encrypted at rest by default) | OCI Vault, HashiCorp Vault or a cloud secret manager via External Secrets Operator; encryption at rest; rotation |
| TLS | cert-manager with Let's Encrypt | Corporate PKI, internal CA, certificate inventory and rotation policy |
| Ingress | Traefik bundled with K3s, public IP on the VM | Load balancer, WAF, DDoS protection, private ingress for admin surfaces |
| Object storage | MinIO in a pod (or OCI Object Storage free 20 GB) | Managed object storage with lifecycle rules, versioning and cross-region replication |
| Observability | Prometheus, Loki, Tempo, Grafana in pods with days of retention | Central observability platform, long retention, SLO tooling, on-call paging integration |
| Backups | CronJob `pg_dump` to a volume, optional upload to Object Storage; restore tested by script | Managed backups with PITR, tested DR runbooks, off-region copies, retention governed by policy |
| Container hardening | API, frontend and backup run as non-root with all capabilities dropped; root filesystems are writable (Trivy KSV-0014, reported in the Security tab) | Read-only root filesystems with `emptyDir` for `/tmp` and caches, verified on the cluster; admission policies (Kyverno, Gatekeeper) that reject pods without them |
| CI/CD | GitHub Actions building, scanning and pushing images; deployment by `helm upgrade` over SSH | GitOps (Argo CD), signed images verified at admission, environment promotion with approvals |
| Supply chain | Trivy, CodeQL, dependency and secret scanning, CycloneDX SBOM | The same plus an artifact repository with policy, admission control on signatures, SLSA provenance |
| Network | Flat cluster network | Network policies, service mesh where justified, egress control |
| Region | Single region | Multi-region only where requirements demand it |
| Compliance | Audit events in the database | Audit forwarding to an immutable store, retention policies, access reviews |
| Scale | One API replica, one database | Horizontal API replicas, read replicas, CDN for the SPA; see ARCHITECTURE.md §6 |

What the reference gets right and an enterprise keeps: the clean architecture and its enforcement, Liquibase
migrations, optimistic locking, Problem Details, OIDC with PKCE and a resource server, structured logs with trace
correlation, health probes, Helm as the deployment unit, multi-arch non-root images, tests that run against a real
PostgreSQL, and documentation that says what was executed.
