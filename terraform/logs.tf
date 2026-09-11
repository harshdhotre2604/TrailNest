resource "aws_cloudwatch_log_group" "trailnest" {
  name              = "/trailnest/containers"
  retention_in_days = 7 # short retention — this is a demo, not production

  tags = { Project = "trailnest" }
}
