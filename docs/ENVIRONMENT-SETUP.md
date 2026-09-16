# Environment setup: local and production, one verified step at a time

Two tracks. **Local** (L1 to L12) gives you a machine that runs, changes and tests AssetCare. **Production** (P1 to P14)
takes an empty Oracle Cloud account to `https://your-host` with TLS, backups and a pipeline. Every step has three parts:
*Do*, *Verify* and *Expected*. Do not move on until the verify command prints what is expected; every later step assumes
it.

`make doctor` checks L2 to L7 in one go and names the step to fix.

## The checklist

| # | Local machine | Verified by |
|---|---|---|
| L1 | Operating system and hardware | `uname`, memory |
| L2 | Git | `git --version` |
| L3 | Java 25 | `java -version` |
| L4 | Node.js 24 and npm | `node --version` |
| L5 | Docker with Compose v2 | `docker run hello-world` |
| L6 | make, curl, jq | `make --version` |
| L7 | Clone, `.env`, `make doctor` | `doctor: ready` |
| L8 | Dependencies: PostgreSQL, Keycloak, MinIO | `docker compose ps` all healthy |
| L9 | Backend API | `/actuator/health` UP, `/api/v1/assets` 401 |
| L10 | Frontend SPA and login | dashboard as `alice` |
| L11 | Tests: unit, integration, frontend, e2e | all green |
| L12 | Observability profile (optional) | Grafana shows requests |

| # | Production (K3s on OCI Always Free) | Verified by |
|---|---|---|
| P1 | Deployment tools: kubectl, Helm, Terraform, GitHub CLI | versions |
| P2 | GitHub: workflow scope, Actions, packages | `gh auth status`, first green run |
| P3 | Released images and chart | `release` workflow green, packages visible |
| P4 | Oracle Cloud account, compartment, API key | `oci iam region list` or console |
| P5 | The VM with Terraform | `ssh` works, `aarch64` |
| P6 | K3s, Helm and cert-manager on the VM | node Ready, cert-manager pods Running |
| P7 | Firewall: OCI security list and VM iptables | `curl -I http://<ip>` answers |
| P8 | DNS A record | `dig` returns the VM IP |
| P9 | ClusterIssuer (staging first, then prod) | `kubectl get clusterissuer` Ready |
| P10 | Namespace and the production Secret | `kubectl get secret` |
| P11 | Realm redirect URIs for your host | `grep` |
| P12 | Helm install | all pods Running, certificate Ready |
| P13 | HTTPS, smoke test, login | `smoke test passed`, dashboard over https |
| P14 | Backup CronJob and a restore drill | dump file exists, drill row counts match |

---

## Local track

### L1. Operating system and hardware

**Do.** Use macOS 13+, Ubuntu 22.04/24.04, Debian 12, Fedora 40+, or Windows 10/11 with WSL 2. On Windows, run
`wsl --install` in an administrator PowerShell, reboot, open the Ubuntu shell and follow the Ubuntu commands from here
on. Have 4 cores, 16 GB RAM (8 GB free), 10 GB disk.

**Verify.**

```bash
uname -sm
# macOS: Darwin arm64 (Apple Silicon) or Darwin x86_64.  Linux/WSL: Linux x86_64 or Linux aarch64
free -g 2>/dev/null || sysctl -n hw.memsize | awk '{print $1/1073741824 " GB"}'
```

**Expected.** A supported OS and at least 16 GB total memory. In WSL, `uname -r` contains `WSL2`.

### L2. Git

**Do.**

```bash
# macOS
xcode-select --install 2>/dev/null; brew install git
# Ubuntu / WSL
sudo apt-get update && sudo apt-get install -y git curl unzip zip
git config --global user.name "Your Name" && git config --global user.email "you@example.com"
```

**Verify.** `git --version && git config --global user.email`

**Expected.** `git version 2.4x` or newer, and your email.

### L3. Java 25

**Do.** SDKMAN keeps several JDKs and is the recommended route on macOS and Linux.

```bash
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk list java | grep -E "25\.[0-9.]+-tem"     # shows the current Temurin 25 build
sdk install java 25.0.2-tem                    # use the build the line above printed
sdk default java 25.0.2-tem
```

Alternatives: `brew install --cask temurin@25` (macOS) or the Adoptium apt repository (Ubuntu:
https://adoptium.net/installation/linux/). Maven is not installed separately; `backend/mvnw` downloads 3.9.16 itself.

**Verify.** `java -version`

**Expected.**

```text
openjdk version "25.0.2" 2026-01-20 LTS
OpenJDK Runtime Environment Temurin-25.0.2+10 (build 25.0.2+10-LTS)
```

The first line must say `25.`. macOS without a JDK prints "Unable to locate a Java Runtime": that is the stub, not Java.

### L4. Node.js 24 and npm

**Do.**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 24 && nvm use 24 && nvm alias default 24
```

Alternative: `brew install node@24 && brew link --overwrite node@24`.

**Verify.** `node --version && npm --version`

**Expected.** `v24.x.y` and `11.x.y`. Angular 22 also accepts Node 22.12+, but CI uses 24; match it.

### L5. Docker with Compose v2

**Do.**

| OS | Install |
|---|---|
| macOS | Docker Desktop (https://www.docker.com/products/docker-desktop/), or OrbStack, or Colima: `brew install colima docker docker-compose && colima start --cpu 4 --memory 8` |
| Ubuntu | Docker Engine from Docker's repository (https://docs.docker.com/engine/install/ubuntu/), then `sudo usermod -aG docker $USER`, log out and in |
| Windows | Docker Desktop with the WSL 2 backend and WSL integration enabled for your Ubuntu distribution |

Give Docker 4 CPUs and 6 GB memory (Docker Desktop → Settings → Resources). With Colima add to your shell profile:
`export DOCKER_HOST=unix://$HOME/.colima/default/docker.sock` and
`export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`.

**Verify.**

```bash
docker --version && docker compose version
docker run --rm hello-world | head -3
```

**Expected.** `Docker version 27` or newer, `Docker Compose version v2.x`, and `Hello from Docker!`. If the last command
says "permission denied" on Linux, the group change from the table has not taken effect: log out and in.

### L6. make, curl, jq

**Do.** macOS: `make` came with L2; `brew install jq`. Ubuntu: `sudo apt-get install -y make jq`.

**Verify.** `make --version | head -1 && curl --version | head -1 && jq --version`

**Expected.** `GNU Make 3.81` or newer, `curl 7.x/8.x`, `jq-1.7`.

### L7. Clone, configure, doctor

**Do.**

```bash
git clone https://github.com/Janaka2/spring-angular-production-blueprint.git
cd spring-angular-production-blueprint
cp .env.example .env        # development credentials only, labelled, ignored by Git; change nothing for a first run
make doctor
```

**Verify.** The output of `make doctor`.

**Expected.** Every tool line shows a version, `daemon reachable`, every port `free`, `.env: present`, and the last line
`doctor: ready`. Anything else names the step (L3 to L5) to fix. A `BUSY` port means another program listens there:
`lsof -i :5432` shows which; stop it or change the port in `.env`.

| Port | Used by | Change with |
|---|---|---|
| 5432 | PostgreSQL | `POSTGRES_PORT` and `ASSETCARE_DB_URL` in `.env` |
| 8081 | Keycloak | `KEYCLOAK_PORT`, `ASSETCARE_OIDC_ISSUER`, and `frontend/public/config.json` |
| 9000 | Keycloak management | fixed in `docker-compose.yml` |
| 9002, 9001 | MinIO API and console | `MINIO_PORT`, `MINIO_CONSOLE_PORT`, `ASSETCARE_S3_ENDPOINT` |
| 8080 | Spring Boot API | `SERVER_PORT` environment variable and `config.json` |
| 4200 | Angular dev server | `npm start -- --port 4300` plus the Keycloak client redirect URI |

### L8. Dependencies: PostgreSQL 18, Keycloak 26, MinIO

**Do.** `docker compose up -d --wait`. The first run pulls about 1.2 GB and takes two to five minutes; Keycloak is slow
because it imports the `assetcare` realm.

**Verify.**

```bash
docker compose ps --format 'table {{.Name}}\t{{.Status}}'
curl -s http://localhost:8081/realms/assetcare | jq -r .realm
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:9002/minio/health/live
docker compose exec -T postgres pg_isready -U assetcare
```

**Expected.**

```text
assetcare-postgres   Up (healthy)
assetcare-keycloak   Up (healthy)
assetcare-minio      Up (healthy)
assetcare
200
/var/run/postgresql:5432 - accepting connections
```

Keycloak admin console: http://localhost:8081 (`admin` / `admin-dev-password`). Realm users: `alice` (USER), `bob`
(USER), `admin` (USER, ADMIN), `audrey` (AUDITOR); password is `<name>-dev-password`.

### L9. Backend API

**Do.** In a terminal that stays open: `make backend`. The first run downloads Maven and dependencies, about three
minutes; later runs start in under ten seconds.

**Verify.** In a second terminal:

```bash
curl -s http://localhost:8080/actuator/health | jq -c '{status, db: .components.db.status}'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/v1/assets
TOKEN=$(curl -s -X POST http://localhost:8081/realms/assetcare/protocol/openid-connect/token \
  -d client_id=assetcare-dev-cli -d grant_type=password -d username=alice -d password=alice-dev-password | jq -r .access_token)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/me | jq -c .
curl -s -H "Authorization: Bearer $TOKEN" 'http://localhost:8080/api/v1/assets?size=1' | jq -c '{total: .totalElements, first: .content[0].name}'
```

**Expected.**

```text
{"status":"UP","db":"UP"}
401
{"username":"alice","roles":["USER"], ...}
{"total":<a number greater than 0>,"first":"<a demo asset name>"}
```

The 401 proves security is on; the last two prove Keycloak, the API and the database work together. If you get
`Connection refused` on 8080 the API is still starting; on 5432 or 8081, L8 is not healthy.

### L10. Frontend SPA and login

**Do.** In a third terminal:

```bash
cd frontend && npm ci && cd ..      # first time only, about two minutes
make frontend
```

**Verify.**

```bash
curl -s http://localhost:4200/config.json | jq -c .
```

Then open http://localhost:4200 in a browser and log in as `alice` / `alice-dev-password`.

**Expected.** `{"apiUrl":"http://localhost:8080","issuer":"http://localhost:8081/realms/assetcare","clientId":"assetcare-spa"}`,
a Keycloak login page, then the dashboard with the demo assets. Create an asset, edit it, plan a maintenance item: all
three should succeed. If login loops back to Keycloak, the SPA is not on port 4200 (the redirect URI is fixed there).

### L11. Tests

**Do and verify.** With L8, L9 and L10 running:

```bash
make unit-test            # backend unit + ArchUnit, no Docker, about 40 s
make integration-test     # backend on PostgreSQL 18 in Testcontainers, about 2 min the first time
make test                 # backend unit tests + frontend Vitest
make lint
cd frontend && npx playwright install --with-deps chromium && cd ..
make e2e                  # Playwright: login, create, maintenance, auditor, two-session conflict
```

**Expected.**

```text
[INFO] Tests run: 21, Failures: 0, Errors: 0, Skipped: 0        (unit-test)
[INFO] Tests run: 2x, Failures: 0 ... BUILD SUCCESS               (integration-test; includes *IT classes)
✓ 10 tests passed                                                 (frontend)
All files pass linting.                                           (lint)
3 passed                                                          (e2e)
```

Your toolchain is now proven end to end. Everything after this step is optional for development.

### L12. Observability profile (optional)

**Do.** `make observability`, then generate a few requests by clicking around the SPA.

**Verify.** Open http://localhost:3000 (`admin` / `admin`) → Dashboards → AssetCare → "AssetCare overview". Open
http://localhost:9090/targets.

**Expected.** The request-rate panel shows your clicks; the Prometheus target `assetcare-api` is `UP`; Explore → Loki
with `{service_name="assetcare-api"}` shows JSON log lines that carry `traceId`; clicking a trace id opens it in Tempo.
Stop with `make observability-down`.

Stop the whole local stack: Ctrl-C in the three terminals, `docker compose down` (keeps data) or `make deps-down`
(deletes it).

---

## Production track

Production is one `VM.Standard.A1.Flex` machine (4 OCPU, 24 GB, free) running K3s. The steps are ordered so that each
one can be verified without the next. Costs beyond the free tier are listed in `docs/operations/OCI-FREE-TIER.md`.

### P1. Deployment tools on your laptop

**Do.**

```bash
brew install kubectl helm terraform gh            # macOS
# Ubuntu: kubectl https://kubernetes.io/docs/tasks/tools/ , Helm https://helm.sh/docs/intro/install/ ,
#         Terraform https://developer.hashicorp.com/terraform/install , gh https://github.com/cli/cli#installation
```

**Verify.**

```bash
kubectl version --client | head -1 && helm version --short && terraform version | head -1 && gh --version | head -1
make helm-lint && make helm-template > /dev/null && echo "chart renders"
(cd infra/oci && terraform init -backend=false -input=false > /dev/null && terraform validate)
```

**Expected.** `Client Version: v1.29+`, `v4.3+`, `Terraform v1.6+`, `gh version 2.x`; then `1 chart(s) linted, 0 chart(s)
failed`, `chart renders`, and `Success! The configuration is valid.`

### P2. GitHub: scopes, Actions and packages

**Do.**

```bash
gh auth login                                              # GitHub.com, HTTPS, browser
gh auth refresh -h github.com -s workflow,write:packages
```

In the repository settings (once, by an admin): Actions → General → allow actions, workflow permissions "Read repository
contents"; Code security → enable Dependabot alerts, Code scanning, Secret scanning with push protection; Branches →
protect `main`, require the `ci` jobs. No repository secrets are needed: the workflows use `GITHUB_TOKEN` and OIDC.

**Verify.**

```bash
gh auth status
git push origin main
gh run list --limit 3
gh run watch            # pick the latest ci run
```

**Expected.** `gh auth status` lists `workflow` among the token scopes (without it, pushing `.github/workflows` is
refused). `gh run list` shows `ci` and `security` runs and they finish `completed success`. This is the first time the
integration tests, Playwright, the restore drill, the image builds and the scans run; a failure here is a real finding.

### P3. Release the images and the chart

**Do.**

```bash
git tag v1.0.0 && git push origin v1.0.0
gh run watch
```

**Verify.**

```bash
gh run list --workflow release --limit 1
gh api "/users/$(gh api user -q .login)/packages?package_type=container" -q '.[].name'
docker manifest inspect ghcr.io/janaka2/spring-angular-production-blueprint/assetcare-api:1.0.0 | grep -c architecture
```

**Expected.** The release run is `completed success`; the packages `assetcare-api` and `assetcare-frontend` are listed;
the manifest shows two architectures (amd64 and arm64). Make the packages public (Packages → package → settings) or plan
an image pull secret in P10.

### P4. Oracle Cloud account, compartment, API key

**Do.** Create the account at https://www.oracle.com/cloud/free/ and note the home region (for example `eu-zurich-1`).
Console → Identity → Compartments: use the root compartment or create `assetcare`; copy its OCID. Then Identity → Users →
your user → API Keys → Add API Key → Generate, download the private key to `~/.oci/oci_api_key.pem`, and paste the shown
configuration into `~/.oci/config`, fixing `key_file`. Optionally `brew install oci-cli`.

**Verify.**

```bash
chmod 600 ~/.oci/config ~/.oci/oci_api_key.pem
grep -E "^(user|tenancy|region|fingerprint|key_file)=" ~/.oci/config
oci iam region list --output table 2>/dev/null | head -5 || echo "oci cli not installed (optional)"
```

**Expected.** Five configuration lines with `ocid1.user...`, `ocid1.tenancy...`, your region, a fingerprint and the key
path. With the CLI, a table of regions appears; without it, Terraform in P5 is the check. None of this goes into Git.

### P5. The VM with Terraform

**Do.**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/assetcare -N ""          # or reuse an existing key
cd infra/oci && cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars: region, compartment_ocid, ssh_public_key_path=~/.ssh/assetcare.pub, ssh_allowed_cidr=<your ip>/32
terraform init && terraform plan && terraform apply
```

If `apply` fails with "Out of host capacity", set `availability_domain_index = 1` (then `2`) in `terraform.tfvars` and
retry; if all fail, retry later in the day. Capacity, not money, is the free tier's limit.

**Verify.**

```bash
terraform output public_ip
ssh -i ~/.ssh/assetcare ubuntu@$(terraform output -raw public_ip) 'uname -m; nproc; free -g | head -2; lsb_release -ds'
```

**Expected.** An IP, then `aarch64`, `4`, about `23` GB total memory, `Ubuntu 24.04.x LTS`.

### P6. K3s, Helm and cert-manager on the VM

**Do.**

```bash
IP=$(cd infra/oci && terraform output -raw public_ip)
ssh -i ~/.ssh/assetcare ubuntu@$IP 'sudo apt-get update -q && sudo apt-get -y -q dist-upgrade && sudo reboot' ; sleep 60
scp -i ~/.ssh/assetcare deploy/k3s/install.sh ubuntu@$IP:
ssh -i ~/.ssh/assetcare ubuntu@$IP 'bash install.sh'
```

Then fetch the kubeconfig to your laptop so every later `kubectl`/`helm` runs from there:

```bash
ssh -i ~/.ssh/assetcare ubuntu@$IP 'sudo cat /etc/rancher/k3s/k3s.yaml' | sed "s/127.0.0.1/$IP/" > ~/.kube/assetcare.yaml
export KUBECONFIG=~/.kube/assetcare.yaml
```

Port 6443 is not open to the internet by design; open an SSH tunnel instead: `ssh -i ~/.ssh/assetcare -L 6443:127.0.0.1:6443 ubuntu@$IP -N &`
and keep `127.0.0.1` in the kubeconfig. Either works; the tunnel is safer.

**Verify.**

```bash
kubectl get nodes -o wide
kubectl -n kube-system get pods | grep -E "traefik|coredns"
kubectl -n cert-manager get pods
helm version --short
```

**Expected.** One node `Ready` with `k3s` in the version; `traefik-...` and `coredns-...` `Running`; three cert-manager
pods `Running`; Helm v4.

### P7. Firewall: OCI security list and the VM's iptables

**Do.** Terraform already opened 22, 80 and 443 in the subnet's security list, and `install.sh` opened 80 and 443 in
iptables. Nothing to do unless you created the VM by hand: then Networking → VCN → subnet → security list → add ingress
rules for TCP 80 and 443 from `0.0.0.0/0`, and on the VM run the two `iptables -I INPUT` lines from `install.sh`.

**Verify.** From your laptop: `curl -sI http://$IP | head -1`

**Expected.** `HTTP/1.1 404 Not Found` from Traefik. A timeout means one of the two firewalls still blocks port 80.

### P8. DNS

**Do.** At your DNS provider create an A record: `assetcare.yourdomain.tld → $IP` (TTL 300).

**Verify.** `dig +short assetcare.yourdomain.tld` and `curl -sI http://assetcare.yourdomain.tld | head -1`

**Expected.** The VM's IP, then the same 404 as P7. Propagation can take minutes; do not continue until `dig` answers,
Let's Encrypt needs it in P9.

### P9. ClusterIssuers

**Do.**

```bash
sed -i.bak 's/CHANGE-ME@example.com/you@example.com/' deploy/k3s/cluster-issuer.yaml
kubectl apply -f deploy/k3s/cluster-issuer.yaml
```

**Verify.** `kubectl get clusterissuer`

**Expected.**

```text
NAME                  READY   AGE
letsencrypt-prod      True    10s
letsencrypt-staging   True    10s
```

Use `letsencrypt-staging` for the first install (P12): it has generous rate limits and proves the whole chain; production
allows only five duplicate certificates per week.

### P10. Namespace and the production Secret

**Do.** Generate real secrets; never reuse the development ones from `.env.example`.

```bash
kubectl create namespace assetcare
gen() { openssl rand -base64 30 | tr -d '/+=' | cut -c1-32; }
DB=$(gen); KC=$(gen); S3USER=assetcare; S3PW=$(gen)
kubectl -n assetcare create secret generic assetcare-secrets \
  --from-literal=ASSETCARE_DB_PASSWORD="$DB" --from-literal=POSTGRES_PASSWORD="$DB" \
  --from-literal=KC_BOOTSTRAP_ADMIN_PASSWORD="$KC" \
  --from-literal=MINIO_ROOT_USER="$S3USER" --from-literal=MINIO_ROOT_PASSWORD="$S3PW" \
  --from-literal=ASSETCARE_S3_ACCESS_KEY="$S3USER" --from-literal=ASSETCARE_S3_SECRET_KEY="$S3PW"
echo "Keycloak admin password: $KC"      # store it in your password manager now; it is not printed again
# private GHCR packages only:
# kubectl -n assetcare create secret docker-registry ghcr --docker-server=ghcr.io --docker-username=<github user> --docker-password=<token with read:packages>
```

**Verify.** `kubectl -n assetcare get secret assetcare-secrets -o jsonpath='{.data}' | jq 'keys'`

**Expected.** The seven keys listed. The values are base64, not encrypted: an enterprise sources this Secret from a vault
(External Secrets Operator) and enables encryption at rest; the chart only needs the name.

### P11. Realm redirect URIs for your host

**Do.** The chart imports `deploy/helm/assetcare/realm/assetcare-realm.json` on Keycloak's first start. Put your host in
it, and remove the development users before anything public:

```bash
sed -i.bak 's#assetcare.example.com#assetcare.yourdomain.tld#g' deploy/helm/assetcare/realm/assetcare-realm.json
```

**Verify.** `grep -c "assetcare.yourdomain.tld" deploy/helm/assetcare/realm/assetcare-realm.json`

**Expected.** `3` or more (redirect URI, web origin, post-logout URI). Commit this change on a branch of your own fork;
the users' passwords in that file are development values and must be changed in the admin console after P12.

### P12. Install the chart

**Do.**

```bash
helm upgrade --install assetcare deploy/helm/assetcare -n assetcare \
  --set global.host=assetcare.yourdomain.tld \
  --set image.tag=1.0.0 \
  --set api.existingSecret=assetcare-secrets \
  --set ingress.clusterIssuer=letsencrypt-staging \
  --wait --timeout 15m
```

The first start takes several minutes: Keycloak imports the realm, the API runs Liquibase.

**Verify.**

```bash
kubectl -n assetcare get pods
kubectl -n assetcare get certificate,ingress
kubectl -n assetcare logs deploy/assetcare-api --tail=3
```

**Expected.** Pods `assetcare-api`, `assetcare-frontend`, `assetcare-postgres-0`, `assetcare-keycloak-0`,
`assetcare-minio-0` all `Running` and `1/1`; the `assetcare-minio-init` job `Completed`; certificate `assetcare-tls`
`READY True`; the ingress shows your host and the IP; the last API log line contains `Started AssetCareApplication`.
Then switch to the real issuer and run the same command with `--set ingress.clusterIssuer=letsencrypt-prod`; the
certificate is re-issued within a minute.

### P13. HTTPS, smoke test, login

**Verify.**

```bash
curl -sI https://assetcare.yourdomain.tld | head -1
curl -sv https://assetcare.yourdomain.tld 2>&1 | grep -E "issuer:|subject:"
scripts/smoke-test.sh https://assetcare.yourdomain.tld/api
curl -s https://assetcare.yourdomain.tld/config.json | jq -c .
```

Open `https://assetcare.yourdomain.tld` in a browser, log in as `alice`, create an asset. Then open
`https://assetcare.yourdomain.tld/auth/admin/` as `admin` with the password from P10 and change every development
user's password (or delete them and create your real users).

**Expected.** `HTTP/2 200`; issuer `Let's Encrypt` (`R1x`/`E1x`, not `STAGING`); `smoke test passed`; `config.json`
with `https://` URLs and your host; the dashboard loads over HTTPS with the padlock.

### P14. Backups and a restore drill

**Do.** Backups run nightly (`backup.schedule`). Trigger one now instead of waiting:

```bash
kubectl -n assetcare create job --from=cronjob/assetcare-backup backup-now
kubectl -n assetcare wait --for=condition=complete job/backup-now --timeout=5m
kubectl -n assetcare logs job/backup-now
```

**Verify.** The log line, then a restore drill as in `docs/operations/BACKUP-RESTORE.md` (scale the API to zero,
restore into a side database, swap, scale up, smoke test).

**Expected.** `backup written: /backups/assetcare-<stamp>.sql.gz (<size>)`, and after the drill the asset count matches
the count before it. Set `backup.s3Bucket`/`backup.s3Endpoint` to an OCI Object Storage bucket so dumps leave the VM;
a backup on the same disk does not survive losing the VM.

You are in production. Day two lives in `docs/operations/RUNBOOK.md`; upgrades and rollback in
`docs/operations/DEPLOYMENT.md`.

---

## Reference

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `make doctor`: port BUSY | another service listens there | `lsof -i :<port>`; stop it or change the port (L7 table) |
| `docker compose up`: no space left | old images | `docker system prune -af --volumes` |
| Keycloak never healthy | slow first import or too little memory | wait three minutes; give Docker 6 GB; `docker compose logs keycloak` |
| API: connection refused to 5432 | L8 not up, or WSL networking | `docker compose ps`; in WSL use `localhost` |
| API: `issuer did not match` | issuer differs between `.env` and the token | keep `http://localhost:8081/realms/assetcare` everywhere; do not mix `127.0.0.1` and `localhost` |
| SPA login loops | redirect URI | the SPA must run on port 4200, or change the client in Keycloak |
| Testcontainers: no Docker environment | socket not reachable | Docker running? Colima variables (L5)? `docker` group on Linux? |
| `npm ci` fails on native modules | wrong Node | `nvm use 24` |
| Terraform: Out of host capacity | no free A1 hosts right now | other `availability_domain_index`, retry later, or upgrade to Pay As You Go (still free within limits) |
| P7 times out | firewall | OCI security list ingress 80/443 and VM iptables; both are needed |
| Certificate stays `READY False` | DNS not propagated, port 80 blocked, or rate limit | `kubectl -n assetcare describe challenge`; use staging first |
| Pods `ImagePullBackOff` | private GHCR packages | make them public or add the pull secret (P10) and `--set global.imagePullSecrets[0].name=ghcr` |
| Keycloak login on production says invalid redirect | P11 skipped | fix the realm file and re-import, or edit the client in the admin console |

### IDE

- **IntelliJ IDEA**: open `backend` as a Maven project, SDK 25, annotation processing on; run configuration Spring Boot
  with `me.janaka.assetcare.AssetCareApplication`, environment from `.env` (EnvFile plugin).
- **VS Code**: Extension Pack for Java, Spring Boot Extension Pack, Angular Language Service, ESLint, Prettier; open the
  repository root, `.editorconfig` applies.

### Versions

| Tool | Version | Why |
|---|---|---|
| Java | 25 (LTS) | `backend/pom.xml`; Spring Boot 4.1 needs 17+, 25 is the current LTS |
| Maven | 3.9.16 via wrapper | pinned in `backend/.mvn/wrapper/maven-wrapper.properties` |
| Node.js / npm | 24 (LTS) / 11 | Angular 22 supports 22.12+ and 24; CI uses 24 |
| Docker | 27+ with Compose v2 and BuildKit | `docker compose` syntax; Dockerfiles use BuildKit cache mounts |
| kubectl / Helm / Terraform | 1.29+ / 4.3+ / 1.6+ | chart `kubeVersion`, lint version, `required_version` |
| K3s / cert-manager | v1.37 / v1.21 | pinned in `deploy/k3s/install.sh` |
| GitHub CLI | 2.x | workflow scope, watching runs |
