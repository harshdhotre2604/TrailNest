variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "ap-south-1"
}

variable "app_instance_type" {
  description = "EC2 instance type for the app (ASG) instances. t3.small minimum — smaller types OOM during `docker compose build`."
  type        = string
  default     = "t3.small"
}

variable "root_volume_size" {
  description = "Root EBS volume size (GB) for app instances."
  type        = number
  default     = 20
}

variable "asg_desired_capacity" {
  description = "How many app instances to run — one per AZ by default."
  type        = number
  default     = 2
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  type    = string
  default = "trailnest_dev"
}

variable "db_username" {
  type    = string
  default = "trailnest"
}

variable "dockerhub_username" {
  description = "Docker Hub account the images live at: <username>/trailnest-backend, <username>/trailnest-frontend. Must match the same account GitHub Actions pushes to."
  type        = string
  default     = "harshdhotre2604"
}

variable "gemini_api_key" {
  description = "Optional — Google Gemini API key for the AI features. Leave blank to run without them."
  type        = string
  default     = ""
  sensitive   = true
}
