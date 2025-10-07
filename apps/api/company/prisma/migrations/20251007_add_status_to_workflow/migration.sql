-- Add status column to Workflow
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft';
-- Optional: backfill could be added here if needed
