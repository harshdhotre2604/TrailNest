# TrailNest Observability — Resume Here

Prometheus + Grafana + Alertmanager → Slack on TrailNest's ALB → ASG → RDS stack,
with GitHub Actions instead of ArgoCD. Modelled on the "End-to-End Kubernetes
Three-Tier DevSecOps" course project, kept on our own (non-Kubernetes) architecture.

- **Full guide with diagrams & explanations:** https://claude.ai/artifact/5EpZ1LYWrWDUNH7TMEt6Mc
- **Branch:** `feature/observability` (local only, **not pushed yet**)
- **Last updated:** 2026-10-12
- **Resuming with Claude?** Say: *"read OBSERVABILITY_HANDOFF.md and continue from the first unchecked step"*.

---

## Where you are

| Phase | What | Status |
|---|---|---|
| 0 | Slack app + webhook, `#trailnest-alerts`, test message | ✅ Done |
| 1 | Backend `/metrics` (prom-client) + `npm test` | ✅ Done, verified in Docker |
| 2 | `monitoring/` stack running locally | ✅ Built & running — ⏳ **Slack drill + dashboards still to do** |
| 3 | node_exporter + cAdvisor on app instances | ✅ Code done (AWS-only, tested in Phase 5) |
| 4 | Terraform monitoring tier | ✅ Code done, `terraform validate` passes |
| 7 | GitHub Actions: checks / reload-monitoring / notify | ✅ Code done, actionlint passes |
| 8 | Container logs → CloudWatch (awslogs) | ✅ Code done |
| 5 | Rebuild AWS from zero + verify | ⏳ To do (costs money hourly) |
| 6 | Alert drills (screenshots for report) | ⏳ To do |
| 9 | `terraform destroy` + verify nothing left | ⏳ To do |

Commits on the branch:
```
d44a4a4 Pin boot scripts to LF line endings
6f39b19 Add monitoring tier: exporters, Terraform, CI checks, Slack notify, awslogs
c61f715 Add Prometheus/Alertmanager/Grafana monitoring stack
06c68d0 Expose Prometheus metrics from the backend
```

---

## Step 1 — Local Slack drill ⏳ START HERE

Last time no Slack message arrived for two reasons: the webhook file was **empty**
(`$env:SLACK_WEBHOOK` only exists in the PowerShell window where you set it), and the
backend was restarted **immediately** — SiteDown needs 2 full minutes of failure
before it fires.

All in **one** PowerShell window:
```powershell
cd "C:\Users\Vinod\Desktop\tripstars-demo\Docker Project\trailnest"
docker compose ps                                   # app running? if not: docker compose up -d
docker compose -f monitoring/docker-compose.yml ps  # monitoring running? if not: see "Restart local stack" below

$env:SLACK_WEBHOOK = "https://hooks.slack.com/services/...your URL..."
Set-Content monitoring/alertmanager/secrets/slack_webhook $env:SLACK_WEBHOOK -NoNewline
(Get-Item monitoring/alertmanager/secrets/slack_webhook).Length   # must be ~80, NOT 0
docker compose -f monitoring/docker-compose.yml restart alertmanager
```

Quick test (instant):
```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:9093/api/v2/alerts -ContentType 'application/json' -Body '[{"labels":{"alertname":"PipelineTest","severity":"warning"},"annotations":{"summary":"Test alert","description":"Alertmanager to Slack works"}}]'
```
→ Slack gets `[FIRING] PipelineTest` within ~30s.

Real drill:
```powershell
docker compose stop backend
# WAIT ~3 minutes. Watch http://localhost:9090/alerts : PENDING -> FIRING
# Slack: [FIRING] SiteDown
docker compose start backend
# within ~5 min Slack: [RESOLVED] SiteDown
```

- [ ] Webhook file length > 0
- [ ] `[FIRING] PipelineTest` arrived in Slack
- [ ] `[FIRING] SiteDown` arrived, then `[RESOLVED] SiteDown`
- [ ] Screenshots saved (Slack messages + `localhost:9090/alerts` showing FIRING)

**Restart local stack** (if the PC was rebooted):
```powershell
docker compose up -d                                   # the app
docker compose -f monitoring/docker-compose.yml up -d  # monitoring (monitoring/.env already selects prometheus.local.yml)
```
Local URLs: Prometheus http://localhost:9090 · Alertmanager http://localhost:9093 ·
Grafana http://localhost:3001 (admin / admin) · App http://localhost:3000

---

## Step 2 — Grafana dashboards (local) ⏳

1. http://localhost:3001 → **Dashboards → New → Import** → enter ID → pick *Prometheus* → Import:
   - `11159` NodeJS Application Dashboard
   - `7587` Prometheus Blackbox Exporter
   - (`1860` Node Exporter Full and `14282` cAdvisor only show data on AWS — import them there)
2. **New dashboard → "TrailNest Golden Signals"**, one time-series panel per query:
   ```promql
   # Traffic (req/s)
   sum(rate(http_request_duration_seconds_count[5m]))
   # Errors (% 5xx)
   100 * sum(rate(http_request_duration_seconds_count{status=~"5.."}[5m])) / sum(rate(http_request_duration_seconds_count[5m]))
   # Latency (p95 per route)
   histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_seconds_bucket{route!="unmatched"}[5m])))
   ```
   On AWS, add a 4th (Saturation):
   `100 * (1 - avg by (instance_id) (rate(node_cpu_seconds_total{mode="idle"}[5m])))`
3. Save → **Share → Export → Save to file** ("Export for sharing externally" **OFF**)
   → move the JSON into `monitoring/grafana/dashboards/`
4. Commit:
   ```powershell
   git add monitoring/grafana/dashboards
   git commit -m "Add Golden Signals dashboard"
   ```
   (Grafana auto-loads that folder on every boot, so dashboards survive `terraform destroy`.)

- [ ] Golden Signals dashboard exported and committed

---

## Step 3 — Push branch & check CI on a PR (free) ⏳

Pull requests run **only** the `checks` job (npm test, promtool, amtool, Trivy) —
nothing deploys.

⚠️ First: delete `WeebhookSlack.png` if it shows the webhook URL. None of the
screenshots are staged, but don't `git add .`.

```powershell
git status          # only screenshots should be untracked; no .env / secrets / tfvars
git push -u origin feature/observability
```
Then on GitHub → **Compare & pull request** → base `main`.

- [ ] `checks` job green; `build-and-push` / `deploy` / `notify` show *skipped*
- [ ] Read the Trivy report in the job log (report-only, won't fail the build)

---

## Step 4 — GitHub settings (one time) ⏳

Repo → **Settings → Secrets and variables → Actions**:

- [ ] New **secret** `SLACK_WEBHOOK_URL` = your webhook URL
- [ ] Still present — secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- [ ] Still present — variables: `AWS_REGION` = `ap-south-1`, `ASG_NAME` = `trailnest-asg`, `NEXT_PUBLIC_API_URL`
- [ ] IAM user `Dhotre` can call `ssm:SendCommand` (needed by the `reload-monitoring` job)

---

## Step 5 — AWS session: rebuild from zero ⏳ (billed hourly — plan 3–4 h in one sitting)

**Before starting:**
- [ ] Session Manager plugin installed (`session-manager-plugin --version` works)
- [ ] `aws sts get-caller-identity` → account `312850677976`
- [ ] Decide where Terraform runs:
  - Old runner box: `aws ec2 describe-instances --instance-ids i-015027ae63346a94b --query "Reservations[0].Instances[0].State.Name"` (start it if `stopped`)
  - or laptop: `winget install Hashicorp.Terraform` (`.gitattributes` keeps the boot scripts LF, so Windows is safe now)

**5a. Webhook into tfvars** (gitignored — never committed):
```powershell
Add-Content terraform/terraform.tfvars "slack_webhook_url = `"$env:SLACK_WEBHOOK`""
```

**5b. Merge the PR into `main`.** The pipeline runs: `build-and-push` publishes the
images (backend now has `/metrics`). `deploy` will **fail** — no ASG exists yet.
That's expected. `reload-monitoring` may also fail (no monitoring box yet). Slack
gets a pipeline message either way.

**5c. Apply** (~15 min, Multi-AZ RDS is the slow part):
```powershell
git switch main; git pull
cd terraform
terraform init
terraform plan       # check the monitoring resources are in the "to add" list
terraform apply      # type yes
terraform output alb_dns_name
```

**5d.** GitHub → variable `NEXT_PUBLIC_API_URL` = `http://<alb dns name>/api` →
Actions → latest run → **Re-run all jobs** (rebuilds the frontend with the right
URL; instance refresh now succeeds). Wait for green + Slack message.

**5e. Tunnels** — stop the local monitoring stack first (same ports):
```powershell
docker compose -f ..\monitoring\docker-compose.yml down

$MON = terraform output -raw monitoring_instance_id
# window 1 — Grafana
aws ssm start-session --target $MON --document-name AWS-StartPortForwardingSession --parameters "portNumber=3001,localPortNumber=3001"
# window 2 — Prometheus
aws ssm start-session --target $MON --document-name AWS-StartPortForwardingSession --parameters "portNumber=9090,localPortNumber=9090"
# Grafana password (user: admin)
terraform output -raw grafana_admin_password
```
(If Terraform ran on the runner box, run the `terraform output` commands there and
paste the instance ID into `$MON` on the laptop.)

**5f. Verify:**
- [ ] App loads at the ALB URL
- [ ] `http://<alb>/metrics` returns the **frontend's 404 page** (proves it's not public)
- [ ] http://localhost:9090/targets — all UP: node ×2, cadvisor ×2, backend ×2, blackbox ×2, yace ×1, prometheus ×1
- [ ] After ~10 min, query `{__name__=~"aws_.*"}` returns RDS/ALB series. **If names differ from
      `aws_rds_cpuutilization_average` / `aws_rds_free_storage_space_average` /
      `aws_applicationelb_httpcode_elb_5xx_count_sum`, fix `monitoring/prometheus/alerts.yml`** and push
      (the `reload-monitoring` job applies it — no instance restart)
- [ ] Grafana: TrailNest folder has Golden Signals; import `1860` + `14282`
- [ ] CloudWatch → Log groups → `/trailnest/containers` has streams
- [ ] Synthetic alert reaches Slack (open a 9093 tunnel, then the `PipelineTest` command from Step 1)

**If something's missing — read evidence, don't guess:**
```powershell
aws ssm start-session --target $MON
sudo tail -100 /var/log/monitoring-boot.log
cd /opt/trailnest/monitoring && sudo docker compose ps && sudo docker compose logs --tail 50 prometheus yace alertmanager
```
| Symptom | Likely cause |
|---|---|
| Target DOWN, "context deadline exceeded" | security group (app SG must allow 4000/9100/8080 from monitoring SG) |
| YACE / Prometheus EC2 SD: "no credentials" / IMDS errors | metadata hop limit (must be 2 on the monitoring instance) |
| YACE container restarting, "unknown flag" | flags changed between versions — `docker run --rm quay.io/prometheuscommunity/yet-another-cloudwatch-exporter:v0.61.2 --help` |
| No Slack on AWS | `/opt/trailnest/monitoring/alertmanager/secrets/slack_webhook` empty → SSM param / tfvars |
| App instance boot: `set: pipefail\r` | CRLF line endings — `.gitattributes` should prevent this |

---

## Step 6 — Alert drills (screenshot every Slack message) ⏳

Shell on an app instance: `aws ssm start-session --target <app-instance-id>`, then `sudo docker ps`.

| Drill | Do | Expect | Undo |
|---|---|---|---|
| Backend crash | `sudo docker stop trailnest-backend-1` | ALB marks it unhealthy ~45s, ASG **replaces the instance** (health check type ELB). BackendDown may fire then resolve. **No SiteDown** (other AZ serves). | Nothing — self-heals |
| Disk full | `df -h /` then `sudo fallocate -l <N>G /var/tmp/fill` (leave <15% free) | **HostLowDisk** after 5 min | `sudo rm /var/tmp/fill` |
| CPU | `sudo apt-get install -y stress-ng && stress-ng --cpu 2 --timeout 15m` | **HostHighCpu** after 10 min | ends by itself |
| Site down | `aws autoscaling update-auto-scaling-group --auto-scaling-group-name trailnest-asg --min-size 0 --desired-capacity 0` | **SiteDown** ×2 in ~2–3 min; warnings suppressed | `... --min-size 1 --desired-capacity 2` → no false ExporterDown during boot → RESOLVED |
| Self-healing / discovery | `aws autoscaling terminate-instance-in-auto-scaling-group --instance-id <id> --no-should-decrement-desired-capacity` | **No alert**; old target vanishes, new one appears in `/targets` | nothing |
| Deploy notice | push any commit to `main` | Slack pipeline message | nothing |

For the report, record per drill: fault injected at / alert fired at / resolved at /
why that delay is correct for that rule.

- [ ] All 6 drills done + screenshots

---

## Step 7 — Teardown ⏳ (same day!)

- [ ] Export any new Grafana dashboards to `monitoring/grafana/dashboards/` and commit **first**
```powershell
cd terraform
terraform destroy
aws ec2 describe-instances --filters Name=tag:Project,Values=trailnest Name=instance-state-name,Values=running,pending,stopped --query "Reservations[].Instances[].InstanceId"
aws ec2 describe-nat-gateways --filter Name=state,Values=available,pending --query "NatGateways[].NatGatewayId"
aws elbv2 describe-load-balancers --query "LoadBalancers[?contains(LoadBalancerName,'trailnest')].LoadBalancerName"
aws rds describe-db-instances --query "DBInstances[?DBInstanceIdentifier=='trailnest-db'].DBInstanceStatus"
```
- [ ] All four print `[]`

---

## Reference: what lives where

| Path | What |
|---|---|
| `backend/src/app.js` | `/metrics` + `http_request_duration_seconds` histogram |
| `backend/test/metrics.test.js` | `npm test` — guards route-pattern labels (no DB needed) |
| `monitoring/docker-compose.yml` | Prometheus, Alertmanager, Grafana, Blackbox, YACE (`--profile aws`) |
| `monitoring/prometheus/prometheus.local.yml` | laptop: static targets via `host.docker.internal` |
| `monitoring/prometheus/prometheus.yml` | AWS: EC2 service discovery (`tag:Name=trailnest-app`) |
| `monitoring/prometheus/alerts.yml` | 12 alert rules |
| `monitoring/alertmanager/alertmanager.yml` | Slack routing, SiteDown inhibits warnings |
| `monitoring/yace/config.yml` | RDS + ALB CloudWatch metrics |
| `monitoring/.env`, `monitoring/alertmanager/secrets/` | **gitignored** — local config + webhook |
| `docker-compose.exporters.yml` | node_exporter + cAdvisor on every ASG instance |
| `docker-compose.images.yml` | now also ships container logs to CloudWatch |
| `terraform/monitoring.tf` | monitoring box: IAM role, instance (no inbound, IMDS hop limit 2) |
| `terraform/templates/monitoring_user_data.sh.tftpl` | monitoring box boot script |
| `terraform/security_groups.tf` | + monitoring SG; app SG allows 4000/9100/8080 from it only |
| `terraform/secrets.tf` | + SSM `/trailnest/slack_webhook`, `/trailnest/grafana_admin_password` |
| `.github/workflows/deploy.yml` | `checks` (also on PRs) → `build-and-push` → `deploy`; `reload-monitoring`; `notify` |
| `.gitattributes` | keeps `*.tftpl` / `*.sh` LF (Windows `core.autocrlf=true` would break boot scripts) |

## Not yet proven (only AWS can prove these)

- YACE metric names and CLI flags (`--config.file`, `--listen-address`)
- Containers getting instance-role credentials (IMDS hop limit 2)
- `reload-monitoring` when the monitoring box doesn't exist yet (first push to `main`)

## Later: carrying this to MyTripStays

Same building blocks, four differences — plan as its own reviewed change:
1. Nginx proxies everything → add `location = /metrics { deny all; }` (nginx change needs sign-off)
2. PM2 cluster mode → prom-client `AggregatorRegistry`, or each scrape hits a random worker
3. Single fixed EC2 → static targets; add an external uptime check (Prometheus on the same box can't alert that the box itself died)
4. Production DB untouched — any mysqld_exporter only with a dedicated read-only user, tested on local dev first
