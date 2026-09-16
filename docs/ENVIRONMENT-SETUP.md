# Environment setup, step by step

This page takes a machine with nothing on it to a running AssetCare and, further down, to a machine that can deploy it.
Every step ends with a check and the output you should see. Do the steps in order; each one assumes the ones before.

Time: about 30 minutes for the developer setup (Part A), most of it downloads. Parts B and C are only needed when you
work on the pipeline or the deployment.

| Part | You want to… | Steps |
|---|---|---|
| A | run, change and test the application locally | 1 to 9 |
| B | run the CI pipeline and publish images | 10 to 12 |
| C | deploy to Kubernetes (K3s on OCI) | 13 to 15 |

## Part A: developer machine

### Step 1: Operating system

| OS | Supported how |
|---|---|
| macOS 13+ (Apple Silicon or Intel) | natively; commands below use Homebrew |
| Ubuntu 22.04 / 24.04, Debian 12, Fedora 40+ | natively |
| Windows 10/11 | through WSL 2 with Ubuntu 24.04. Install WSL first (`wsl --install` in an administrator PowerShell, reboot), then follow the Ubuntu column inside the WSL shell. Docker Desktop for Windows with the WSL 2 backend provides Docker inside WSL. |

Minimum hardware: 4 CPU cores, 8 GB RAM free for the tooling (16 GB total recommended), 10 GB of disk. The compose
dependencies use about 2 GB of RAM; the backend and frontend dev servers another 2 GB.

### Step 2: Git

```bash
# macOS
brew install git
# Ubuntu / WSL
sudo apt-get update && sudo apt-get install -y git curl unzip zip
```

Check:

```bash
git --version        # git version 2.4x or newer
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
```

### Step 3: Java 25 (Temurin)

The backend targets Java 25 (`<java.version>25</java.version>` in `backend/pom.xml`). Any Java 25 distribution
works; Eclipse Temurin is the reference. SDKMAN is the easiest way to keep several JDKs.

```bash
# macOS or Linux, with SDKMAN (recommended)
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk install java 25.0.2-tem          # sdk list java | grep tem   shows the exact current 25.x build
sdk default java 25.0.2-tem

# macOS alternative
brew install --cask temurin@25

# Ubuntu alternative (Adoptium repository)
sudo apt-get install -y wget apt-transport-https gpg
wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | sudo gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg
echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb $(. /etc/os-release && echo $VERSION_CODENAME) main" | sudo tee /etc/apt/sources.list.d/adoptium.list
sudo apt-get update && sudo apt-get install -y temurin-25-jdk
```

Check:

```bash
java -version
# openjdk version "25.0.x" 2026-xx-xx LTS
# OpenJDK Runtime Environment Temurin-25.0.x+y ...
echo $JAVA_HOME     # may be empty; the Maven wrapper uses the java on PATH
```

Maven is **not** installed separately: `backend/mvnw` downloads Maven 3.9.16 into `~/.m2/wrapper` on first use.

### Step 4: Node.js 24 and npm

Angular 22 requires Node 22.12+ or 24+; the project pins 24 in CI. Use a version manager so upgrades are painless.

```bash
# macOS or Linux, with nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 24
nvm use 24
nvm alias default 24

# macOS alternative
brew install node@24 && brew link --overwrite node@24
```

Check:

```bash
node --version      # v24.x.y
npm --version       # 11.x
```

Angular CLI is not installed globally; `npx ng` uses the version in `frontend/package.json`.

### Step 5: Docker with Compose v2

Needed for PostgreSQL, Keycloak and MinIO, for the integration tests (Testcontainers) and for building images.

| OS | Install |
|---|---|
| macOS | Docker Desktop (https://www.docker.com/products/docker-desktop/) or `brew install --cask docker`. Alternatives that also work: OrbStack, Colima (`brew install colima docker docker-compose && colima start --cpu 4 --memory 8`). |
| Ubuntu | Docker Engine from Docker's repository: https://docs.docker.com/engine/install/ubuntu/ then `sudo usermod -aG docker $USER` and log out and in. |
| Windows | Docker Desktop with "Use the WSL 2 based engine" and WSL integration enabled for your Ubuntu distribution. |

Give Docker at least 4 CPUs and 6 GB of memory (Docker Desktop → Settings → Resources).

Check:

```bash
docker --version               # Docker version 27.x or newer
docker compose version         # Docker Compose version v2.x
docker run --rm hello-world    # prints "Hello from Docker!"
docker info --format '{{.Architecture}}'   # aarch64 on Apple Silicon, x86_64 elsewhere; both are supported
```

Testcontainers needs to reach the Docker socket. With Docker Desktop, OrbStack and Docker Engine that is automatic.
With Colima: `export DOCKER_HOST=unix://$HOME/.colima/default/docker.sock` and
`export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` in your shell profile.

### Step 6: `make` and a shell

The `Makefile` wraps the commands. macOS has `make` after `xcode-select --install`; Ubuntu: `sudo apt-get install -y make`.
The scripts in `scripts/` are Bash and need `curl`; `scripts/backup.sh` also needs `gzip` and `sha256sum` or `shasum`
(both present on macOS and Linux).

Check: `make --version` prints GNU Make 3.81 or newer.

### Step 7: Clone and configure

```bash
git clone https://github.com/Janaka2/spring-angular-production-blueprint.git
cd spring-angular-production-blueprint
cp .env.example .env
make doctor
```

`.env` holds development credentials only, all labelled, and is ignored by Git. Change nothing in it for a first run.

`make doctor` prints every tool with its version, checks the Docker daemon is reachable, and checks that the ports
below are free. Fix anything it marks MISSING or BUSY before continuing.

| Port | Used by | Change with |
|---|---|---|
| 5432 | PostgreSQL | `POSTGRES_PORT` in `.env` and `ASSETCARE_DB_URL` |
| 8081 | Keycloak | `KEYCLOAK_PORT` and `ASSETCARE_OIDC_ISSUER`; also `frontend/public/config.json` |
| 9000 | Keycloak management (health) | fixed in `docker-compose.yml` |
| 9002, 9001 | MinIO API and console | `MINIO_PORT`, `MINIO_CONSOLE_PORT`, `ASSETCARE_S3_ENDPOINT` |
| 8080 | Spring Boot API | `server.port` (`SERVER_PORT` environment variable) and `config.json` |
| 4200 | Angular dev server | `npm start -- --port 4300` and the Keycloak client redirect URI |
| 3000, 9090, 3100, 3200, 4317/4318 | Grafana, Prometheus, Loki, Tempo, OTel collector (observability profile only) | `docker-compose.observability.yml` |

### Step 8: Start the dependencies

```bash
docker compose up -d --wait
```

The first run pulls about 1.2 GB of images and takes two to five minutes. `--wait` returns when every health check
passes; Keycloak is the slow one because it imports the `assetcare` realm.

Check:

```bash
docker compose ps
# NAME                   STATUS
# assetcare-postgres     running (healthy)
# assetcare-keycloak     running (healthy)
# assetcare-minio        running (healthy)
curl -s http://localhost:8081/realms/assetcare | head -c 80     # {"realm":"assetcare","public_key":"MIIB...
curl -s http://localhost:9002/minio/health/live -o /dev/null -w '%{http_code}\n'   # 200
```

Keycloak admin console: http://localhost:8081 with `admin` / `admin-dev-password`. Realm `assetcare` has four users:

| User | Password | Roles |
|---|---|---|
| alice | alice-dev-password | USER |
| bob | bob-dev-password | USER |
| admin | admin-dev-password | USER, ADMIN |
| audrey | audrey-dev-password | AUDITOR |

### Step 9: Run the application

Two terminals.

```bash
# terminal 1: API. First run downloads Maven and the dependencies (about 3 minutes).
make backend
# ... Started AssetCareApplication in 6.2 seconds

# terminal 2: SPA. First run: npm ci (about 2 minutes).
cd frontend && npm ci && cd .. && make frontend
# ... ➜  Local:   http://localhost:4200/
```

Check:

```bash
curl -s http://localhost:8080/actuator/health | jq          # {"status":"UP", ...}
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/v1/assets   # 401: security is on
open http://localhost:4200        # log in as alice, the dashboard shows demo assets
```

Get a token without the browser (development client, password grant):

```bash
TOKEN=$(curl -s -X POST http://localhost:8081/realms/assetcare/protocol/openid-connect/token \
  -d client_id=assetcare-dev-cli -d grant_type=password -d username=alice -d password=alice-dev-password \
  | jq -r .access_token)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/assets | jq '.totalElements'
```

Run the tests to confirm the toolchain end to end:

```bash
make unit-test            # backend: 21 tests, no Docker needed, about 40 s
make integration-test     # backend on PostgreSQL 18 in Testcontainers, about 2 min the first time
make test                 # backend unit tests + frontend Vitest
make lint
make e2e                  # Playwright; needs steps 8 and 9 running. First: cd frontend && npx playwright install chromium
```

Optional, the observability profile: `make observability`, then http://localhost:3000 (`admin` / `admin`), dashboard
"AssetCare overview". Stop with `make observability-down`.

Stop everything: Ctrl-C in both terminals, then `docker compose down` (keeps data) or `make deps-down` (deletes it).

### IDE

- **IntelliJ IDEA** (Community is enough): open the `backend` folder as a Maven project, set Project SDK to 25, enable
  annotation processing. Run configuration: Spring Boot, main class `me.janaka.assetcare.AssetCareApplication`, and load
  `.env` through the EnvFile plugin or by pasting its contents into the environment variables field.
- **VS Code**: extensions "Extension Pack for Java", "Spring Boot Extension Pack", "Angular Language Service", "ESLint",
  "Prettier". Open the repository root; `.editorconfig` sets indentation.
- Format on save: Prettier for the frontend (`npm run format`); the backend follows `docs/CODING-STANDARDS.md`.

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `make doctor` says a port is BUSY | another service on that port | `lsof -i :5432` (macOS/Linux) and stop it, or change the port in `.env` as in the table above |
| `docker compose up` fails with "no space left" | old images | `docker system prune -af --volumes` |
| Keycloak never becomes healthy | slow first import, or memory | wait three minutes; give Docker 6 GB; `docker compose logs keycloak` |
| API: `Connection refused` to 5432 | dependencies not up, or WSL networking | `docker compose ps`; in WSL use `localhost`, not the WSL IP |
| API: `401` from Keycloak, `issuer did not match` | issuer URL differs between `.env` and the token | keep `ASSETCARE_OIDC_ISSUER=http://localhost:8081/realms/assetcare` everywhere; do not mix `127.0.0.1` and `localhost` |
| SPA login loops back to the login page | Keycloak redirect URI | the SPA must run on http://localhost:4200; another port needs the client's redirect URI changed in Keycloak |
| Testcontainers: `Could not find a valid Docker environment` | socket not reachable | Docker running? Colima variables (step 5)? On Linux, user in the `docker` group? |
| `npm ci` fails on `node-gyp` | wrong Node | `nvm use 24` |
| Apple Silicon: an image says `no matching manifest for linux/arm64` | none of the pinned images should; if it happens, report it | `docker compose pull` shows the image |

## Part B: CI and publishing

### Step 10: GitHub CLI with the right scopes

```bash
brew install gh            # or: https://github.com/cli/cli#installation
gh auth login              # GitHub.com, HTTPS, authenticate with the browser
gh auth refresh -h github.com -s workflow,write:packages
```

The `workflow` scope is required to push files under `.github/workflows/`; without it GitHub rejects the push with
"refusing to allow an OAuth App to create or update workflow". `write:packages` lets you push images to GHCR manually;
the release workflow itself uses the built-in `GITHUB_TOKEN`.

Check: `gh auth status` lists both scopes.

### Step 11: Repository settings (once, by an admin)

1. Settings → Actions → General: allow GitHub Actions; Workflow permissions "Read repository contents", and tick
   "Allow GitHub Actions to create and approve pull requests" only if you use Dependabot auto-merge.
2. Settings → Code security: enable Dependency graph, Dependabot alerts, Code scanning (CodeQL runs from
   `security.yml`), Secret scanning with push protection.
3. Settings → Branches: protect `main`; require the `ci` workflow's jobs to pass; require a pull request.
4. Settings → Packages: after the first release, make the two GHCR packages public or add a pull secret to the cluster
   (`global.imagePullSecrets` in the chart).

No repository secrets are needed: the workflows use the automatic `GITHUB_TOKEN` and OIDC for cosign.

### Step 12: Run the pipeline

```bash
git push origin main                 # ci.yml and security.yml run
git tag v1.0.0 && git push origin v1.0.0     # release.yml builds, scans, signs and publishes the images and the chart
gh run list --limit 5
gh run watch
```

Check: `gh run list` shows `ci`, `security` and `release` as completed; `gh api /user/packages?package_type=container`
lists `assetcare-api` and `assetcare-frontend`.

## Part C: deployment machine

### Step 13: Tools

```bash
brew install kubectl helm terraform          # macOS
# Ubuntu: https://kubernetes.io/docs/tasks/tools/ , https://helm.sh/docs/intro/install/ , https://developer.hashicorp.com/terraform/install
brew install oci-cli                          # optional: OCI command line, https://docs.oracle.com/iaas/Content/API/SDKDocs/cliinstall.htm
```

Check: `kubectl version --client` (1.29+), `helm version` (v4.3+), `terraform version` (1.6+).

Validate the chart before you have a cluster:

```bash
make helm-lint
make helm-template | head
cd infra/oci && terraform init -backend=false && terraform validate
```

### Step 14: Accounts and credentials

- An Oracle Cloud account (https://www.oracle.com/cloud/free/); note the tenancy's home region and a compartment OCID.
- For Terraform: an API signing key (Identity → Users → your user → API Keys → Add), which writes `~/.oci/config`.
  Terraform reads it; nothing goes into Git. `infra/oci/terraform.tfvars` is ignored by Git.
- A domain you control, for the DNS A record.
- An SSH key: `ssh-keygen -t ed25519`.

### Step 15: Deploy

Follow `docs/operations/OCI-FREE-TIER.md` (VM, K3s, DNS, TLS, chart) and `docs/operations/DEPLOYMENT.md` (chart values,
secrets, upgrade, rollback). Each step there ends with its own check.

## Version summary

| Tool | Version | Why this one |
|---|---|---|
| Java | 25 (LTS) | `backend/pom.xml` target; Spring Boot 4.1 needs 17+, 25 is the current LTS |
| Maven | 3.9.16 via wrapper | pinned in `backend/.mvn/wrapper/maven-wrapper.properties` |
| Node.js | 24 (LTS) | Angular 22 supports 22.12+ and 24; CI uses 24 |
| npm | 11 | ships with Node 24 |
| Docker Engine / Desktop | 27+ with Compose v2 | `docker compose` (v2 syntax), BuildKit for the Dockerfiles |
| kubectl | 1.29+ | matches `kubeVersion` in the chart |
| Helm | 4.3+ | the chart is linted with 4.3.0 |
| Terraform | 1.6+ | `required_version` in `infra/oci/main.tf` |
| GitHub CLI | 2.x | pushing workflows, watching runs |
