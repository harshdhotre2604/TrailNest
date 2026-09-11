locals {
  az_a = data.aws_availability_zones.available.names[0]
  az_b = data.aws_availability_zones.available.names[1]
}

resource "aws_vpc" "trailnest" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "trailnest-vpc", Project = "trailnest" }
}

resource "aws_internet_gateway" "trailnest" {
  vpc_id = aws_vpc.trailnest.id
  tags   = { Name = "trailnest-igw", Project = "trailnest" }
}

# ---- public subnets: ALB + the single NAT Gateway ----
resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.trailnest.id
  cidr_block              = "10.0.0.0/24"
  availability_zone       = local.az_a
  map_public_ip_on_launch = true
  tags                    = { Name = "trailnest-public-a", Tier = "public" }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.trailnest.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = local.az_b
  map_public_ip_on_launch = true
  tags                    = { Name = "trailnest-public-b", Tier = "public" }
}

# ---- private subnets: the app instances (Auto Scaling Group) ----
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.trailnest.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = local.az_a
  tags              = { Name = "trailnest-private-a", Tier = "private" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.trailnest.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = local.az_b
  tags              = { Name = "trailnest-private-b", Tier = "private" }
}

# ---- secure subnets: RDS only, no internet route at all ----
resource "aws_subnet" "secure_a" {
  vpc_id            = aws_vpc.trailnest.id
  cidr_block        = "10.0.20.0/24"
  availability_zone = local.az_a
  tags              = { Name = "trailnest-secure-a", Tier = "secure" }
}

resource "aws_subnet" "secure_b" {
  vpc_id            = aws_vpc.trailnest.id
  cidr_block        = "10.0.21.0/24"
  availability_zone = local.az_b
  tags              = { Name = "trailnest-secure-b", Tier = "secure" }
}

# ---- NAT: one gateway (in AZ a's public subnet), used by both private
# subnets — a deliberate cost trade-off, see terraform/README.md ----
resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "trailnest-nat-eip" }
}

resource "aws_nat_gateway" "trailnest" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_a.id
  tags          = { Name = "trailnest-nat" }
  depends_on    = [aws_internet_gateway.trailnest]
}

# ---- route tables ----
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.trailnest.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.trailnest.id
  }
  tags = { Name = "trailnest-public-rt" }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}
resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.trailnest.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.trailnest.id
  }
  tags = { Name = "trailnest-private-rt" }
}

resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}
resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private.id
}

# secure subnets get Terraform's implicit "main" route table — local VPC
# traffic only, no route to the internet gateway or the NAT gateway at all.
