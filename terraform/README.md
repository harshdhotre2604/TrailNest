# TrailNest — Terraform (Infrastructure as Code)

Provisions a **separate, disposable** EC2 instance + security group + Elastic IP for
TrailNest — deliberately not the real, already-running instance from the manual
Phase 3 deploy. The point of this exercise is to prove the full
create → verify → destroy lifecycle, including `terraform destroy`, which isn't
something you want to run against a box that's actually serving traffic.

## What it creates

| Resource | Purpose |
|---|---|
| `data.aws_ami.ubuntu` | looks up the latest Ubuntu 24.04 AMI at apply-time (not hardcoded — AMI ids go stale) |
| `aws_security_group.trailnest` | SSH (your IP only) + ports 3000/4000 |
| `aws_instance.trailnest` | `t3.small`, 20 GB root disk (the exact fix for the disk-space issue hit during the manual deploy) |
| `aws_eip.trailnest` | a fixed public IP, so it survives stop/start |

## One-time setup

1. **AWS credentials**, if not already configured: `aws configure` (or SSO). Terraform
   uses whatever the AWS CLI is configured with.
2. **An EC2 key pair** in the region you're deploying to (`var.aws_region`) — reuse
   an existing one, or create a new one in that region.
3. `cp terraform.tfvars.example terraform.tfvars` and fill in `key_name` and
   `my_ip_cidr` (get your IP from https://checkip.amazonaws.com).

## Workflow

```bash
terraform init      # downloads the AWS provider plugin
terraform plan       # dry run — review exactly what will be created, nothing changes yet
terraform apply       # type "yes" — actually creates it
```

Grab `instance_public_ip` (or the ready-made `ssh_command` output) and SSH in. From
there, the deployment is identical to the manual Phase 3 steps: clone the repo, write
`.env`, `docker compose build`, `docker compose up -d`, verify in the browser.

When you're done proving it out:

```bash
terraform destroy   # type "yes" — deletes the instance, security group, and EIP
```

## Files

- `main.tf` — provider + resources
- `variables.tf` — inputs (region, key pair, your IP, instance size, disk size)
- `outputs.tf` — the instance's public IP and a ready-to-paste SSH command
- `terraform.tfvars.example` — template; copy to `terraform.tfvars` (gitignored) with real values

`terraform.tfstate`, `.terraform/`, and `terraform.tfvars` are gitignored — the state
file can contain resource details you don't want in git, and `.terraform/` is just a
local plugin cache. `.terraform.lock.hcl` **is** committed, so the exact provider
version is pinned for anyone else who runs this.
