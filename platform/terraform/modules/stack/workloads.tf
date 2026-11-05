locals {
  kafka_services = toset(["catalog-service", "order-service"])
}
resource "aws_ecr_repository" "services" {
  for_each             = toset(["identity-service", "catalog-service", "order-service", "api-gateway"])
  name                 = "${var.name}/${each.value}"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
}
resource "aws_eks_addon" "pod_identity" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "eks-pod-identity-agent"
  depends_on   = [aws_eks_node_group.main]
}
data "aws_iam_policy_document" "pod_identity_assume" {
  statement {
    actions = ["sts:AssumeRole", "sts:TagSession"]
    principals {
      type        = "Service"
      identifiers = ["pods.eks.amazonaws.com"]
    }
  }
}
resource "aws_iam_role" "kafka_services" {
  for_each           = local.kafka_services
  name               = "${var.name}-${each.key}"
  assume_role_policy = data.aws_iam_policy_document.pod_identity_assume.json
}
resource "aws_iam_role_policy" "kafka_services" {
  for_each = local.kafka_services
  role     = aws_iam_role.kafka_services[each.key].id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["kafka-cluster:Connect", "kafka-cluster:DescribeCluster", "kafka-cluster:WriteDataIdempotently"], Resource = aws_msk_cluster.main.arn },
    { Effect = "Allow", Action = ["kafka-cluster:DescribeTopic", "kafka-cluster:ReadData", "kafka-cluster:WriteData", "kafka-cluster:CreateTopic"], Resource = "${replace(aws_msk_cluster.main.arn, ":cluster/", ":topic/")}/*" },
    { Effect = "Allow", Action = ["kafka-cluster:DescribeGroup", "kafka-cluster:AlterGroup"], Resource = "${replace(aws_msk_cluster.main.arn, ":cluster/", ":group/")}/*" }
  ] })
}
resource "aws_eks_pod_identity_association" "kafka_services" {
  for_each        = local.kafka_services
  cluster_name    = aws_eks_cluster.main.name
  namespace       = var.kubernetes_namespace
  service_account = each.key
  role_arn        = aws_iam_role.kafka_services[each.key].arn
  depends_on      = [aws_eks_addon.pod_identity]
}
