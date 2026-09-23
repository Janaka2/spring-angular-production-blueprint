variable "server_type" {
  type        = string
  default     = "cx33"
  description = "cx33: 4 vCPU, 8 GB, 80 GB. cx43 (16 GB) if the observability profile runs on the same server"
}

variable "location" {
  type        = string
  default     = "nbg1"
  description = "nbg1 (Nuremberg), fsn1 (Falkenstein) or hel1 (Helsinki); try another when the type is unavailable"
}

variable "backups" {
  type        = bool
  default     = true
  description = "Hetzner's nightly whole-server snapshots, seven kept; costs 20 % of the server price"
}

variable "ssh_public_key_path" {
  type    = string
  default = "~/.ssh/assetcare.pub"
}

variable "ssh_allowed_cidrs" {
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
  description = "Restrict SSH to your IP: [\"203.0.113.4/32\"]"
}
