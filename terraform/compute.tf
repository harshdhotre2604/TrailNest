resource "aws_launch_template" "trailnest" {
  name_prefix   = "trailnest-app-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.app_instance_type

  # No key_name here on purpose — these instances have no SSH access at all
  # (see security_groups.tf). Administrative access is SSM Session Manager.

  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  vpc_security_group_ids = [aws_security_group.app.id]

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size           = var.root_volume_size
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }

  user_data = base64encode(templatefile("${path.module}/templates/user_data.sh.tftpl", {
    aws_region         = var.aws_region
    rds_endpoint       = aws_db_instance.trailnest.address
    db_username        = var.db_username
    db_name            = var.db_name
    alb_dns_name       = aws_lb.trailnest.dns_name
    dockerhub_username = var.dockerhub_username
  }))

  tag_specifications {
    resource_type = "instance"
    tags          = { Name = "trailnest-app", Project = "trailnest" }
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "trailnest" {
  name                = "trailnest-asg"
  vpc_zone_identifier = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  # min=1 so a single AZ outage can't take TrailNest fully down; max=3 gives
  # an Instance Refresh room to launch a replacement before terminating the
  # old one (surge), instead of dropping capacity first.
  min_size         = 1
  max_size         = 3
  desired_capacity = var.asg_desired_capacity

  launch_template {
    id      = aws_launch_template.trailnest.id
    version = "$Latest"
  }

  target_group_arns = [
    aws_lb_target_group.frontend.arn,
    aws_lb_target_group.backend.arn,
  ]

  health_check_type         = "ELB"
  health_check_grace_period = 420 # observed: docker install + AWS CLI install + 2 image pulls
  # + RDS schema/seed load routinely takes 4-6 min on a t3.small; 180s was
  # cutting instances off mid-boot and triggering unnecessary replacement.

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
      instance_warmup        = 180
    }
  }

  tag {
    key                 = "Name"
    value               = "trailnest-app"
    propagate_at_launch = true
  }
  tag {
    key                 = "Project"
    value               = "trailnest"
    propagate_at_launch = true
  }
}
