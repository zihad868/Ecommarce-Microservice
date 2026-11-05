output "vpc_id" { value = aws_vpc.main.id }
output "cluster_name" { value = aws_eks_cluster.main.name }
output "database_endpoints" { value = { for name, db in aws_db_instance.services : name => db.address } }
output "redis_endpoint" { value = aws_elasticache_replication_group.main.primary_endpoint_address }
output "kafka_brokers" { value = aws_msk_cluster.main.bootstrap_brokers_sasl_iam }
