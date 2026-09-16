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

doctor: ## check tools, versions, the Docker daemon and free ports (docs/ENVIRONMENT-SETUP.md)
	@ok=0; \
	check() { out=$$($$2 2>&1 | head -1); if command -v $$1 >/dev/null 2>&1 && ! echo "$$out" | grep -q "Unable to locate"; then printf '  %-14s %s\n' "$$1" "$$out"; else printf '  %-14s MISSING  (%s)\n' "$$1" "$$3"; ok=1; fi; }; \
	echo "tools:"; \
	check java "java -version" "step 3: Java 25"; \
	check node "node --version" "step 4: Node 24"; \
	check npm "npm --version" "step 4"; \
	check docker "docker --version" "step 5: Docker"; \
	check git "git --version" "step 2"; \
	check curl "curl --version" "step 6"; \
	check jq "jq --version" "optional: brew install jq / apt-get install jq"; \
	check helm "helm version --short" "optional, part C"; \
	check kubectl "kubectl version --client" "optional, part C"; \
	if java -version >/dev/null 2>&1; then v=$$(java -version 2>&1 | head -1 | sed -E 's/.*"([0-9]+).*/\1/'); [ "$$v" -ge 25 ] 2>/dev/null || { echo "  java           version $$v found, 25 required"; ok=1; }; fi; \
	if command -v node >/dev/null 2>&1; then v=$$(node --version | sed -E 's/v([0-9]+).*/\1/'); [ "$$v" -ge 22 ] 2>/dev/null || { echo "  node           version $$v found, 22.12+ required (24 recommended)"; ok=1; }; fi; \
	echo "docker:"; \
	if docker info >/dev/null 2>&1; then printf '  daemon         reachable (%s)\n' "$$(docker compose version 2>/dev/null | head -1)"; else echo "  daemon         NOT REACHABLE: start Docker (step 5)"; ok=1; fi; \
	echo "ports (must be free before docker compose up / make backend / make frontend):"; \
	for p in 5432 8081 9000 9002 9001 8080 4200; do if (command -v lsof >/dev/null && lsof -nP -iTCP:$$p -sTCP:LISTEN >/dev/null 2>&1) || (command -v ss >/dev/null && ss -ltn 2>/dev/null | grep -q ":$$p "); then printf '  %-6s BUSY\n' $$p; ok=1; else printf '  %-6s free\n' $$p; fi; done; \
	[ -f .env ] && echo ".env: present" || echo ".env: missing, run: cp .env.example .env"; \
	[ $$ok -eq 0 ] && echo "doctor: ready" || echo "doctor: fix the items above (docs/ENVIRONMENT-SETUP.md)"

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
