# One Always Free ARM VM on Oracle Cloud for the AssetCare reference deployment.
# Free tier: up to 4 OCPU and 24 GB across A1.Flex instances, 200 GB block storage, one VCN. Capacity is not guaranteed;
# if "Out of host capacity" appears, retry later or try another availability domain.
# Everything here is free-tier eligible; anything that costs money is marked COST.
terraform {
  required_version = ">= 1.6"
  required_providers {
    oci = { source = "oracle/oci", version = ">= 6.0" }
  }
}

provider "oci" { region = var.region }

data "oci_identity_availability_domains" "ads" { compartment_id = var.compartment_ocid }

data "oci_core_images" "ubuntu_arm" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

resource "oci_core_vcn" "vcn" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = ["10.0.0.0/16"]
  display_name   = "assetcare-vcn"
  dns_label      = "assetcare"
}

resource "oci_core_internet_gateway" "igw" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.vcn.id
  display_name   = "assetcare-igw"
}

resource "oci_core_route_table" "rt" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.vcn.id
  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.igw.id
  }
}

# Only SSH, HTTP and HTTPS from the internet. Kubernetes API (6443) is not exposed: use SSH port forwarding.
resource "oci_core_security_list" "web" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.vcn.id
  display_name   = "assetcare-web"
  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }
  dynamic "ingress_security_rules" {
    for_each = [22, 80, 443]
    content {
      protocol = "6"
      source   = ingress_security_rules.value == 22 ? var.ssh_allowed_cidr : "0.0.0.0/0"
      tcp_options {
        min = ingress_security_rules.value
        max = ingress_security_rules.value
      }
    }
  }
}

resource "oci_core_subnet" "public" {
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.vcn.id
  cidr_block        = "10.0.1.0/24"
  display_name      = "assetcare-public"
  route_table_id    = oci_core_route_table.rt.id
  security_list_ids = [oci_core_security_list.web.id]
  dns_label         = "pub"
}

resource "oci_core_instance" "k3s" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[var.availability_domain_index].name
  display_name        = "assetcare-k3s"
  shape               = "VM.Standard.A1.Flex"
  shape_config {
    ocpus         = var.ocpus     # free: up to 4 in total across your A1 instances
    memory_in_gbs = var.memory_gb # free: up to 24 in total
  }
  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu_arm.images[0].id
    boot_volume_size_in_gbs = var.boot_volume_gb # free: 200 GB total block storage
  }
  create_vnic_details {
    subnet_id        = oci_core_subnet.public.id
    assign_public_ip = true # ephemeral public IP: free. A reserved IP is also free (one per tenancy).
    hostname_label   = "k3s"
  }
  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
  }
  # COST: none with the values above. Adding a load balancer beyond the free flexible 10 Mbps one, or block storage
  # beyond 200 GB, or a second A1 instance beyond the free quota, would cost money.
}

output "public_ip" { value = oci_core_instance.k3s.public_ip }
output "ssh" { value = "ssh ubuntu@${oci_core_instance.k3s.public_ip}" }
