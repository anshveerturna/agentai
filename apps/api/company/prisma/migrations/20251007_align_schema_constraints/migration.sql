-- Baseline alignment migration (manual) to reconcile drift between schema.prisma and database.
-- 1. Ensure Agent.userId column is NOT NULL (schema expects non-nullable)
-- 2. Ensure existing null userId rows (if any) are assigned a deterministic placeholder or removed, before adding constraint
-- 3. (Idempotent where safe) Do not drop data-bearing columns.
-- NOTE: Adjust placeholder UUID logic as needed for your domain.

-- Backfill any NULL userId with a generated UUID (only for rows missing it)
UPDATE "Agent" SET "userId" = gen_random_uuid() WHERE "userId" IS NULL;

-- Enforce NOT NULL if not already
ALTER TABLE "Agent" ALTER COLUMN "userId" SET NOT NULL;

-- (Optional) Recreate index explicitly in case prior manual migration diverged
CREATE INDEX IF NOT EXISTS "Agent_userId_idx" ON "Agent"("userId");

-- No-op guard for Workflow.status since previous migration added it; column exists with default.
-- If status column unexpectedly missing, add again (will be ignored if exists)
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft';
