-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- DropIndex
DROP INDEX "Order_idempotencyKey_key";

-- DropIndex
DROP INDEX "OutboxEvent_published_createdAt_idx";

-- AlterTable IdempotencyRecord: adjust primary key and add requestHash
ALTER TABLE "IdempotencyRecord" DROP CONSTRAINT "IdempotencyRecord_pkey",
ADD COLUMN     "requestHash" TEXT NOT NULL DEFAULT '',
ADD CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("userId", "key");

ALTER TABLE "IdempotencyRecord" ALTER COLUMN "requestHash" DROP DEFAULT;

-- AlterTable OutboxEvent: add new columns
ALTER TABLE "OutboxEvent"
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING';

-- Data migration: populate status and publishedAt from published flag before dropping published
UPDATE "OutboxEvent"
SET "status" = 'PUBLISHED',
    "publishedAt" = "updatedAt"
WHERE "published" = true;

-- AlterTable OutboxEvent: drop legacy published column
ALTER TABLE "OutboxEvent" DROP COLUMN "published";

-- CreateIndex
CREATE UNIQUE INDEX "Order_userId_idempotencyKey_key" ON "Order"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_nextAttemptAt_idx" ON "OutboxEvent"("status", "nextAttemptAt");
