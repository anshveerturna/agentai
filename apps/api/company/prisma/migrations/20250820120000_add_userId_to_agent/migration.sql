-- Migration: add userId column to agent
-- Generated manually
ALTER TABLE "Agent" ADD COLUMN "userId" uuid;
CREATE INDEX IF NOT EXISTS "Agent_userId_idx" ON "Agent"("userId");
-- Optional: backfill logic here (e.g., set to a default or map existing rows)
-- UPDATE "Agent" SET "userId" = '<some-default-uuid>' WHERE "userId" IS NULL;
