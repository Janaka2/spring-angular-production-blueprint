# K3s on an Oracle Cloud Always Free ARM VM

The reference deployment costs nothing: one `VM.Standard.A1.Flex` instance with 4 OCPU and 24 GB, 100 GB boot volume,
an ephemeral public IP, and Let's Encrypt certificates. This page walks from an empty tenancy to
`https://assetcare.example.com` and says, at each step, how to verify it and what it would cost to exceed the free tier.

| Step | Free tier limit | Beyond it (COST) |
|---|---|---|
| A1.Flex compute | 4 OCPU + 24 GB total, always free | more A1 cores or any x86 shape are billed |
| Block storage | 200 GB total | billed per GB |
| Public IP | ephemeral or one reserved, free | additional reserved IPs billed |
| Outbound traffic | 10 TB per month | billed per GB |
| Object Storage | 20 GB, 50 000 requests per month | billed |
| Load balancer | one flexible 10 Mbps, free (not used here; Traefik on the node's IP) | larger shapes billed |

Capacity is the catch: A1 hosts are popular and "Out of host capacity" is common. Retry at another time or in another
availability domain (`availability_domain_index` in Terraform). Upgrading to Pay As You Go keeps the free resources
free and usually gets capacity faster; it is still zero cost as long as you stay inside the limits above.

## 1. The VM

Either `infra/oci/` with Terraform (`terraform apply`, see its README) or the console: Compute → Instances → Create,
shape `VM.Standard.A1.Flex` 4 OCPU / 24 GB, image Canonical Ubuntu 24.04 (aarch64), boot volume 100 GB, public IPv4,
your SSH key. Security list of the subnet: ingress TCP 22 (your IP), 80 and 443 (anywhere). Egress: all.

Verify: `ssh ubuntu@<public ip> uname -m` prints `aarch64`.

## 2. K3s, Helm, cert-manager

```bash
ssh ubuntu@<public ip>
sudo apt-get update && sudo apt-get -y dist-upgrade && sudo reboot
# after the reboot
curl -fsSL https://raw.githubusercontent.com/Janaka2/spring-angular-production-blueprint/main/deploy/k3s/install.sh -o install.sh
bash install.sh
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl get nodes -o wide                 # STATUS Ready
kubectl -n cert-manager get pods          # three Running
```

The Ubuntu image on OCI ships iptables rules that drop everything but SSH; the installer opens 80 and 443 (the OCI
security list is a second, separate firewall).

Verify: `curl -I http://<public ip>` answers with a 404 from Traefik.

## 3. DNS and TLS

Create an A record `assetcare.example.com → <public ip>` at your DNS provider. Wait until `dig +short
assetcare.example.com` returns the IP. Then:

```bash
sed -i 's/CHANGE-ME@example.com/you@example.com/' deploy/k3s/cluster-issuer.yaml
kubectl apply -f deploy/k3s/cluster-issuer.yaml
```

Use `letsencrypt-staging` (`--set ingress.clusterIssuer=letsencrypt-staging`) for the first install; the browser will
warn about the staging CA, which is expected. Switch to `letsencrypt-prod` once the staging certificate was issued.
Let's Encrypt limits production issuance to 5 duplicate certificates a week.

Verify: `kubectl -n assetcare get certificate` shows `READY True`; `curl -sI https://assetcare.example.com | head -1`.

## 4. AssetCare

```bash
git clone https://github.com/Janaka2/spring-angular-production-blueprint.git && cd spring-angular-production-blueprint
sed -i 's#assetcare.example.com#assetcare.yourdomain.tld#g' deploy/helm/assetcare/realm/assetcare-realm.json
kubectl create namespace assetcare
kubectl -n assetcare create secret generic assetcare-secrets --from-literal=... # DEPLOYMENT.md section 3
helm upgrade --install assetcare deploy/helm/assetcare -n assetcare \
  --set global.host=assetcare.yourdomain.tld --set image.tag=1.0.0 \
  --set api.existingSecret=assetcare-secrets --wait --timeout 15m
kubectl -n assetcare get pods,pvc,ingress,certificate
scripts/smoke-test.sh https://assetcare.yourdomain.tld
```

The first start is slow: Keycloak imports the realm and the API runs Liquibase; the startup probes allow three minutes.

Verify: the smoke test prints `UP` for health and a `401` for the unauthenticated API call; log in with `alice` at
`https://assetcare.yourdomain.tld/` and create an asset.

Memory after the core profile on the 24 GB node (requests): API 512 Mi, Keycloak 768 Mi, PostgreSQL 512 Mi, MinIO
256 Mi, frontend 64 Mi, K3s and Traefik roughly 1 Gi. The observability profile adds about 2 Gi with retention set to
three days. Both fit; the node is not the constraint, A1 capacity is.

## 5. Backups off the VM

The CronJob writes nightly dumps to a persistent volume on the same VM, which is not a backup against losing the VM.
Set `backup.s3Bucket` and `backup.s3Endpoint` to an OCI Object Storage bucket (free up to 20 GB) so the dump is also
copied out, or add an OCI block volume backup policy (free within the 200 GB). `BACKUP-RESTORE.md` has the restore
procedure and the drill.

## 6. Keeping it free and alive

- Oracle reclaims idle Always Free instances after seven days of very low use on free-tier tenancies; a monitoring
  probe or the nightly backup keeps it "used". Pay As You Go tenancies are not reclaimed.
- Unattended upgrades reboot the VM; K3s comes back on its own, PVCs are on the boot volume.
- `kubectl top nodes` and the Grafana node dashboard show headroom.

## What was and was not executed

The Terraform configuration, the installer and every command above follow the official OCI, K3s, cert-manager and Helm
documentation for the pinned versions, and the chart they install was linted and rendered in CI. The author's build
environment had no OCI tenancy and no Docker daemon, so **the OCI installation itself was NOT EXECUTED** as part of this
repository's verification report. Run it and open an issue if a step disagrees with reality.
