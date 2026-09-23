#!/usr/bin/env bash
# Prepare a fresh Ubuntu 24.04 VM (x86 or ARM; reference: Hetzner CX33) as a single-node K3s cluster for AssetCare.
# Run as a sudo-capable user on the VM:  curl -fsSL <raw url of this file> | bash   (or copy it over and run it)
# It installs: K3s (Traefik bundled), Helm, cert-manager. It does not deploy AssetCare; DEPLOYMENT.md does.
set -euo pipefail

K3S_VERSION="${K3S_VERSION:-v1.37.0+k3s1}"
CERT_MANAGER_VERSION="${CERT_MANAGER_VERSION:-v1.21.2}"

echo "== K3s ${K3S_VERSION}"
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="$K3S_VERSION" sh -s - server --write-kubeconfig-mode 644
# K3s bundles Traefik and ServiceLB: Traefik listens on the node's public IP on 80/443 without a cloud load balancer.

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
echo "== waiting for the node"
until kubectl get nodes 2>/dev/null | grep -q ' Ready'; do sleep 3; done
kubectl get nodes -o wide

echo "== Helm"
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

echo "== cert-manager ${CERT_MANAGER_VERSION}"
kubectl apply -f "https://github.com/cert-manager/cert-manager/releases/download/${CERT_MANAGER_VERSION}/cert-manager.yaml"
kubectl -n cert-manager rollout status deploy/cert-manager --timeout=180s
kubectl -n cert-manager rollout status deploy/cert-manager-webhook --timeout=180s

# Some images (OCI's Ubuntu) ship iptables rules that reject everything but SSH. Hetzner's image does not; there the
# cloud firewall (infra/hetzner) is the only filter. Open 80/443 only where the image rejects them.
if sudo iptables -S INPUT | grep -q -- '-j REJECT'; then
  echo "== host firewall rejects inbound traffic: allowing 80/443"
  sudo iptables -I INPUT 1 -m state --state NEW -p tcp --dport 80 -j ACCEPT
  sudo iptables -I INPUT 1 -m state --state NEW -p tcp --dport 443 -j ACCEPT
  sudo netfilter-persistent save 2>/dev/null || true
fi

echo "== done. Next: edit deploy/k3s/cluster-issuer.yaml (email), kubectl apply it, then helm upgrade --install (DEPLOYMENT.md)."
