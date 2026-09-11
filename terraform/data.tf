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

# Two AZs, looked up dynamically rather than hardcoded — not every account
# has the same AZs enabled/ordered in every region.
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}
