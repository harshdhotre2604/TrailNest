# Three tiers, each only reachable from the one thing in front of it —
# nothing reaches the app instances except the ALB, nothing reaches RDS
# except the app instances.

resource "aws_security_group" "alb" {
  name        = "trailnest-alb-sg"
  description = "Public internet -> ALB, port 80 only"
  vpc_id      = aws_vpc.trailnest.id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "trailnest-alb-sg" }
}

resource "aws_security_group" "app" {
  name        = "trailnest-app-sg"
  description = "ALB -> app instances only. No SSH — see SSM Session Manager instead."
  vpc_id      = aws_vpc.trailnest.id

  ingress {
    description     = "Frontend, from the ALB only"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  ingress {
    description     = "Backend API, from the ALB only"
    from_port       = 4000
    to_port         = 4000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "trailnest-app-sg" }
}

resource "aws_security_group" "rds" {
  name        = "trailnest-rds-sg"
  description = "App instances -> RDS only, port 3306"
  vpc_id      = aws_vpc.trailnest.id

  ingress {
    description     = "MySQL, from the app instances only"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "trailnest-rds-sg" }
}
