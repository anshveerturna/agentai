# Migration Drift Remediation (2025-10-07)

This document explains the drift situation and the corrective steps applied.

## Context
- The project had manual / partial migrations that did not fully reflect the `schema.prisma` canonical model.
- Notably, `Agent.userId` is declared non-nullable (`String @db.Uuid`) in the schema, but an earlier manual migration (`20250820120000_add_userId_to_agent`) added it as a nullable column (`ADD COLUMN "userId" uuid;`) without `NOT NULL` or a default.
- A later migration (`20251007_add_status_to_workflow`) added the `status` column to `Workflow` correctly.
- Development `prisma migrate dev` commands encountered drift because the actual database state (including manual edits) diverged from migration history assumptions.

## Goals
1. Bring the live database structure in sync with `schema.prisma`.
2. Avoid destructive changes (no dropping of user data).
3. Provide an auditable, idempotent alignment migration.
4. Minimize future drift by documenting procedure.

## Remediation Steps
1. Created migration folder `20251007_align_schema_constraints` containing alignment SQL:
   - Backfill any NULL `Agent.userId` values with a generated UUID using `gen_random_uuid()`.
   - Enforce `NOT NULL` constraint on `Agent.userId`.
   - Ensure supporting index exists (`Agent_userId_idx`).
   - Re-assert `Workflow.status` (idempotent) to guard against missing column in any environment.
2. Added this documentation file (`MIGRATION_DRIFT.md`).

## Applying the Migration
Run (from `apps/api/company` directory):

```bash
# Ensure pgcrypto extension for gen_random_uuid (if not already enabled)
psql "$DATABASE_URL" -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'

# Apply this alignment migration manually if not using prisma migrate deploy
yarn prisma migrate deploy
# or
npx prisma migrate deploy
```

If you are using `prisma migrate dev` locally and see drift warnings:

```bash
# Reset local dev DB ONLY if safe (destroys data!)
prisma migrate reset
# Then re-seed if a seed script exists
node seed.js
```

## Future Guidelines
- Prefer `prisma migrate dev` for each schema change; avoid ad‑hoc manual SQL unless necessary.
- If a hotfix requires manual SQL, immediately backfill with a formal migration replicating it for other environments.
- Keep JSON columns (`graph`, `nodeOverrides`) immutable shape changes behind migrations documenting semantics if structure evolves.

## Verification Checklist
- [ ] `\d+ "Agent"` shows `userId` as `uuid NOT NULL`.
- [ ] `\d+ "Workflow"` shows `status` column with default `'draft'`.
- [ ] `SELECT count(*) FROM "Agent" WHERE "userId" IS NULL;` returns 0.
- [ ] Prisma client generates without warnings related to these fields.

## Rollback Strategy
If enforcement causes issues (unexpected NULL semantics needed):
1. Temporarily relax constraint: `ALTER TABLE "Agent" ALTER COLUMN "userId" DROP NOT NULL;`
2. Introduce domain logic to populate values properly.
3. Re-apply NOT NULL when ready.

---
Document authored automatically as part of drift resolution.
