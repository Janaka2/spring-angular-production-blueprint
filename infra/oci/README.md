# OCI Always Free VM with Terraform

```bash
cd infra/oci
cp terraform.tfvars.example terraform.tfvars   # fill in your compartment OCID and SSH key
terraform init && terraform plan && terraform apply
ssh ubuntu@$(terraform output -raw public_ip)
```

Then run `deploy/k3s/install.sh` on the VM and follow `docs/operations/DEPLOYMENT.md`.

Not executed by the author's build environment (no OCI tenancy available there); the configuration follows the
provider's documented resources for the A1.Flex free shape. `terraform validate` is part of the CI pipeline.
