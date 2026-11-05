terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  # Configure an encrypted remote backend before sharing state.
}

provider "aws" {
  region = var.region
  default_tags { tags = { Project = var.name, ManagedBy = "terraform" } }
}
