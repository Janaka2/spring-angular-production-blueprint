# Security principles

These are the rules the code follows. Each links to where it is enforced. The threat model is OWASP Top 10 for the
API and the SPA, plus the supply chain.

| Principle | How AssetCare does it | Where |
|---|---|---|
| Identity is external | Keycloak issues OIDC tokens; the application never sees a password | ADR-003, `infrastructure/security` |
| The backend is the authority | Every endpoint requires a valid JWT; roles are read from the token; ownership is checked per aggregate in the application layer. The UI hides what a user may not do, and the API refuses it regardless | `AuthorizationPolicy`, security tests |
| Least privilege | `USER` sees own assets; `AUDITOR` reads everything, writes nothing; `ADMIN` manages configuration and can restore or hard-delete. Database user has no DDL rights at runtime (Liquibase runs with a separate, migration-time role in production) | realm export, Helm values |
| Validate input at the edge | Bean Validation on request DTOs; size limits; enums for closed sets; UUIDs parsed, never trusted as strings | `adapter.in.web` DTOs |
| No mass assignment | Request DTOs are records with exactly the fields a client may set; entities are never bound from JSON | DTOs and mappers |
| No insecure direct object references | Every read and write loads by id **and** checks ownership or role; 404 for what you may not see, 403 for what you may see but not change | use cases |
| Output encoding | Angular escapes by default; the API returns JSON only; no HTML is rendered from user input | Angular templates |
| CSRF | Not applicable to a bearer-token API with no cookies; CSRF protection is disabled for `/api/**` and stated as such | `SecurityConfiguration` |
| CORS | Allowed origins are configuration, not `*`; only the SPA origin in each environment | `application.yml` per profile |
| Security headers | HSTS, `X-Content-Type-Options`, `X-Frame-Options`, a strict CSP on the SPA served by nginx | nginx config, Spring Security headers |
| SQL injection | JPA parameters and Spring Data; native search uses bound parameters; no string concatenation | persistence adapter |
| File uploads | Content-type allowlist, size limit, filename sanitised, bytes stored outside the database under a generated key, SHA-256 recorded; downloads served with `Content-Disposition: attachment` | attachment use case |
| Rate limiting | Ingress-level rate limit on `/api/**` (Traefik middleware); the API returns 429 with Problem Details if a per-user limit is hit | Helm ingress, `RateLimitFilter` |
| Secrets | Never in Git. Development credentials are in `.env.example` and the realm export, labelled. Production secrets are Kubernetes Secrets in the reference and a vault in enterprise | ADR, PRODUCTION-GAPS |
| Dependencies and images | CodeQL, dependency review, Trivy on images, CycloneDX SBOM in CI; images are non-root, minimal, pinned | `.github/workflows` |
| TLS | HTTPS at the ingress with cert-manager; HTTP redirects | Helm |
| Logging | Structured; tokens and secrets are never logged; personal data only as identifiers | logging config, review rule |
| Denial of service | Request size limits, pagination caps (`size ≤ 100`), timeouts on the client, resource limits on pods | config |

Report a vulnerability as described in `SECURITY.md`.
