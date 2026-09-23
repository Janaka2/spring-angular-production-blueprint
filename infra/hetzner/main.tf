# One Hetzner Cloud CX33 (4 vCPU x86, 8 GB RAM, 80 GB NVMe, 20 TB traffic) for the AssetCare production trial.
# ADR-012 explains why it replaced the OCI Always Free VM. The chart needs about 2 GB of requests and 4 GB of limits;
# K3s and cert-manager add about 1 GB, so 8 GB leaves room for rolling updates but not for the observability profile.
# COST: the server is billed hourly up to a monthly cap, plus the primary IPv4 address and, if enabled, backups
# (20 % of the server price). Nothing else here costs money. `terraform destroy` stops all charges.
terraform {
  required_version = ">= 1.6"
  required_providers {
    hcloud = { source = "hetznercloud/hcloud", version = ">= 1.52" }
  }
}

# The API token comes from the HCLOUD_TOKEN environment variable, never from a file in this folder.
provider "hcloud" {}

resource "hcloud_ssh_key" "admin" {
  name       = "assetcare-admin"
  public_key = file(pathexpand(var.ssh_public_key_path))
}

# Only SSH, HTTP, HTTPS and ping from the internet. Kubernetes API (6443) is not exposed: use SSH port forwarding.
# Rules not listed are dropped; outbound traffic is unrestricted.
resource "hcloud_firewall" "web" {
  name = "assetcare-web"
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.ssh_allowed_cidrs
  }
  dynamic "rule" {
    for_each = ["80", "443"]
    content {
      direction  = "in"
      protocol   = "tcp"
      port       = rule.value
      source_ips = ["0.0.0.0/0", "::/0"]
    }
  }
  rule {
    direction  = "in"
    protocol   = "icmp"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}

resource "hcloud_server" "k3s" {
  name         = "assetcare-k3s"
  server_type  = var.server_type
  image        = "ubuntu-24.04"
  location     = var.location
  ssh_keys     = [hcloud_ssh_key.admin.id]
  firewall_ids = [hcloud_firewall.web.id]
  backups      = var.backups
  # Hetzner images log in as root. cloud-init creates the sudo user "ubuntu" and turns root login off, so the
  # commands in ENVIRONMENT-SETUP.md are the same on any Ubuntu VM.
  user_data = templatefile("${path.module}/cloud-init.yaml", {
    ssh_public_key = trimspace(file(pathexpand(var.ssh_public_key_path)))
  })
  public_net {
    ipv4_enabled = true # COST: a primary IPv4 is billed monthly; Let's Encrypt and most visitors need it
    ipv6_enabled = true
  }
  labels = { app = "assetcare" }
}

output "public_ip" { value = hcloud_server.k3s.ipv4_address }
output "public_ipv6" { value = hcloud_server.k3s.ipv6_address }
output "ssh" { value = "ssh ubuntu@${hcloud_server.k3s.ipv4_address}" }
