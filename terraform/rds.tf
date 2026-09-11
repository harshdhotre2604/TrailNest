resource "aws_db_subnet_group" "trailnest" {
  name       = "trailnest-db-subnet-group"
  subnet_ids = [aws_subnet.secure_a.id, aws_subnet.secure_b.id]
  tags       = { Name = "trailnest-db-subnet-group" }
}

resource "aws_db_instance" "trailnest" {
  identifier     = "trailnest-db"
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = var.db_instance_class

  allocated_storage = 20
  storage_type      = "gp3"

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.trailnest.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = true

  # A demo database — skip the final snapshot so `terraform destroy` doesn't
  # hang waiting on one, or leave a snapshot around that quietly costs money
  # after the rest of the stack is gone.
  skip_final_snapshot = true
  deletion_protection = false

  tags = { Name = "trailnest-db", Project = "trailnest" }
}
