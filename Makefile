# AssetCare developer commands. Every target here is exercised by CI or by the verification report; none is decorative.
# Requires: Java 25, Node 24+, Docker with Compose v2. `make doctor` checks.

SHELL := /bin/bash
BACKEND := backend
FRONTEND := frontend
MVN := ./mvnw -q -B

.PHONY: help doctor deps deps-down dev backend frontend build test unit-test integration-test arch-test lint e2e \
        observability observability-down docker helm-lint helm-template smoke-test backup restore clean

help: ## list targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

doctor: ## check the tools this repository needs
	@for c in java node npm docker; do printf '%-8s' $$c; command -v $$c >/dev/null && $$c --version 2>&1 | head -1 || echo "MISSING"; done
	@docker compose version 2>/dev/null || echo "docker compose MISSING"

deps: ## start PostgreSQL, Keycloak and MinIO for local development
	docker compose up -d --wait

deps-down: ## stop them and delete local data
	docker compose down -v

backend: ## run the API on http://localhost:8080 against the compose dependencies
	cd $(BACKEND) && ./mvnw -q spring-boot:run

frontend: ## run the SPA on http://localhost:4200
	cd $(FRONTEND) && npm start

dev: deps ## start dependencies, then print how to start API and SPA
	@echo "Dependencies are up. Now run 'make backend' and 'make frontend' in two terminals."

build: ## compile backend and frontend without tests
	cd $(BACKEND) && $(MVN) -DskipTests package
	cd $(FRONTEND) && npm ci && npm run build

unit-test: ## backend unit tests (no Docker needed)
	cd $(BACKEND) && $(MVN) test

integration-test: ## backend integration tests on PostgreSQL via Testcontainers (Docker needed)
	cd $(BACKEND) && $(MVN) verify

arch-test: ## ArchUnit rules only
	cd $(BACKEND) && $(MVN) test -Dtest='*ArchitectureTest'

test: unit-test ## alias for the fast test suite
	cd $(FRONTEND) && npm test -- --watch=false

lint: ## frontend lint and format check
	cd $(FRONTEND) && npm run lint && npx prettier --check "src/**/*.{ts,html,scss}"

e2e: ## Playwright end-to-end flow against a running stack (make deps, make backend, make frontend first)
	cd $(FRONTEND) && npx playwright test

observability: ## start Prometheus, Grafana, Loki, Tempo and the OpenTelemetry Collector
	docker compose -f docker-compose.observability.yml up -d --wait

observability-down:
	docker compose -f docker-compose.observability.yml down -v

docker: ## build both images for the local platform
	docker build -t assetcare-api:local $(BACKEND)
	docker build -t assetcare-frontend:local $(FRONTEND)

helm-lint: ## lint the chart
	helm lint deploy/helm/assetcare

helm-template: ## render the chart with the core profile
	helm template assetcare deploy/helm/assetcare -f deploy/helm/assetcare/values.yaml

smoke-test: ## hit health and a public endpoint of a running deployment (BASE_URL=https://assetcare.example.com)
	scripts/smoke-test.sh $${BASE_URL:-http://localhost:8080}

backup: ## dump the compose database to backups/
	scripts/backup.sh

restore: ## restore the newest dump into the compose database (FILE=backups/x.sql.gz to choose)
	scripts/restore.sh $${FILE}

clean:
	cd $(BACKEND) && $(MVN) clean
	rm -rf $(FRONTEND)/dist
