output "vpc_id" { value = module.stack.vpc_id }
output "cluster_name" { value = module.stack.cluster_name }
output "database_endpoints" { value = module.stack.database_endpoints }
output "database_proxy_endpoints" { value = module.stack.database_proxy_endpoints }
output "redis_endpoint" { value = module.stack.redis_endpoint }
output "kafka_brokers" { value = module.stack.kafka_brokers }
