# Security Policy & Architecture

## 1. Threat Model & Security Posture

The platform adheres to a defense-in-depth, zero-trust security architecture across the networking, container, database, and application layers.

### 1.1 Authentication & Password Security

- **Argon2id Hashing**: Passwords are saved using memory-hard Argon2id hashing algorithms, preventing GPU and ASIC rainbow-table attacks.
- **Strict Password Complexity**: Enforces at least 8 characters, with lowercase, uppercase, numeric, and special character requirements.
- **Short-Lived Access Tokens**: JWT access tokens expire in 15 minutes.
- **Rotating Refresh Tokens with Reuse Detection**: Refresh tokens are stored in the database as SHA-256 hashes. If a previously rotated token is presented, all active sessions for that user are immediately revoked (theft detection).

### 1.2 Authorization & Role-Based Access Control (RBAC)

- All mutating administrative endpoints (`POST /api/products`, `PATCH /api/products/:id`) require the `ADMIN` role.
- Role claims are cryptographically signed into the JWT and validated either directly or via gRPC `ValidateToken`.
- Unauthenticated requests receive HTTP 401; authenticated requests with insufficient privileges receive HTTP 403.

### 1.3 Container & Kubernetes Hardening

- **Rootless Execution**: Containers run as unprivileged `appuser` (UID/GID 1001).
- **Read-Only Root Filesystems**: Container root filesystems are mounted read-only (`readOnlyRootFilesystem: true`) with only `/tmp` backed by ephemeral emptyDir storage.
- **Privilege Escalation**: Explicitly disabled (`allowPrivilegeEscalation: false`) with all Linux capabilities dropped (`capabilities.drop: ["ALL"]`).
- **Network Policies**: Default deny-all ingress and egress policies enforce strict whitelisting. Inter-service gRPC communication is invisible to the external network.

---

## 2. Secret Rotation Procedures

### 2.1 Rotating JWT Secret

1. Deploy updated auth-service with dual-verification support (accept new secret and previous secret).
2. Issue all new tokens with the new secret.
3. After 15 minutes (maximum access token lifetime), remove the previous secret from environment variables.

### 2.2 Rotating Database Passwords

1. Create a secondary database user with the new password.
2. Update Kubernetes secret `01-secrets.yaml` / SealedSecrets with the new connection string.
3. Trigger rolling restart of target services (`kubectl rollout restart deployment/<service> -n ecommerce`).
4. Drop old database user.

---

## 3. Reporting a Vulnerability

To report a security vulnerability, please email `security@yourdomain.com`. Reports are acknowledged within 24 hours.
