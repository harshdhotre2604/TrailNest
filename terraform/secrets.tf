# Terraform generates the DB password and JWT secret itself — nobody has to
# invent or remember one, and it's never typed into terraform.tfvars. The
# Gemini key is a real external credential you already own, so that one
# still comes in as a variable.

resource "random_password" "db_password" {
  length  = 32
  special = false # keeps the mysql client / connection strings simple
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/trailnest/db_password"
  type  = "SecureString"
  value = random_password.db_password.result
  tags  = { Project = "trailnest" }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/trailnest/jwt_secret"
  type  = "SecureString"
  value = random_password.jwt_secret.result
  tags  = { Project = "trailnest" }
}

resource "aws_ssm_parameter" "gemini_api_key" {
  name  = "/trailnest/gemini_key"
  type  = "SecureString"
  value = var.gemini_api_key != "" ? var.gemini_api_key : "unset"
  tags  = { Project = "trailnest" }
}
