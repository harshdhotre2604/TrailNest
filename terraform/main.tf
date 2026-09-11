terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# The most recent Ubuntu 24.04 AMI, looked up at apply-time instead of
# hardcoded — AMI ids are region-specific and Canonical publishes a new one
# every few weeks, so a hardcoded id would just go stale.
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_security_group" "trailnest" {
  name        = "trailnest-terraform-sg"
  description = "TrailNest (Terraform-managed) - SSH + app ports"

  ingress {
    description = "SSH from my IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
  }

  ingress {
    description = "Frontend"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Backend API"
    from_port   = 4000
    to_port     = 4000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Project = "trailnest"
    Managed = "terraform"
  }
}

resource "aws_instance" "trailnest" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.trailnest.id]

  # Learned this the hard way in the manual Phase 3 deploy: the default 8GB
  # root disk isn't enough to `docker compose build` both images. 20GB from
  # day one so this exercise never hits that failure.
  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name    = "trailnest-terraform"
    Project = "trailnest"
    Managed = "terraform"
  }
}

resource "aws_eip" "trailnest" {
  instance = aws_instance.trailnest.id
  domain   = "vpc"

  tags = {
    Name    = "trailnest-terraform-eip"
    Project = "trailnest"
  }
}
