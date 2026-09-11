output "alb_dns_name" {
  description = "Open this in a browser — the whole app is reachable here"
  value       = "http://${aws_lb.trailnest.dns_name}"
}

output "rds_endpoint" {
  description = "RDS hostname (no port) — not internet-reachable, only from inside the VPC"
  value       = aws_db_instance.trailnest.address
}

output "asg_name" {
  description = "Auto Scaling Group name — used by the GitHub Actions instance-refresh deploy step"
  value       = aws_autoscaling_group.trailnest.name
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.trailnest.name
}

output "db_password" {
  description = "Generated DB password — also stored in SSM at /trailnest/db_password"
  value       = random_password.db_password.result
  sensitive   = true
}
