---
name: release
description: Cut an AssetCare release, from version bump to signed multi-arch images, chart package and deployment, with the checks in order. Use for "release", "tag", "publish images", "deploy version".
---

# Release

## Preconditions
- `main` is green: `gh run list --branch main --limit 3` shows `ci` and `security` succeeded.
- `docs/PRODUCTION-GAPS.md` and the README verification report reflect reality for this version.
- No open `stale-version` or migration concern: every new changeset has a rollback and is expand/contract.

## Steps
1. Choose the version (semver): breaking API or schema contract → major; feature → minor; fix → patch.
2. Bump: `backend/pom.xml` `<version>`, `frontend/package.json` `version`, `deploy/helm/assetcare/Chart.yaml`
   `version` and `appVersion`, `values.yaml` `image.tag`. One commit: `chore(release): vX.Y.Z`.
3. Changelog: `CHANGELOG.md` section from `git log --oneline vPREV..HEAD`, grouped feat/fix/docs/chore; note any
   migration or config change an operator must know.
4. Tag and push: `git tag -a vX.Y.Z -m "AssetCare X.Y.Z" && git push origin main vX.Y.Z`.
5. Watch `gh run watch` for `release`: images for amd64 and arm64 pushed to GHCR, Trivy clean, cosign signature and
   provenance attached, chart `.tgz` on the GitHub release.
6. Verify the artefacts:
   ```bash
   cosign verify --certificate-identity-regexp 'github.com/Janaka2/' --certificate-oidc-issuer https://token.actions.githubusercontent.com \
     ghcr.io/janaka2/spring-angular-production-blueprint/assetcare-api:X.Y.Z
   docker manifest inspect ghcr.io/janaka2/spring-angular-production-blueprint/assetcare-api:X.Y.Z | grep architecture
   ```
7. Deploy: `helm upgrade --install ... --set image.tag=X.Y.Z --wait` (DEPLOYMENT.md §4), then
   `scripts/smoke-test.sh https://<host>` and `scripts/health.sh k8s assetcare`.
8. Watch the dashboard for fifteen minutes: error rate, p95, restarts. Roll back with `helm rollback` if either alert fires.

## Never
- Publish or reference `latest`.
- Release from a branch other than `main`.
- Skip the smoke test because "it is a small change".
