# The APP instances' role — deliberately narrow, unlike the
# trailnest-terraform-runner role on the Terraform box. This one can only
# read these three specific parameters and write to one specific log group.

data "aws_iam_policy_document" "app_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app" {
  name               = "trailnest-app-role"
  assume_role_policy = data.aws_iam_policy_document.app_assume.json
  tags               = { Project = "trailnest" }
}

data "aws_iam_policy_document" "app_permissions" {
  statement {
    sid     = "ReadOwnSecretsOnly"
    actions = ["ssm:GetParameter"]
    resources = [
      aws_ssm_parameter.db_password.arn,
      aws_ssm_parameter.jwt_secret.arn,
      aws_ssm_parameter.gemini_api_key.arn,
    ]
  }
  statement {
    sid = "ShipContainerLogs"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams",
    ]
    resources = ["${aws_cloudwatch_log_group.trailnest.arn}:*"]
  }
}

resource "aws_iam_role_policy" "app" {
  name   = "trailnest-app-policy"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.app_permissions.json
}

# Lets `aws ssm start-session --target <instance-id>` open a shell — the
# replacement for SSH, since these instances have no inbound port 22 at all.
resource "aws_iam_role_policy_attachment" "app_ssm_core" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "app" {
  name = "trailnest-app-profile"
  role = aws_iam_role.app.name
}
