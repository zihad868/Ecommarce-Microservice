data "aws_iam_policy_document" "proxy_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["rds.amazonaws.com"]
    }
  }
}
resource "aws_iam_role" "proxy" {
  name               = "${var.name}-database-proxy"
  assume_role_policy = data.aws_iam_policy_document.proxy_assume.json
}
resource "aws_iam_role_policy" "proxy" {
  role = aws_iam_role.proxy.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Effect   = "Allow", Action = ["secretsmanager:GetSecretValue"],
    Resource = [for db in aws_db_instance.services : db.master_user_secret[0].secret_arn]
  }] })
}
resource "aws_db_proxy" "services" {
  for_each               = aws_db_instance.services
  name                   = "${var.name}-${each.key}"
  engine_family          = "POSTGRESQL"
  role_arn               = aws_iam_role.proxy.arn
  vpc_subnet_ids         = aws_subnet.private[*].id
  vpc_security_group_ids = [aws_security_group.data["postgres"].id]
  require_tls            = true
  idle_client_timeout    = 300
  auth {
    auth_scheme = "SECRETS"
    secret_arn  = each.value.master_user_secret[0].secret_arn
    iam_auth    = "DISABLED"
  }
  depends_on = [aws_iam_role_policy.proxy]
}
resource "aws_db_proxy_default_target_group" "services" {
  for_each      = aws_db_proxy.services
  db_proxy_name = each.value.name
  connection_pool_config {
    max_connections_percent      = 60
    max_idle_connections_percent = 30
    connection_borrow_timeout    = 30
  }
}
resource "aws_db_proxy_target" "services" {
  for_each               = aws_db_instance.services
  db_proxy_name          = aws_db_proxy.services[each.key].name
  target_group_name      = aws_db_proxy_default_target_group.services[each.key].name
  db_instance_identifier = each.value.identifier
}
