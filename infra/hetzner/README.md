# Hetzner Cloud CX33 with Terraform

```bash
cd infra/hetzner
export HCLOUD_TOKEN=...                         # Hetzner console → project → Security → API tokens (Read & Write)
cp terraform.tfvars.example terraform.tfvars   # your SSH key path and your IP
terraform init && terraform plan && terraform apply
ssh ubuntu@$(terraform output -raw public_ip)
```

Then run `deploy/k3s/install.sh` on the server and follow `docs/ENVIRONMENT-SETUP.md` from P6.
Why Hetzner and not OCI: `docs/adr/ADR-012-k3s-on-hetzner-cx33.md`. `terraform validate` runs in CI; the apply is
executed by whoever sets up the environment and recorded in `docs/PATH-TO-PRODUCTION.md`.
