variable "name" {
  type    = string
  default = "ecommerce-prod"
}
variable "region" {
  type    = string
  default = "ap-southeast-1"
}
variable "availability_zones" {
  type = list(string)
  validation {
    condition     = length(var.availability_zones) == 3
    error_message = "Provide three availability zones in the selected region."
  }
}
variable "vpc_cidr" {
  type    = string
  default = "10.40.0.0/16"
}
variable "eks_version" {
  description = "Select a Kubernetes version supported by EKS in the target region."
  type        = string
}
variable "kafka_version" {
  description = "Select an MSK Kafka version supported in the target region."
  type        = string
}
variable "redis_auth_token" {
  description = "Provide through a secret manager or TF_VAR; never commit it in tfvars."
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.redis_auth_token) >= 16
    error_message = "Redis requires an auth token of at least 16 characters."
  }
}
