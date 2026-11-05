moved {
  from = aws_iam_role.cluster
  to   = module.stack.aws_iam_role.cluster
}
moved {
  from = aws_iam_role_policy_attachment.cluster
  to   = module.stack.aws_iam_role_policy_attachment.cluster
}
moved {
  from = aws_eks_cluster.main
  to   = module.stack.aws_eks_cluster.main
}
moved {
  from = aws_iam_role.nodes
  to   = module.stack.aws_iam_role.nodes
}
moved {
  from = aws_iam_role_policy_attachment.nodes
  to   = module.stack.aws_iam_role_policy_attachment.nodes
}
moved {
  from = aws_eks_node_group.main
  to   = module.stack.aws_eks_node_group.main
}
moved {
  from = aws_security_group.data
  to   = module.stack.aws_security_group.data
}
moved {
  from = aws_db_subnet_group.main
  to   = module.stack.aws_db_subnet_group.main
}
moved {
  from = aws_db_instance.services
  to   = module.stack.aws_db_instance.services
}
moved {
  from = aws_elasticache_subnet_group.main
  to   = module.stack.aws_elasticache_subnet_group.main
}
moved {
  from = aws_elasticache_replication_group.main
  to   = module.stack.aws_elasticache_replication_group.main
}
moved {
  from = aws_msk_cluster.main
  to   = module.stack.aws_msk_cluster.main
}
moved {
  from = aws_vpc.main
  to   = module.stack.aws_vpc.main
}
moved {
  from = aws_internet_gateway.main
  to   = module.stack.aws_internet_gateway.main
}
moved {
  from = aws_subnet.public
  to   = module.stack.aws_subnet.public
}
moved {
  from = aws_subnet.private
  to   = module.stack.aws_subnet.private
}
moved {
  from = aws_eip.nat
  to   = module.stack.aws_eip.nat
}
moved {
  from = aws_nat_gateway.main
  to   = module.stack.aws_nat_gateway.main
}
moved {
  from = aws_route_table.public
  to   = module.stack.aws_route_table.public
}
moved {
  from = aws_route_table_association.public
  to   = module.stack.aws_route_table_association.public
}
moved {
  from = aws_route_table.private
  to   = module.stack.aws_route_table.private
}
moved {
  from = aws_route_table_association.private
  to   = module.stack.aws_route_table_association.private
}
