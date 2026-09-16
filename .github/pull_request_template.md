## What and why
<!-- one paragraph: the behaviour change and the reason. Link the issue or ADR. -->

## Checklist
- [ ] Tests: unit for rules, integration for the API path, Vitest/Playwright for UI changes
- [ ] Schema change is a Liquibase changeset with a reason and a rollback, expand/contract safe
- [ ] Errors are Problem Details; authorization goes through `AuthorizationPolicy`; writes record an audit event
- [ ] OpenAPI and `docs/` updated (DOMAIN-MODEL, RUNBOOK, HEALTH-MONITORING, PRODUCTION-GAPS as relevant)
- [ ] Config changes have a default in `application.yml`, a Helm value and a line in the release notes
- [ ] No secret, token or PII added anywhere (code, tests, fixtures, logs)
- [ ] Decision that constrains the future → ADR

## Operator notes
<!-- migration, new env var, new alert, manual step? "none" is a valid answer. -->
