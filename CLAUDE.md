# TrailNest — Project Context

DevOps-capstone reference project: a small property-listings app (Next.js + Express +
MySQL) used as a safe, fictional-data sandbox to prove out Docker, Terraform, and CI/CD
practices before they'd ever be considered for a real system. This repo is separate from
and unrelated in content to the main MyTripStays app — only the deployment *practices*
carry over.

## Stack

- Frontend: Next.js (App Router), deployed as a standalone Docker image
- Backend: Node.js + Express, REST API
- Database: MySQL 8.0 (raw `mysql2`, no ORM)
- Containerization: Docker Compose (`docker-compose.yml` + overlay files)
- Infrastructure: Terraform (`terraform/`) — see below
- CI/CD: GitHub Actions (`.github/workflows/deploy.yml`)

## Deployment history

1. **Phase 1–3 (Docker + manual EC2):** containerized locally, deployed by hand to a
   single Ubuntu EC2 instance (`docker-compose.yml`). An nginx+HTTPS overlay
   (`docker-compose.prod.yml`) exists but was **never adopted** — the user explicitly
   chose to stop at plain HTTP for that phase. Full detail: `docs/DOCKER_GUIDE.md`.
2. **Phase 4–6 (Terraform + GitHub Actions capstone):** the assignment's actual
   reference architecture — VPC, ALB, Auto Scaling Group, Multi-AZ RDS — replacing the
   single instance. This is the current, active deployment target.

## Current live infrastructure (Terraform-managed)

- **AWS account** `312850677976` (IAM user `Dhotre`), region **ap-south-1**.
- **Terraform runs from an EC2 box, not a laptop** — the *original* Phase-3 instance
  (`i-015027ae63346a94b`, tag `Trialnest`, key pair `trialnest`) was repurposed as the
  Terraform runner via an attached IAM instance role (`trailnest-terraform-runner` —
  broad managed policies incl. `IAMFullAccess`, a deliberate simplification for a
  personal account, not least-privilege). That box does **not** run the app itself
  anymore; it just issues Terraform's AWS API calls.
- The **actual app** runs on separate EC2 instances inside a new VPC that Terraform
  creates (`terraform/vpc.tf` etc.) — an Auto Scaling Group of 2 `t3.small` instances,
  **no SSH at all** (access via `aws ssm start-session` only), behind an ALB doing
  path-based routing (`/api/*`, `/uploads/*` → backend:4000; else → frontend:3000 —
  this replaces the nginx job from the abandoned Phase-3 overlay). Data sits in
  Multi-AZ RDS MySQL, private, not publicly accessible.
- **Route 53 is intentionally not used** — no domain owned; the ALB's own AWS-generated
  DNS name is the public address.
- Full resource list, cost breakdown, and the workflow (`init`/`plan`/`apply`/`destroy`)
  are documented in `terraform/README.md` — read that before touching `terraform/`.
- **Always `terraform destroy` after a working session** and verify via the AWS CLI
  that nothing lingers — this stack costs ~$100/mo if left running continuously (NAT
  Gateway, ALB, Multi-AZ RDS are all hourly-billed) vs under $1 for a few hours' demo.

## Known issues / gaps (as of 2026-09-14)

1. **AI features ("Polish with AI", "AI Form Helper") don't work on this architecture.**
   `terraform/terraform.tfvars` has no real `gemini_api_key` set — it defaults to an
   empty string, so the SSM parameter `/trailnest/gemini_key` holds the literal string
   `"unset"`, the boot script correctly turns that into a blank `GEMINI_API_KEY`, and
   the backend's AI endpoints are doing exactly what they're designed to do with no
   key: degrading gracefully to "temporarily unavailable." **Not a bug — never
   configured.** To fix: add `gemini_api_key = "<real key>"` to
   `terraform/terraform.tfvars`, `terraform apply` (updates the SSM value), **then**
   explicitly run `aws autoscaling start-instance-refresh --auto-scaling-group-name
   trailnest-asg ...` — changing an SSM parameter's value does **not** by itself change
   the launch template's rendered content, so already-running instances won't pick up
   the new key without a fresh boot.
2. **CloudWatch log group exists but nothing ships logs to it.** `terraform/logs.tf`
   creates `/trailnest/containers` and the app IAM role can write to it, but no Docker
   `awslogs` logging driver (or CloudWatch agent) was ever wired into
   `docker-compose.rds.yml`/`docker-compose.images.yml`. The log group is empty. Real
   logs today: SSM into an instance, then `docker compose -f docker-compose.yml -f
   docker-compose.rds.yml -f docker-compose.images.yml logs`.
3. **`backend_uploads` (property photos) is a per-instance Docker volume** — with 2 ASG
   instances, uploaded photos aren't shared between them. Would need S3 + a small code
   change to fix properly; not done.

## Five real bugs found and fixed while bringing the Terraform architecture up

(Each found from primary evidence — SSM sessions, EC2 console output, ALB target-health
reasons — not guessed. Full write-up in `TrailNest_Infrastructure_Report.docx`.)

1. EC2 security group `description` fields only allow a narrow ASCII charset — `->`
   arrows and an em-dash were rejected outright.
2. The plain Ubuntu 24.04 AMI has **no AWS CLI**. The boot script's first real command
   (`aws ssm get-parameter`) died instantly, so nothing after it — git clone, RDS load,
   `docker compose up` — ever ran, on every instance identically.
3. ASG `health_check_grace_period` was 180s; real boot time (Docker + AWS CLI install +
   2 image pulls + RDS load) runs 4–6 minutes. Raised to 420s.
4. `instance_refresh`'s own `instance_warmup` (captured at refresh start, not read
   live) was missed when the grace period above was fixed — brought into agreement.
5. **The deep one:** `db/seed.sql` uses plain `INSERT INTO`, not idempotent. The first
   instance to ever boot successfully seeded RDS; every instance after that —
   replacement, scale-out, redeploy — ran the same seed file against the
   already-seeded database and died on `owners.email`'s unique-constraint violation
   before `docker compose up` ever ran. Fixed by checking `information_schema.tables`
   for the `owners` table before loading schema/seed at all — mirrors the "only on an
   empty volume" behavior Docker's `docker-entrypoint-initdb.d` gave for free locally,
   which RDS has no equivalent of.

## CI/CD pipeline (`.github/workflows/deploy.yml`)

- **`build-and-push`**: builds both Docker images, tags `:latest` + commit SHA, pushes
  to Docker Hub (account: `dhotreharsh` — must match `terraform/variables.tf`'s
  `dockerhub_username` default exactly, or instances 404 pulling).
- **`deploy`**: `aws autoscaling start-instance-refresh` on `trailnest-asg` — no SSH,
  no fixed IP; the ASG has neither. Polls until the refresh reports Successful/Failed.
- Required GitHub secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`,
  `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. Required variables: `AWS_REGION`
  (`ap-south-1`), `ASG_NAME` (`trailnest-asg`), `NEXT_PUBLIC_API_URL` (the ALB's DNS
  name + `/api` — this is baked into the frontend at **build** time, so it must be
  correct *before* a push, not fixed after; get it from `terraform output alb_dns_name`
  and update the GitHub variable any time the ALB changes).
- Proven working end to end twice: once fixing a placeholder URL, once shipping the
  UI/UX redesign below.

## UI/UX

- "Trailhead Signage" redesign (commit `3d9e241`) replaced the original
  cream/soft-terracotta/soft-sage palette — deliberately, because it landed close to a
  generic "AI-generated design" default. New tokens live in `frontend/styles/tokens.css`
  (same variable *names*, new values — every page already consumed tokens correctly,
  confirmed by checking every `.module.css` file before changing anything). Body font
  is now Public Sans (paired with Fraunces), footer is a deliberate dark-forest band
  (the one place safe for a bold dark surface — no buttons there to lose contrast).

## Reference docs in this repo

- `terraform/README.md` — the Terraform setup in detail
- `docs/DOCKER_GUIDE.md` — the original Docker containerization walkthrough
- `docs/AI_INTEGRATION.md` — the AI feature build notes (Phase 3-era, predates the
  Terraform architecture's SSM-based key handling above)
- `TrailNest_Infrastructure_Report.docx` (on the Desktop, not in the repo) —
  manager-presentable report covering all of the above with diagrams and screenshots
