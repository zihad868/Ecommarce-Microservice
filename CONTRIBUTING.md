# Contributing Guide

Thank you for contributing to the Ecommerce Microservices project! Follow these guidelines to maintain code quality, security, and architectural consistency.

---

## 1. Prerequisites

- **Node.js**: v22+ (LTS)
- **Docker & Docker Compose**: v2.20+
- **npm**: v10+

---

## 2. Monorepo Workflow

This repository uses **npm workspaces**:

- `packages/common`: Shared utilities, errors, logging, metrics, resilient gRPC client.
- `auth-service`: Authentication, Argon2id hashing, JWT token rotation, gRPC auth server.
- `product-service`: Catalog management, versioned Redis caching, atomic stock decrements.
- `order-service`: Order placement, transactional outbox worker, state machine.

### Key Commands

```bash
# Install dependencies across all packages
npm install

# Run typecheck monorepo-wide
npm run typecheck

# Run ESLint with TypeScript strict rules
npm run lint

# Build common package and all microservices
npm run build

# Run unit and concurrency tests
npm test

# Format all files with Prettier
npx prettier --write .
```

---

## 3. Git Commit Conventions

We strictly enforce **Conventional Commits** validated via Husky and Commitlint:

```
<type>(<scope>): <short description>
```

Valid types:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding or correcting tests
- `chore`: Changes to the build process or auxiliary tools

---

## 4. Architectural Rules

1. **Never use floats for currency**: Always use `Prisma.Decimal` or minor integer units.
2. **Fail Fast on Missing Config**: Validate all environment variables with Zod at service startup.
3. **No Direct Service-to-Service DB Access**: Microservices only communicate via gRPC (synchronous read) or Kafka (asynchronous event).
4. **Resilient gRPC**: Always use `invokeResilientGrpc` for external RPC calls with deadlines and circuit breakers.
5. **Architectural Decisions**: Document major technical choices in `docs/adr/`.
