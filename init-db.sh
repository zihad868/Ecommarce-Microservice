#!/bin/bash
# This file is kept for reference only.
# With the polyglot persistence setup, each service has its own dedicated database container:
#
#   auth-service  → auth-db  (PostgreSQL on port 5433)  — DATABASE_URL in docker-compose
#   order-service → order-db (PostgreSQL on port 5434)  — DATABASE_URL in docker-compose
#   product-service → product-db (MongoDB on port 27017) — MONGODB_URL in docker-compose
#
# Each PostgreSQL container auto-creates its database via POSTGRES_DB env var.
# MongoDB auto-creates the database via MONGO_INITDB_DATABASE env var.
# No manual initialization script is needed.
echo "No shared database initialization required (polyglot persistence setup)."
