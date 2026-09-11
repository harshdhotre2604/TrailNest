# TrailNest — Terraform (reference architecture)

Provisions the full assignment reference architecture: a VPC across 2 AZs,
public/private/secure subnet tiers, one NAT Gateway, an Application Load
Balancer doing path-based routing, an Auto Scaling Group of app instances,
a Multi-AZ RDS MySQL database, and a CloudWatch log group. Route 53 is
intentionally skipped — the app is reached at the ALB's own AWS DNS name.

Full design rationale, diagram, and phased plan:
https://claude.ai/code/artifact/80eff783-9bcc-4f18-91a9-7bd6378a9e95

## What it creates (15 resources — see the plan link above for the why on each)

VPC, 6 subnets, Internet Gateway, 1 NAT Gateway + EIP, 3 route tables,
3 security groups (ALB / app / RDS, each open only to the tier in front of
it), a DB subnet group, a Multi-AZ RDS instance, 3 SSM SecureString
parameters (DB password, JWT secret, Gemini key — Terraform generates the
first two itself via `random_password`), a narrowly-scoped IAM role for the
app instances (can read only those 3 parameters, nothing else), a Launch
Template whose boot script turns a bare Ubuntu instance into a working
TrailNest node with zero manual steps, 2 target groups + the ALB + listener
rules, and an Auto Scaling Group.

**No SSH on the app instances at all.** They sit in a private subnet with
no route to the internet inbound; if you ever need a shell,
`aws ssm start-session --target <instance-id>` gets you in over AWS's own
private channel instead.

**Instances pull images, they don't build them.** The boot script clones
the repo (for the compose files and `db/*.sql`) but runs
`docker compose -f docker-compose.yml -f docker-compose.rds.yml -f docker-compose.images.yml pull/up`
— `docker-compose.images.yml` (repo root) swaps `build:` for `image:
<dockerhub-username>/trailnest-{backend,frontend}:latest`. Building on a
t3.small on every boot/scale-out is the exact risk the original disk-space
incident demonstrated; `.github/workflows/deploy.yml` builds once, on
GitHub's runner, and pushes the result.

**Bootstrap order for a first `apply`:** the images must already exist in
Docker Hub before any instance boots, or its first `pull` fails. Either
push to `main` once (so the workflow builds+pushes) before running
`terraform apply` for the first time, or `docker build`/`push` by hand once.

## One-time setup

Nothing — every variable has a default. Optionally set `gemini_api_key` in
`terraform.tfvars` if you want the AI features working on this architecture.

## Workflow

Run from the EC2 instance with the `trailnest-terraform-runner` IAM role
attached (or from anywhere else with equivalent AWS credentials):

```bash
terraform init
terraform plan       # dry run — review before anything is created
terraform apply       # type "yes"
```

Wait for both ASG instances to show healthy in both target groups (a few
minutes — the boot script installs Docker, clones the repo, loads the
schema into RDS, and builds two images), then open the `alb_dns_name`
output in a browser.

```bash
terraform destroy   # type "yes" — tears down all 15 resources
```

## Files

| File | Contents |
|---|---|
| `versions.tf` | provider + required versions |
| `data.tf` | AMI lookup, AZ lookup, caller identity |
| `vpc.tf` | VPC, subnets, IGW, NAT, route tables |
| `security_groups.tf` | ALB / app / RDS security groups |
| `secrets.tf` | generated passwords + SSM SecureString parameters |
| `iam.tf` | the app instances' narrowly-scoped IAM role |
| `rds.tf` | DB subnet group + Multi-AZ RDS instance |
| `alb.tf` | target groups, ALB, listener, path-based routing rule |
| `compute.tf` | Launch Template (+ boot script) and Auto Scaling Group |
| `logs.tf` | CloudWatch log group |
| `templates/user_data.sh.tftpl` | the boot script every app instance runs |
| `variables.tf` / `outputs.tf` | inputs (all have defaults) / outputs |

`terraform.tfstate`, `.terraform/`, and `terraform.tfvars` are gitignored.
`.terraform.lock.hcl` **is** committed, pinning the exact provider versions.
