# Setting up AssetCare, explained from zero

This guide assumes nothing. You do not need to have programmed before. You will type commands into a program called a
terminal, one at a time, and after each one you will check that the computer answered the way this page says. If it
did, move to the next number. If it did not, the "If not" line tells you what to do.

There are two tracks:

- **Local** (steps L1 to L12): make AssetCare run on your own computer. This is where you learn and change things.
  About 45 minutes, most of it waiting for downloads.
- **Production** (steps P1 to P14): put AssetCare on the internet for other people, on a free Oracle Cloud computer.
  Do the Local track first. About two hours the first time.

## Before you start: five things to know

**1. What a terminal is.** A window where you type a command and press Enter; the computer answers in text.
- macOS: press `Cmd + Space`, type `Terminal`, press Enter.
- Windows: install "Ubuntu" from the Microsoft Store first (step L1 explains), then open the app called Ubuntu.
- Linux: press `Ctrl + Alt + T`.

**2. How to type a command.** Copy the line from the grey box, paste it into the terminal (`Cmd + V` on macOS,
right-click on Windows/Linux), press Enter. Type one line at a time. Lines that start with `#` are comments for you to
read, not commands; the terminal ignores them. Do not type the `$` if you see one at the start of a line.

**3. How to know it worked.** Every step has a "You should see" box. Compare. Small differences such as version
numbers a little higher than shown, or dates, are fine. A red word like `error`, `not found` or `permission denied`
is not fine: read the "If not" line.

**4. Where you are.** The terminal is always "inside" one folder. `pwd` prints which one. `cd some-folder` moves into
a folder, `cd ..` moves out, `ls` lists what is there. Most commands on this page must be typed inside the project
folder `spring-angular-production-blueprint`; step L7 takes you there and every later step reminds you.

**5. Waiting is normal.** When a command prints nothing for a while, it is working. Do not close the window. A command
is finished when the terminal shows your prompt again, waiting for you. Some commands (L9, L10) never finish on purpose:
they keep a program running. For those you open a second terminal window (`Cmd + N` on macOS, a new Ubuntu window on
Windows).

## Words you will meet

| Word | What it means here |
|---|---|
| **Backend / API** | The part of AssetCare that stores and checks data. It is a Java program. It listens at `http://localhost:8080`. |
| **Frontend / SPA** | The part you see in the browser, written with Angular. It listens at `http://localhost:4200`. |
| **localhost** | A name for "this computer". `http://localhost:8080` means "the program on my own computer listening on door number 8080". |
| **Port** | A numbered door on a computer. Two programs cannot use the same door. AssetCare uses doors 4200, 8080, 8081, 5432, 9000, 9001, 9002. |
| **Docker** | A tool that runs other programs (the database, the login server) in sealed boxes called containers, so you do not have to install them by hand. |
| **PostgreSQL** | The database: where assets are stored. Runs inside Docker. |
| **Keycloak** | The login server: knows the users and passwords. Runs inside Docker. |
| **MinIO** | File storage for attachments, like a tiny private Dropbox. Runs inside Docker. |
| **Java, Node** | Two programming languages. The backend needs Java 25, the frontend needs Node 24. You install both once. |
| **Git, GitHub** | Git keeps versions of the code. GitHub is the website where the project lives. "Clone" means "download a copy that stays connected". |
| **`.env` file** | A text file with settings (addresses, passwords for your local copy only). Never sent anywhere. |
| **Kubernetes / K3s** | For production only: a program that keeps AssetCare's containers running on a server and restarts them if they crash. K3s is the small version we use. |
| **Helm** | For production only: installs AssetCare into Kubernetes with one command. |
| **Terraform** | For production only: creates the cloud computer from a description file, so nobody clicks through a website by hand. |

---

## Local track

### L1. Your computer

**What this is.** Checking that your computer can do this at all, and on Windows, installing the Linux layer the
tools need.

**Do this.**
- macOS 13 or newer, or Ubuntu 22.04/24.04: nothing to install yet.
- Windows 10/11: open PowerShell **as administrator** (right-click the Start button → "Terminal (Admin)"), type
  `wsl --install`, press Enter, wait, restart the computer. After the restart an "Ubuntu" window opens and asks you
  to choose a username and password: pick simple ones and write them down. From now on, every command in this guide
  is typed into that Ubuntu window, not into PowerShell.

**Check.** In the terminal:

```bash
uname -sm
```

**You should see.** `Darwin arm64` or `Darwin x86_64` on a Mac, `Linux x86_64` or `Linux aarch64` on Linux and Windows.

**If not.** On Windows, if you see `wsl` errors, your Windows is too old or virtualisation is off in the BIOS;
Microsoft's page https://aka.ms/wslinstall explains both.

Also make sure you have at least 16 GB of memory and 10 GB of free disk. On a Mac: Apple menu → About This Mac. On
Windows: Settings → System → About.

### L2. Git

**What this is.** The tool that downloads the project and tracks changes.

**Do this.**

```bash
# macOS (a window may pop up asking to install "command line developer tools": click Install, wait, then continue)
xcode-select --install
# Ubuntu / Windows
sudo apt-get update && sudo apt-get install -y git curl unzip zip
```

`sudo` means "do this as the administrator"; it asks for the password you chose at L1 and shows nothing while you type
it. That is normal. Then tell Git who you are (any name and email; they are attached to your changes):

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

**Check.** `git --version`

**You should see.** `git version 2.` followed by numbers.

**If not.** `command not found`: on a Mac the pop-up installer was cancelled, run the first command again. On Ubuntu,
the `apt-get` line failed, read the last line of its output.

### L3. Java 25

**What this is.** The language the backend runs on. We install it with a helper called SDKMAN that makes updating
easy later.

**Do this.** Copy and run these four lines one at a time:

```bash
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk install java 25.0.2-tem
sdk default java 25.0.2-tem
```

If the third line says the version does not exist, run `sdk list java | grep 25` and use the newest name that ends in
`-tem` instead of `25.0.2-tem`.

**Check.** Close the terminal, open a new one, and type `java -version`

**You should see.** Three lines; the first begins with `openjdk version "25.`

**If not.**
- macOS says "Unable to locate a Java Runtime": that is a fake `java` Apple ships. SDKMAN was not loaded: run
  `source "$HOME/.sdkman/bin/sdkman-init.sh"` and check again; if that fixes it, close and reopen the terminal.
- The version is not 25: run `sdk default java 25.0.2-tem` (with the name you installed).

### L4. Node.js 24

**What this is.** The language the frontend tools run on. Installed with a helper called nvm.

**Do this.**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 24
nvm alias default 24
```

**Check.** Close the terminal, open a new one: `node --version && npm --version`

**You should see.** `v24.` followed by numbers, then `11.` followed by numbers.

**If not.** `nvm: command not found` in the new terminal: run `source ~/.nvm/nvm.sh` and try again; if that works, add
that line to the end of the file `~/.zshrc` (macOS) or `~/.bashrc` (Linux) with any text editor.

### L5. Docker

**What this is.** Runs the database, the login server and the file storage without installing them one by one.

**Do this.**
- **macOS**: download Docker Desktop from https://www.docker.com/products/docker-desktop/, open the file, drag Docker
  to Applications, open Docker from Applications, accept the licence, wait until the whale icon in the menu bar stops
  moving. Then click the whale → Settings → Resources and set CPUs to 4 and Memory to 6 GB → Apply.
- **Windows**: download Docker Desktop from the same page, install it, when asked tick "Use WSL 2", restart. Open
  Docker Desktop → Settings → Resources → WSL integration → switch on "Ubuntu" → Apply. Docker Desktop must be open
  (whale icon in the tray) whenever you use AssetCare.
- **Ubuntu**: follow "Install using the apt repository" at https://docs.docker.com/engine/install/ubuntu/ (six copy-
  paste lines), then `sudo usermod -aG docker $USER`, then log out and log in again.

**Check.**

```bash
docker --version
docker compose version
docker run --rm hello-world
```

**You should see.** `Docker version 27` or higher, `Docker Compose version v2`, and a message that begins
`Hello from Docker!`

**If not.**
- `Cannot connect to the Docker daemon`: Docker Desktop is not running; open it and wait for the whale.
- `permission denied` on Ubuntu: you did not log out and in after the `usermod` line.
- On Windows, `docker: command not found` inside Ubuntu: WSL integration is not switched on in Docker Desktop settings.

### L6. make and jq

**What this is.** `make` runs the project's shortcuts (`make backend` instead of a long command). `jq` shows
answers from the API in a readable way.

**Do this.** macOS: `brew install jq` (if `brew` is not found, install Homebrew first from https://brew.sh, one
copy-paste line). Ubuntu/Windows: `sudo apt-get install -y make jq`

**Check.** `make --version | head -1 && jq --version`

**You should see.** `GNU Make 3.81` or higher, and `jq-1.7` or similar.

### L7. Download the project and let the doctor check everything

**What this is.** Getting the code onto your computer, creating your settings file, and running a built-in check
of steps L2 to L6.

**Do this.**

```bash
cd ~
git clone https://github.com/Janaka2/spring-angular-production-blueprint.git
cd spring-angular-production-blueprint
cp .env.example .env
make doctor
```

From now on, whenever you open a new terminal, first type `cd ~/spring-angular-production-blueprint` to get back into
the project folder.

**You should see.** A list where every tool shows a version, `daemon reachable`, seven ports marked `free`,
`.env: present`, and the last line `doctor: ready`.

**If not.** The doctor names the step: `MISSING (step 3: Java 25)` means go back to L3. `BUSY` next to a port
means another program already uses that door. To find out which: `lsof -i :8080` (replace the number). Usually it is
an old copy of something you can close. If you cannot, ask for help before continuing.

### L8. Start the database, the login server and the file storage

**What this is.** Docker starts three containers. The first time it downloads about 1.2 GB.

**Do this.** Inside the project folder:

```bash
docker compose up -d --wait
```

Wait until the prompt comes back (two to five minutes the first time).

**Check.**

```bash
docker compose ps --format 'table {{.Name}}\t{{.Status}}'
curl -s http://localhost:8081/realms/assetcare | jq -r .realm
```

**You should see.** Three lines with `Up (healthy)`: `assetcare-postgres`, `assetcare-keycloak`, `assetcare-minio`.
Then the single word `assetcare`.

**If not.** One line says `starting` or `unhealthy`: wait one more minute and check again. Still bad after three
minutes: `docker compose logs keycloak` (or the name shown) prints why; the usual cause is too little memory for Docker
(L5, set 6 GB). `docker compose down` stops everything and you can try again.

You can now open http://localhost:8081 in your browser: that is Keycloak's admin screen, user `admin`, password
`admin-dev-password`. You do not need to change anything there.

### L9. Start the backend

**What this is.** Running the Java program that handles the data. This terminal window will stay busy; that is
correct.

**Do this.** In the project folder:

```bash
make backend
```

The first time it downloads a lot (three minutes). It is ready when a line appears that contains
`Started AssetCareApplication`. Leave this window open.

**Check.** Open a **second** terminal window, go to the project folder (`cd ~/spring-angular-production-blueprint`),
then:

```bash
curl -s http://localhost:8080/actuator/health | jq -c '{status, db: .components.db.status}'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/v1/assets
```

**You should see.** `{"status":"UP","db":"UP"}` and then `401`. The 401 is good: it means the API refuses people
who have not logged in.

**If not.** `Connection refused`: the backend is still starting, wait for `Started AssetCareApplication`. An error in
the first window mentioning `5432` or `datasource`: the database is not up, go back to L8. An error mentioning
`issuer`: Keycloak is not up, same.

Bonus, to prove a login works without a browser:

```bash
TOKEN=$(curl -s -X POST http://localhost:8081/realms/assetcare/protocol/openid-connect/token \
  -d client_id=assetcare-dev-cli -d grant_type=password -d username=alice -d password=alice-dev-password | jq -r .access_token)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/me | jq -c .
```

You should see a line containing `"username":"alice"`.

### L10. Start the frontend and log in

**What this is.** Running the website part. This needs a third terminal window that stays busy.

**Do this.** In a new terminal window, in the project folder:

```bash
cd frontend && npm ci && cd ..
make frontend
```

`npm ci` runs once and takes about two minutes. `make frontend` is ready when you see `Local: http://localhost:4200/`.

**Check.** Open http://localhost:4200 in your browser.

**You should see.** A login page. Type `alice` and `alice-dev-password`. Then the AssetCare dashboard with a few
example assets appears. Click "New asset", fill in a name, save. It appears in the list.

**If not.** The page never loads: the frontend window shows an error, usually because `npm ci` did not finish; run it
again. The login page appears but after logging in you return to the login page: you opened a different address than
`http://localhost:4200` exactly (for example `127.0.0.1`); use that exact address. "Cannot reach the server" inside
the app: the backend (L9) is not running.

**You have AssetCare running.** Three terminal windows are busy (backend, frontend) and Docker holds the rest. To stop
everything at the end of the day: press `Ctrl + C` in the backend and frontend windows, then `docker compose down`.
To start again tomorrow: L8 (`docker compose up -d --wait`), L9, L10. Your data stays.

### L11. Run the tests

**What this is.** The project checks itself. Running them proves your setup is complete and teaches you the safety
net you will rely on when you change things.

**Do this.** In a free terminal, in the project folder, with L8, L9 and L10 still running:

```bash
make unit-test
make integration-test
make test
make lint
cd frontend && npx playwright install --with-deps chromium && cd ..
make e2e
```

Each takes between 30 seconds and 3 minutes.

**You should see.** Each command ends with a success line: `BUILD SUCCESS` for the first two, `10 passed` or more
for the third, `All files pass linting`, and `3 passed` for the last. The Playwright test opens and closes a browser by
itself.

**If not.** A red `FAIL` or `ERROR` with a test name: copy the whole output and search for it in the project's
issues on GitHub, or open a new issue with the "Bug" template. Your setup is still fine if L10 worked.

### L12. Watch it breathe (optional)

**What this is.** Dashboards that show what the application is doing: how many requests, how fast, any errors.

**Do this.** `make observability`, then click around the app for a minute, then open http://localhost:3000, log in
with `admin` / `admin`, and open Dashboards → AssetCare → "AssetCare overview".

**You should see.** Graphs that move when you click in the app. Stop with `make observability-down`.

---

## Production track

You need: the Local track done, a domain name you own (for example `assetcare.example.com`, about 10 euros a year at
any registrar), a GitHub account, and an Oracle Cloud account (free; it asks for a credit card to verify identity but
the machine we use costs nothing). Every command below runs on your own computer unless it says "on the server".

### P1. Deployment tools

**What this is.** Four programs that talk to the cloud and the server: `kubectl` (talks to Kubernetes), `helm`
(installs AssetCare there), `terraform` (creates the server), `gh` (talks to GitHub).

**Do this.** macOS: `brew install kubectl helm terraform gh`. Ubuntu: follow the install pages linked in the Words
table above, one tool at a time.

**Check.**

```bash
kubectl version --client | head -1; helm version --short; terraform version | head -1; gh --version | head -1
cd ~/spring-angular-production-blueprint && make helm-lint
```

**You should see.** A version line for each (kubectl 1.29+, Helm v4.3+, Terraform 1.6+, gh 2.x), then
`1 chart(s) linted, 0 chart(s) failed`.

### P2. Connect to GitHub and let the tests run in the cloud

**What this is.** GitHub can run all the project's tests on its own computers every time code changes. To send it
the instructions you need one extra permission.

**Do this.**

```bash
gh auth login             # choose GitHub.com, HTTPS, "Login with a web browser", follow the browser
gh auth refresh -h github.com -s workflow,write:packages
```

If you work on your own copy of the project, first "fork" it on GitHub (button top right of the project page) and
clone your fork instead of the original in L7.

**Check.**

```bash
gh auth status
git push origin main
gh run list --limit 3
```

**You should see.** `Token scopes:` including `workflow`. Then, a minute after the push, `gh run list` shows runs
named `ci` and `security`. Type `gh run watch` and pick one; wait until it says `completed success`. This can take
15 minutes and is the first time every test, including the browser test and the backup drill, runs.

**If not.** `refusing to allow an OAuth App to create or update workflow`: the `refresh` line did not run or you
declined it in the browser; run it again. A run that ends `failure`: click the link it prints; the failed step is
marked red and its log says what broke.

### P3. Publish the version

**What this is.** Building the two container images (backend, frontend) for the server, in the cloud, and stamping
them with a version number.

**Do this.**

```bash
git tag v1.0.0 && git push origin v1.0.0
gh run watch
```

**Check.** `gh run list --workflow release --limit 1`

**You should see.** `completed success`. On GitHub, on the project page, the right-hand column "Packages" now shows
`assetcare-api` and `assetcare-frontend`. Click each → "Package settings" → "Change visibility" → Public. (Private
packages also work but need an extra secret in P10.)

### P4. Oracle Cloud account and key

**What this is.** Creating the account and a key file so Terraform is allowed to create a server for you.

**Do this.**
1. Sign up at https://www.oracle.com/cloud/free/. Choose a home region near you (for example Zurich or Frankfurt);
   it cannot be changed later. Wait for the "account is ready" email (minutes to a day).
2. Log in to the console. Top right, click the profile icon → your username. On that page: "API keys" → "Add API
   key" → "Generate API key pair" → "Download private key" → save it. Click "Add".
3. A box "Configuration file preview" appears. Copy its text. On your computer:

```bash
mkdir -p ~/.oci
mv ~/Downloads/*.pem ~/.oci/oci_api_key.pem
nano ~/.oci/config          # paste the text; change the key_file line to: key_file=~/.oci/oci_api_key.pem ; Ctrl+O, Enter, Ctrl+X
chmod 600 ~/.oci/config ~/.oci/oci_api_key.pem
```

4. In the console, top left menu → Identity & Security → Compartments. Click the root compartment (named after your
   tenancy). Copy its OCID (a long text starting with `ocid1.`). Keep it for P5.

**Check.** `grep -c "ocid1" ~/.oci/config`

**You should see.** `2` (a user id and a tenancy id).

### P5. Create the server

**What this is.** Terraform reads `infra/oci/main.tf` and creates one free ARM server with 4 cores and 24 GB, plus
its network, plus a firewall that allows only SSH, HTTP and HTTPS.

**Do this.**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/assetcare -N ""        # a key pair to log in to the server; press Enter if asked anything
cd ~/spring-angular-production-blueprint/infra/oci
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars
```

In that file: set `region` to your home region code (shown top right in the console, e.g. `eu-zurich-1`),
`compartment_ocid` to the OCID from P4, `ssh_public_key_path` to `~/.ssh/assetcare.pub`, and `ssh_allowed_cidr` to
your own public IP followed by `/32` (find it at https://ifconfig.me). Save (Ctrl+O, Enter, Ctrl+X). Then:

```bash
terraform init
terraform apply          # read the plan, type yes
```

**Check.**

```bash
terraform output public_ip
ssh -i ~/.ssh/assetcare ubuntu@$(terraform output -raw public_ip) 'uname -m; nproc; free -g | head -2'
```

Answer `yes` when SSH asks whether to trust the new server.

**You should see.** An IP address, then `aarch64`, `4`, and a memory line showing about `23` total.

**If not.** `Out of host capacity`: Oracle has no free ARM machines in that spot right now. Open
`terraform.tfvars`, add the line `availability_domain_index = 1`, run `terraform apply` again; try `2` next; if all
fail, try again in a few hours. This is the most common obstacle and it is not your fault.
`401 NotAuthenticated`: the key or config from P4 is wrong; re-check the `key_file` path.

Write the IP down. Every later step calls it `<IP>`.

### P6. Install Kubernetes on the server

**What this is.** One script installs K3s (the small Kubernetes), Helm and cert-manager (which fetches free HTTPS
certificates) on the server.

**Do this.** Replace `<IP>` with your address:

```bash
cd ~/spring-angular-production-blueprint
scp -i ~/.ssh/assetcare deploy/k3s/install.sh ubuntu@<IP>:
ssh -i ~/.ssh/assetcare ubuntu@<IP> 'sudo apt-get update -q && sudo apt-get -y -q dist-upgrade && bash install.sh'
```

This takes about five minutes. Then copy the "key to the cluster" to your computer so you can control it from here:

```bash
mkdir -p ~/.kube
ssh -i ~/.ssh/assetcare ubuntu@<IP> 'sudo cat /etc/rancher/k3s/k3s.yaml' | sed "s/127.0.0.1/<IP>/" > ~/.kube/assetcare.yaml
export KUBECONFIG=~/.kube/assetcare.yaml
```

The `export` line must be typed again in every new terminal window you use for production work (or add it to the end
of `~/.zshrc` / `~/.bashrc`). Because the cluster door (6443) is closed to the internet by the firewall, also open a
tunnel through SSH and keep that window open while you work:

```bash
ssh -i ~/.ssh/assetcare -L 6443:127.0.0.1:6443 ubuntu@<IP> -N
```

and in `~/.kube/assetcare.yaml` change `<IP>` back to `127.0.0.1` (the tunnel delivers it). If that is confusing:
run every `kubectl` and `helm` command of the next steps on the server itself instead, after
`ssh -i ~/.ssh/assetcare ubuntu@<IP>` and `export KUBECONFIG=/etc/rancher/k3s/k3s.yaml`; clone the project there
with the `git clone` line from L7.

**Check.**

```bash
kubectl get nodes
kubectl -n cert-manager get pods
```

**You should see.** One line with `Ready`, and three lines with `Running`.

**If not.** `connection refused` or `timeout`: the tunnel window is not open, or `KUBECONFIG` was not exported in
this window.

### P7. Check the doors are open

**What this is.** Two firewalls protect the server (Oracle's and the server's own). Terraform and the installer
opened doors 80 and 443 in both. This just checks.

**Check.** `curl -sI http://<IP> | head -1`

**You should see.** `HTTP/1.1 404 Not Found`. A 404 is correct here: the web server answers, it just has nothing at
that address yet.

**If not.** It hangs and then says `timed out`: in the Oracle console, Networking → Virtual cloud networks →
`assetcare-vcn` → Security Lists → `assetcare-web`: there must be ingress rules for TCP 80 and 443 from `0.0.0.0/0`.
Add them if missing.

### P8. Point your domain at the server

**What this is.** Telling the internet that `assetcare.yourdomain.tld` means your server's IP.

**Do this.** At the website where you bought the domain, find "DNS" or "DNS records". Add a record: Type `A`, Name
`assetcare` (or whatever word you want before your domain), Value `<IP>`, TTL 300 or "5 minutes". Save.

**Check.** After a few minutes: `dig +short assetcare.yourdomain.tld`

**You should see.** Your `<IP>`. If it prints nothing, wait five more minutes and repeat; DNS changes spread slowly.
Do not continue before this works; the next step depends on it.

### P9. Set up free HTTPS certificates

**What this is.** Let's Encrypt gives free certificates (the padlock in the browser). cert-manager asks for them
automatically; it just needs your email and a choice between the "staging" (practice) and "prod" (real) service.

**Do this.** Replace the email:

```bash
cd ~/spring-angular-production-blueprint
sed -i.bak 's/CHANGE-ME@example.com/you@example.com/' deploy/k3s/cluster-issuer.yaml
kubectl apply -f deploy/k3s/cluster-issuer.yaml
```

**Check.** `kubectl get clusterissuer`

**You should see.** Two lines, `letsencrypt-prod` and `letsencrypt-staging`, both with `READY True`.

### P10. Create the passwords for production

**What this is.** Production must not use the practice passwords from your laptop. This generates strong random
ones and stores them in Kubernetes where only the application can read them. You never need to type them.

**Do this.**

```bash
kubectl create namespace assetcare
gen() { openssl rand -base64 30 | tr -d '/+=' | cut -c1-32; }
DB=$(gen); KC=$(gen); S3PW=$(gen)
kubectl -n assetcare create secret generic assetcare-secrets \
  --from-literal=ASSETCARE_DB_PASSWORD="$DB" --from-literal=POSTGRES_PASSWORD="$DB" \
  --from-literal=KC_BOOTSTRAP_ADMIN_PASSWORD="$KC" \
  --from-literal=MINIO_ROOT_USER=assetcare --from-literal=MINIO_ROOT_PASSWORD="$S3PW" \
  --from-literal=ASSETCARE_S3_ACCESS_KEY=assetcare --from-literal=ASSETCARE_S3_SECRET_KEY="$S3PW"
echo "Keycloak admin password: $KC"
```

Copy the Keycloak admin password from the last line into your password manager now. It is the only one you will
ever type (to manage users), and it is not shown again.

**Check.** `kubectl -n assetcare get secret assetcare-secrets -o jsonpath='{.data}' | jq 'keys | length'`

**You should see.** `7`

### P11. Tell the login server your address

**What this is.** Keycloak only sends people back to addresses it knows. Put your domain into the login
configuration.

**Do this.**

```bash
sed -i.bak 's#assetcare.example.com#assetcare.yourdomain.tld#g' deploy/helm/assetcare/realm/assetcare-realm.json
```

**Check.** `grep -c "assetcare.yourdomain.tld" deploy/helm/assetcare/realm/assetcare-realm.json`

**You should see.** `3` or more.

### P12. Install AssetCare on the server

**What this is.** One Helm command creates everything on the cluster: the database, the login server, the file
storage, the backend, the frontend, the nightly backup, the HTTPS certificate.

**Do this.** Use the practice certificate service first:

```bash
helm upgrade --install assetcare deploy/helm/assetcare -n assetcare \
  --set global.host=assetcare.yourdomain.tld \
  --set image.tag=1.0.0 \
  --set api.existingSecret=assetcare-secrets \
  --set ingress.clusterIssuer=letsencrypt-staging \
  --wait --timeout 15m
```

The first time takes five to ten minutes. If your packages are private (P3), add
`--set global.imagePullSecrets[0].name=ghcr` and create that secret first with the command in `DEPLOYMENT.md` §2.

**Check.**

```bash
kubectl -n assetcare get pods
kubectl -n assetcare get certificate
```

**You should see.** Five pods with `Running` and `1/1` (api, frontend, postgres-0, keycloak-0, minio-0), one
`minio-init` with `Completed`, and the certificate `assetcare-tls` with `READY True`.

Then run the exact same `helm upgrade` command once more with `letsencrypt-prod` instead of `letsencrypt-staging`.
Within a minute the certificate is replaced by a real one.

**If not.**
- A pod stays `Pending` or `ContainerCreating` for more than five minutes: `kubectl -n assetcare describe pod <name>`,
  read the "Events" at the bottom; `ImagePullBackOff` means P3's packages are private.
- Certificate `READY False` after five minutes: `kubectl -n assetcare describe challenge`; the usual cause is P8 not
  finished or P7's doors closed.
- `helm` says `timed out waiting`: run the check commands anyway; slow first starts are common. If the api pod is
  `CrashLoopBackOff`, `kubectl -n assetcare logs deploy/assetcare-api` shows the reason.

### P13. Open it in the browser

**Check.**

```bash
scripts/smoke-test.sh https://assetcare.yourdomain.tld
scripts/health.sh k8s assetcare
```

Then open `https://assetcare.yourdomain.tld` in a browser and log in with `alice` / `alice-dev-password`.

**You should see.** `smoke test passed`, a list of `OK` lines and `health: OK`, a padlock in the browser, and the
AssetCare dashboard.

**Then, immediately.** The example users still have the practice passwords, and anyone on the internet can now
reach the login page. Open `https://assetcare.yourdomain.tld/auth/admin/`, log in as `admin` with the Keycloak
admin password from P10, choose the realm `assetcare` (top left), go to Users, and for `alice`, `bob`, `admin` and
`audrey` either set a new password (Credentials tab) or delete the user. Create your real users the same way.

### P14. Make sure backups happen

**What this is.** Every night at 02:30 a copy of the database is saved. You prove it works now instead of finding
out on a bad day.

**Do this.**

```bash
kubectl -n assetcare create job --from=cronjob/assetcare-backup backup-now
kubectl -n assetcare wait --for=condition=complete job/backup-now --timeout=5m
kubectl -n assetcare logs job/backup-now
```

**You should see.** A line `backup written: /backups/assetcare-<date>.sql.gz (<size>)`.

**Also do, once a month.** The restore drill in `docs/operations/BACKUP-RESTORE.md`. And read
`docs/operations/OPERATIONS-GUIDE.md`: it explains, in the same plain style, how to check that everything is healthy,
how to update to a new version, and what to do when something is wrong.

**You are in production.** Congratulations. The whole setup is free while you stay within Oracle's free tier
(the guide never leaves it), and everything you did is written in files, so you can do it again on a new server in an
hour if this one disappears.

---

## When something goes wrong: the general method

1. Read the last five lines the terminal printed. The reason is almost always there, in plain English.
2. Find the step number you are on and read its "If not".
3. Look for the exact error text in the table below.
4. Still stuck: open an issue on GitHub with the "Bug" template, paste the command, the last 20 lines of output, and
   the step number. Do not paste passwords.

| Exact words you see | Step | What to do |
|---|---|---|
| `command not found` | any | the tool from that step is not installed, or the terminal was not reopened after installing |
| `permission denied` | L5, L7 | Ubuntu: log out and in after adding yourself to the docker group; macOS: Docker Desktop not running |
| `port is already allocated` / `BUSY` | L7, L8 | another program uses that door; `lsof -i :<port>` shows which |
| `Cannot connect to the Docker daemon` | L8+ | open Docker Desktop and wait for the whale to be still |
| `Connection refused` on 8080 | L9 | the backend is not running or not finished starting |
| login page comes back after logging in | L10 | use exactly `http://localhost:4200` |
| `Out of host capacity` | P5 | Oracle has no free ARM machine now; change `availability_domain_index`, retry later |
| `NotAuthenticated` | P5 | the `~/.oci/config` from P4 is wrong |
| `refusing to allow an OAuth App to create or update workflow` | P2 | run the `gh auth refresh` line again |
| `ImagePullBackOff` | P12 | packages are private; make them public (P3) |
| `READY False` on the certificate | P12 | DNS (P8) or doors (P7); `kubectl -n assetcare describe challenge` |
| padlock with a warning | P12 | you are still on the staging certificate; run the prod helm command |
