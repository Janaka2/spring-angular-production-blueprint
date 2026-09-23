# ADR-012: The production trial runs K3s on one Hetzner Cloud CX33, not on an OCI Always Free VM

**Status:** accepted, supersedes ADR-004 · **Date:** 2026-09-23

## Context

ADR-004 put the reference deployment on an OCI Always Free A1.Flex VM because it costs nothing. In practice the
environment could not be brought up: repeated attempts to follow `ENVIRONMENT-SETUP.md` P4 to P7 did not produce a
working server, and "Out of host capacity" for free A1 shapes is a known, recurring obstacle that nobody can fix from
the outside. A production trial that cannot be created on demand is not a trial, and the time lost costs more than a
small monthly bill. The requirement is unchanged: real Kubernetes on one small VM, reachable over HTTPS, rebuildable
from files in this repository.

## Options

1. **Stay on OCI Always Free**: free and generous (4 cores, 24 GB), but capacity is not guaranteed, the account and
   network setup is the heaviest of all options, and idle free instances can be reclaimed. Lost: it did not work.
2. **Hetzner Cloud CX33** (4 shared x86 vCPU, 8 GB, 80 GB NVMe, 20 TB traffic, EU data centres): a few euros a
   month, created in under a minute, a simple API token, a stateful cloud firewall, and nightly server backups for 20 %
   extra. 8 GB holds the chart (about 2 GB requests, 4 GB limits) plus K3s and cert-manager.
3. **A managed Kubernetes service** (OKE, EKS, AKS, GKE, Hetzner has none): the enterprise target, but a control plane
   and load balancer cost several times the whole trial. Lost on cost for a trial.
4. **A larger VM elsewhere** (DigitalOcean, AWS Lightsail): same shape as option 2 at two to four times the price.

Free-first / enterprise-ready check: the Helm chart, K3s and `deploy/k3s/install.sh` are unchanged, and the images are
already multi-arch, so the move is a change of VM, not of architecture. `infra/oci` and `OCI-FREE-TIER.md` stay in the
repository as a zero-cost alternative for whoever has A1 capacity.

## Decision

The production trial is one Hetzner Cloud CX33 running Ubuntu 24.04 and K3s, created by `infra/hetzner` (Terraform,
provider `hetznercloud/hcloud`) with a Hetzner cloud firewall that admits SSH from the operator's IP and HTTP/HTTPS
from anywhere, and Hetzner server backups enabled. The API token lives only in the `HCLOUD_TOKEN` environment variable.
`ENVIRONMENT-SETUP.md` P4 to P7 describe this path; everything from P8 on is provider-neutral.

## Consequences

- It costs money every month (server, IPv4, backups); the guide says so and points at the price page instead of
  quoting a number that goes stale.
- 8 GB instead of 24 GB: the core chart fits with headroom; the observability profile on the same node does not fit
  comfortably and needs a CX43 (16 GB) or a second server. `PRODUCTION-GAPS.md` records this.
- x86_64 instead of arm64: the images already build for both, nothing changes.
- Hetzner's Ubuntu image logs in as root; cloud-init in `infra/hetzner` creates the `ubuntu` sudo user and disables
  root login so the rest of the guide is identical on any Ubuntu VM.
- `deploy/k3s/install.sh` opens 80/443 in iptables only when the image rejects them (OCI does, Hetzner does not).
- Data stays in the EU (Germany or Finland), which suits a GDPR-minded trial.
- Hetzner's object storage is not used; off-server copies of the nightly dump come from Hetzner server backups, or
  from `backup.s3Bucket` pointed at any S3-compatible bucket.

## Revisit when

The trial needs more than one node or zone (move to managed Kubernetes, `PRODUCTION-GAPS.md`), memory pressure appears
with the observability profile (resize to CX43 with `server_type`), or an enterprise hosting constraint names a
specific cloud.
