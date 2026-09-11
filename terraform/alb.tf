resource "aws_lb_target_group" "frontend" {
  name        = "trailnest-tg-frontend"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.trailnest.id
  target_type = "instance"

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 15
    timeout             = 5
  }
  tags = { Name = "trailnest-tg-frontend" }
}

resource "aws_lb_target_group" "backend" {
  name        = "trailnest-tg-backend"
  port        = 4000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.trailnest.id
  target_type = "instance"

  health_check {
    path                = "/api/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 15
    timeout             = 5
  }
  tags = { Name = "trailnest-tg-backend" }
}

resource "aws_lb" "trailnest" {
  name               = "trailnest-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  tags = { Name = "trailnest-alb", Project = "trailnest" }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.trailnest.arn
  port              = 80
  protocol          = "HTTP"

  # default rule: everything that isn't matched below -> frontend
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# The path-based split that plays nginx's role from here on: API and
# uploaded-media requests go to the backend; everything else is the frontend.
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
  condition {
    path_pattern {
      values = ["/api/*", "/uploads/*"]
    }
  }
}
