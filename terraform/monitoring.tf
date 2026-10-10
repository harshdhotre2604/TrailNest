# The monitoring box: one private instance running monitoring/docker-compose.yml
# (Prometheus, Alertmanager, Grafana, Blackbox, YACE). No inbound ports at all —
# Grafana is reached with `aws ssm start-session` port forwarding, the same way
# the app instances are reached without SSH.

# Deliberately narrow, like the app role: discover instances, read CloudWatch,
# read its own two secrets. No write access to anything.
resource "aws_iam_role" "monitoring" {
  name               = "trailnest-monitoring-role"
  assume_role_policy = data.aws_iam_policy_document.app_assume.json # same "EC2 may assume" trust
  tags               = { Project = "trailnest" }
}

data "aws_iam_policy_document" "monitoring_permissions" {
  statement {
    sid       = "PrometheusEc2Discovery"
    actions   = ["ec2:DescribeInstances", "ec2:DescribeAvailabilityZones"]
    resources = ["*"] # Describe* calls can't be scoped to resources
  }
  statement {
    sid = "YaceReadCloudWatch"
    actions = [
      "cloudwatch:GetMetricData",
      "cloudwatch:GetMetricStatistics",
      "cloudwatch:ListMetrics",
      "tag:GetResources",
      "iam:ListAccountAliases",
    ]
    resources = ["*"]
  }
  statement {
    sid     = "ReadMonitoringSecretsOnly"
    actions = ["ssm:GetParameter"]
    resources = [
      aws_ssm_parameter.slack_webhook.arn,
      aws_ssm_parameter.grafana_admin_password.arn,
    ]
  }
}

resource "aws_iam_role_policy" "monitoring" {
  name   = "trailnest-monitoring-policy"
  role   = aws_iam_role.monitoring.id
  policy = data.aws_iam_policy_document.monitoring_permissions.json
}

# Session Manager shell + port forwarding, and the target for the GitHub
# Actions reload job's `aws ssm send-command`.
resource "aws_iam_role_policy_attachment" "monitoring_ssm_core" {
  role       = aws_iam_role.monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "monitoring" {
  name = "trailnest-monitoring-profile"
  role = aws_iam_role.monitoring.name
}

resource "aws_instance" "monitoring" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.monitoring_instance_type
  subnet_id              = aws_subnet.private_a.id
  vpc_security_group_ids = [aws_security_group.monitoring.id]
  iam_instance_profile   = aws_iam_instance_profile.monitoring.name

  # Prometheus (ec2_sd) and YACE call AWS APIs from inside containers, one
  # network hop further from the metadata service than the host. With the
  # default hop limit of 1 they can't fetch the role's credentials.
  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  user_data = templatefile("${path.module}/templates/monitoring_user_data.sh.tftpl", {
    aws_region   = var.aws_region
    alb_dns_name = aws_lb.trailnest.dns_name
  })
  user_data_replace_on_change = true

  # The box reads both secrets at boot, so they must exist first.
  depends_on = [
    aws_ssm_parameter.slack_webhook,
    aws_ssm_parameter.grafana_admin_password,
  ]

  tags = { Name = "trailnest-monitoring", Project = "trailnest" }
}
