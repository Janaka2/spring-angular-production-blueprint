# Security policy

**Reporting a vulnerability.** E-mail janaka2@gmail.com with "AssetCare security" in the subject. Do not open a public
issue. You will get an acknowledgement within three working days and a fix or a plan within fourteen.

**Scope.** The application code, the Helm chart, the compose files, the CI workflows and the documentation in this
repository. The development credentials in `.env.example` and the Keycloak realm export are intentionally public and
are not a finding.

**Supported versions.** The `main` branch and the latest tagged release.

**What the project does about security.** See `docs/security/SECURITY-PRINCIPLES.md` for the controls and where each is
enforced, and `docs/PRODUCTION-GAPS.md` for what an enterprise deployment adds.
