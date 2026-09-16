# Contributing

1. Read `docs/architecture/ARCHITECTURE.md`, `docs/CODING-STANDARDS.md` and `docs/DEFINITION-OF-DONE.md`.
2. Branch from `main` (`feat/…`, `fix/…`, `docs/…`). `main` is protected; changes arrive by pull request.
3. Keep commits logical and prefixed (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`).
4. Every behaviour change has a test. Schema changes are Liquibase changesets with a rollback and a reason.
5. A decision that constrains the future gets an ADR in `docs/adr/`.
6. Run `make test` and `make lint` before pushing; CI runs the full pipeline including Testcontainers, scans and images.
7. Never commit secrets. `.env` is ignored; development credentials live only in `.env.example` and the realm export, labelled.

Be kind in reviews and specific in comments. The goal is a reference other people can trust.
