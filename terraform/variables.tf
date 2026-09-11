variable "aws_region" {
  description = "AWS region to deploy into. Must match the region your key pair (var.key_name) was created in — EC2 key pairs are region-scoped."
  type        = string
  default     = "ap-south-1"
}

variable "key_name" {
  description = "Name of an existing EC2 key pair in the target region (no default — you must set this)."
  type        = string
}

variable "my_ip_cidr" {
  description = "Your workstation's public IP, as a /32 CIDR (e.g. \"203.0.113.10/32\"), allowed to SSH in. Find yours at https://checkip.amazonaws.com — no default, you must set this."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type. t3.small (2GB RAM) minimum — smaller types OOM during `docker compose build`."
  type        = string
  default     = "t3.small"
}

variable "root_volume_size" {
  description = "Root EBS volume size in GB."
  type        = number
  default     = 20
}
