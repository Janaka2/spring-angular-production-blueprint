# Version matrix

Every version below was checked against its official release page on **16 September 2026**, the day this
project was started. Versions managed by Spring Boot are taken from the Spring Boot 4.1.1 dependency table and are
not overridden in the build. Update this file when you upgrade; it is the single place that says what the project runs on.

## Runtime and language

| Component | Version | Source of truth | Notes |
|---|---|---|---|
| Java | 25 (LTS), Temurin 25.0.4.1+1 | adoptium.net | Backend compiled and run on 25; Spring Boot 4 keeps a Java 17 baseline |
| Node.js | 24.21.0 (Active LTS) | nodejs.org | Angular 22 supports Node 22.22+, 24.15+ and 26 |
| TypeScript | 6.0.3 | npm | Angular 22.1 requires `>=6.0 <6.1`; TypeScript 7 is out but not yet supported |
| PostgreSQL | 18.6 | postgresql.org | 18 is the current major; 17.11 is the fallback where 18 images are not yet available |

## Backend

| Component | Version | Managed by |
|---|---|---|
| Spring Boot | 4.1.1 (20 Aug 2026) | parent POM |
| Spring Framework 7, Spring Security 7, Spring Data 2026.0 | as managed | Spring Boot BOM |
| Hibernate ORM | 7.4.5.Final | Spring Boot BOM |
| HikariCP | 7.0.2 | Spring Boot BOM |
| Liquibase | 5.0.3 | Spring Boot BOM |
| PostgreSQL JDBC | 42.7.13 | Spring Boot BOM |
| Jackson | 3.x (Spring Boot 4 default) | Spring Boot BOM |
| Micrometer | 1.17.1 · Tracing 1.7.1 | Spring Boot BOM |
| OpenTelemetry API | 1.62.0 via `spring-boot-starter-opentelemetry` | Spring Boot BOM |
| Tomcat (embedded) | 11.0.24 | Spring Boot BOM |
| Caffeine | 3.2.4 | Spring Boot BOM |
| springdoc-openapi | 3.1.1 (Spring Boot 4 line) | explicit |
| JUnit | 6.0.3 · AssertJ 3.27.7 · Mockito 5.23.0 | Spring Boot BOM |
| Testcontainers | 2.0.5 | Spring Boot BOM |
| ArchUnit | 1.5.0 | explicit |
| Maven | 3.9.x via Maven Wrapper | `backend/mvnw` |

## Frontend

| Component | Version |
|---|---|
| Angular (core, CLI) | 22.1.6 core · 22.1.8 CLI (v22 GA 3 Jun 2026) |
| Angular Material and CDK | 22.1.7 |
| angular-oauth2-oidc | 22.0.2 (OIDC Authorization Code + PKCE) |
| angular-eslint | 22.5.0 · ESLint 10.10.0 · Prettier 3.9.7 |
| Playwright | 1.63.0 |

## Identity, platform and observability

| Component | Version |
|---|---|
| Keycloak | 26.7.4 (16 Sep 2026) |
| K3s | v1.37.0+k3s1 (Kubernetes 1.37) |
| Helm | 4.3.0 |
| cert-manager | v1.21.2 |
| Traefik | bundled with K3s |
| Prometheus | v3.14.0 |
| Grafana | v13.2.2 |
| Loki | v3.7.7 |
| Tempo | v3.0.3 |
| OpenTelemetry Collector (contrib) | v0.161.0 |
| Trivy | v0.74.0 |
| k6 | v2.2.0 |

## Policy

- Spring-managed versions are never pinned in `pom.xml` without an ADR explaining why.
- Container images are pinned to a tag and, in Helm values, to a digest once an image has been built by CI. `latest` is never deployed.
- The observability stack is pinned to the versions above in `docker-compose.observability.yml` and in the Helm values.
