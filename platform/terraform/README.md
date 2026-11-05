# AWS infrastructure starter

Defines a three-AZ VPC with private subnets and NAT per AZ, private EKS API and
managed workers, three isolated RDS databases, encrypted Redis with failover,
and an MSK cluster using IAM authentication. No cloud resources have been applied.

Terraform is not installed in the development environment, so this starter has
not been provider-validated. Before applying, run `terraform fmt`, `terraform init`
and `terraform validate`, configure encrypted remote state and locking, and select
supported EKS/Kafka versions and instance sizes for the destination region.

Set `availability_zones`, `eks_version`, `kafka_version`, and the sensitive
`redis_auth_token` input outside source control. Redis tokens are stored in state;
protect access to it. RDS manages database passwords in AWS Secrets Manager.

Application integration remains environment-specific: workload IAM, private API
access for operators, Secrets Manager injection, TLS Redis clients, MSK IAM/SASL
clients, ingress certificates, and backup/restore verification must be configured.
The local Compose clients use plaintext local connections and must be adapted
before connecting them to these managed services.
