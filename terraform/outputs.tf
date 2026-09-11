output "instance_id" {
  description = "The Terraform-managed EC2 instance's id"
  value       = aws_instance.trailnest.id
}

output "instance_public_ip" {
  description = "Public (Elastic) IP of the Terraform-managed TrailNest instance — SSH here"
  value       = aws_eip.trailnest.public_ip
}

output "ssh_command" {
  description = "Ready-to-run SSH command"
  value       = "ssh -i ${var.key_name}.pem ubuntu@${aws_eip.trailnest.public_ip}"
}
