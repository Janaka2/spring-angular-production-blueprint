# Changelog

All notable changes to AssetCare. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project uses [semantic versioning](https://semver.org/): a breaking API or schema contract is a major version, a feature
a minor one, a fix a patch.

## [1.0.0] - 2026-09-23

The first release: a complete asset-maintenance application and the template it is meant to be, from the domain model to
signed multi-architecture images, a Helm chart and a documented path to a free Kubernetes deployment on Oracle Cloud.

### Features
- Asset management: create, search, filter, sort and page (state kept in the URL), edit with conflict detection
  (`If-Match`, 409 `stale-version`), idempotent creates (`Idempotency-Key`), status changes, archive and admin restore,
  CSV export, drafts and unsaved-change protection.
- Maintenance planning with recurrence and rescheduling, service records, attachments on S3-compatible storage with
  type and size limits, and a full audit trail of every write.
- Roles from Keycloak (USER, ADMIN, AUDITOR) enforced by one authorization policy in the API; the UI only shapes what
  it shows.
- A modern, minimal interface built on one set of design tokens: sidebar shell, Ctrl/⌘ K command menu, dashboard with
  an agenda of due work, skeleton loading, status pills, timelines, drag-and-drop upload, first-class dark mode, phone
  layout, and an app icon for the tab, iOS and Android.
- Operations: structured logs, OpenTelemetry traces and metrics with an optional observability stack, health probes,
  backup and restore scripts, a smoke test, k6 scenarios, and a Helm chart for any Kubernetes (reference: K3s on one OCI
  Always Free ARM VM, with TLS from Let's Encrypt).

### Security
- Tomcat pinned to 11.0.26 for CVE-2026-65182, CVE-2026-65905 and CVE-2026-68525 (critical), which Spring Boot 4.1.1
  does not manage yet.
- Every frontend response carries the Content-Security-Policy, X-Frame-Options, nosniff, Referrer-Policy and
  Permissions-Policy headers; the production build runs under the strict CSP without inline scripts.
- Images run as non-root users with all capabilities dropped; releases are scanned with Trivy, carry a CycloneDX SBOM,
  are signed with cosign (keyless) and have build provenance.

### Fixed (found while taking the application to production)
- The API did not start on Spring Boot 4.1 (ambiguous CORS and upload-size handlers), and list endpoints failed on lazy
  associations.
- The SPA stopped at "Loading AssetCare…" (`inject()` after `await`), the version call failed CORS, and Keycloak's `iss`
  parameter stayed in the URL after login.
- A duplicate asset tag returned 500 instead of a 409 Problem Details response.
- The initial schema did not match the entities for Hibernate validation.
- The Helm chart referenced MinIO images that could not be pulled; the OCI Terraform configuration was invalid.
- `docker compose up --wait` failed at random on the bucket-creation container.

### CI/CD
- `ci`: backend unit, ArchUnit and Testcontainers tests; frontend lint, format, unit and build; Playwright against the
  production frontend image with a real Keycloak and API; a backup, damage, restore drill; the smoke test; Helm, compose
  and Terraform validation; image builds with a Trivy gate.
- `security`: CodeQL (Java, TypeScript), Trivy on dependencies and configuration, gitleaks over the full history,
  dependency review, weekly and on every change.
- `release`: native amd64 and arm64 builds, one manifest per image, scan, SBOM, signature, provenance, and a GitHub
  release with the Helm chart.

### Operator notes
- New installations only: the schema is created by Liquibase changesets 001 to 007 and 100; the `dev` context adds
  demo data, the `prod` context does not. From this release on, schema changes are new changesets only.
- Local databases created before commit `4ed09c4` must be recreated once: `docker compose down -v`.
- Container packages on GHCR are private when first published; make them public, or give the cluster a pull secret
  (`docs/ENVIRONMENT-SETUP.md`, P3 and P10).
- Known gap: container root filesystems are writable (Trivy KSV-0014, reported in the Security tab); see
  `docs/PRODUCTION-GAPS.md`.

[1.0.0]: https://github.com/Janaka2/spring-angular-production-blueprint/releases/tag/v1.0.0
