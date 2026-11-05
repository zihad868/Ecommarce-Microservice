locals {
  data_ports = { postgres = 5432, redis = 6379, kafka = 9098 }
}
resource "aws_security_group" "data" {
  for_each = local.data_ports
  name     = "${var.name}-${each.key}"
  vpc_id   = aws_vpc.main.id
  ingress {
    from_port       = each.value
    to_port         = each.value
    protocol        = "tcp"
    security_groups = [aws_eks_cluster.main.vpc_config[0].cluster_security_group_id]
  }
  ingress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    self      = true
  }
  egress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    self      = true
  }
}
resource "aws_db_subnet_group" "main" {
  name       = "${var.name}-databases"
  subnet_ids = aws_subnet.private[*].id
}
resource "aws_db_instance" "services" {
  for_each                    = toset(["identity", "catalog", "order"])
  identifier                  = "${var.name}-${each.key}"
  engine                      = "postgres"
  instance_class              = "db.t3.micro"
  allocated_storage           = 20
  max_allocated_storage       = 100
  db_name                     = each.key
  username                    = "service_admin"
  manage_master_user_password  = true
  storage_encrypted           = true
  multi_az                    = true
  publicly_accessible         = false
  db_subnet_group_name        = aws_db_subnet_group.main.name
  vpc_security_group_ids      = [aws_security_group.data["postgres"].id]
  backup_retention_period     = 7
  deletion_protection         = true
  skip_final_snapshot         = false
  final_snapshot_identifier   = "${var.name}-${each.key}-final"
}
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.name}-redis"
  subnet_ids = aws_subnet.private[*].id
}
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${var.name}-redis"
  description                = "Ecommerce cache"
  engine                     = "redis"
  node_type                  = "cache.t3.micro"
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.data["redis"].id]
}
resource "aws_msk_cluster" "main" {
  cluster_name           = "${var.name}-events"
  kafka_version          = var.kafka_version
  number_of_broker_nodes = 3
  broker_node_group_info {
    instance_type   = "kafka.m5.large"
    client_subnets  = aws_subnet.private[*].id
    security_groups = [aws_security_group.data["kafka"].id]
    storage_info {
      ebs_storage_info { volume_size = 100 }
    }
  }
  client_authentication {
    sasl { iam = true }
  }
  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }
}
