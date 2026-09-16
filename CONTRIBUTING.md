# Contributing

1. Set up your machine with `docs/ENVIRONMENT-SETUP.md`; `make doctor` tells you when it is ready.
2. Read `docs/architecture/ARCHITECTURE.md`, `docs/CODING-STANDARDS.md` and `docs/DEFINITION-OF-DONE.md`.
3. Branch from `main` (`feat/…`, `fix/…`, `docs/…`). `main` is protected; changes arrive by pull request.
4. Keep commits logical and prefixed (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`).
5. Every behaviour change has a test. Schema changes are Liquibase changesets with a rollback and a reason.
6. A decision that constrains the future gets an ADR in `docs/adr/`.
7. Run `make test` and `make lint` before pushing; CI runs the full pipeline including Testcontainers, scans and images.
8. Never commit secrets. `.env` is ignored; development credentials live only in `.env.example` and the realm export, labelled.

Be kind in reviews and specific in comments. The goal is a reference other people can trust.
