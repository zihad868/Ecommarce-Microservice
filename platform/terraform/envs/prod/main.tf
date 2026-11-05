terraform {
  required_version = ">= 1.10.0"
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
  backend "s3" {
    encrypt      = true
    use_lockfile = true
  }
}
provider "aws" {
  region = var.region
  default_tags { tags = { Project = var.name, Environment = "prod", ManagedBy = "terraform" } }
}
module "stack" {
  source               = "../../modules/stack"
  name                 = var.name
  region               = var.region
  availability_zones   = var.availability_zones
  vpc_cidr             = var.vpc_cidr
  eks_version          = var.eks_version
  kafka_version        = var.kafka_version
  kubernetes_namespace = "ecommerce-prod"
  redis_auth_token     = var.redis_auth_token
}
