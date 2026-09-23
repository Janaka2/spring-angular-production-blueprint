variable "region" {
  type    = string
  default = "eu-zurich-1"
}

variable "compartment_ocid" {
  type = string
}

variable "availability_domain_index" {
  type        = number
  default     = 0
  description = "Try 0, 1, 2 when a domain has no A1 capacity"
}

variable "ocpus" {
  type    = number
  default = 4
}

variable "memory_gb" {
  type    = number
  default = 24
}

variable "boot_volume_gb" {
  type    = number
  default = 100
}

variable "ssh_public_key_path" {
  type    = string
  default = "~/.ssh/id_ed25519.pub"
}

variable "ssh_allowed_cidr" {
  type        = string
  default     = "0.0.0.0/0"
  description = "Restrict SSH to your IP: 203.0.113.4/32"
}
