# agentai

Fully local developer setup guide with minute detail so you can go from clone to a running stack (Next.js web app + NestJS API + Postgres + Supabase auth integration) confidently.

> If you only need a high-level view, skim the Table of Contents; otherwise follow each step exactly.

## Table of Contents
1. Overview & Architecture
2. Monorepo Layout
3. Technology Versions & Prerequisites
4. Cloning & Dependency Installation
5. Environment Variables (Complete List)
6. Local Database Setup (Postgres via Docker)
7. Prisma & Migrations
8. Supabase Project Setup
9. Running the API (NestJS)
10. Running the Web App (Next.js)
11. Unified Dev with Turbo
12. Testing (Jest + Playwright)
13. Workflow Builder Notes
14. Security Controls Summary
15. Troubleshooting & Common Pitfalls
16. Recommended Next Steps / Production Hardening

---
## 1. Overview & Architecture
The repository is a Bun-managed JavaScript/TypeScript monorepo containing:
- `apps/api/company` – NestJS backend exposing agents & workflow endpoints, secured with JWT validation (Supabase) and various hardening layers.
- `apps/web/company` – Next.js 15 (React 19) frontend, includes workflow builder (XYFlow) and auth UI integrating with Supabase.
- `supabase/` – Migrations & config for Supabase project (auth + SQL migrations).
- Shared configuration (ESLint, Turbo) at root.

Runtime split:
- Frontend on port `3000` (default Next.js dev) consuming API at `http://localhost:3002`.
- API on port `3002` connecting to Postgres (local Docker or remote) and validating Supabase JWTs.

## 2. Monorepo Layout
```
apps/
	api/company/      # NestJS service
	web/company/      # Next.js web app
supabase/           # Supabase migrations & config
SECURITY.md         # Deep dive into security posture
SECURITY_MATRIX.md  # Verification matrix
ROADMAP.md          # Future roadmap items
```
`apps/web/company/src/components/workflows/**` holds the current workflow editor (XYFlow). Legacy `flows` implementation was removed.

## 3. Technology Versions & Prerequisites
Install these before continuing:
- Node (v20+ recommended; Bun brings its own runtime but Node useful for tooling)
- Bun (declared in `packageManager`: `bun@1.1.0`) – used for installing & running scripts
- Docker (for local Postgres) OR existing remote Postgres URL
- Supabase account (for hosted auth) OR run Supabase locally (optional but not covered in depth here)
- Git

Optional:
- `supabase` CLI (to inspect migrations) – `brew install supabase/tap/supabase`
- `jq` for scripting
- A modern browser for Playwright tests (Playwright auto-installs browsers)

### Install Bun
```
curl -fsSL https://bun.sh/install | bash
```
After install, ensure it’s on PATH:
```
bun --version
```

## 4. Cloning & Dependency Installation
```
git clone https://github.com/<YOUR_ORG_OR_USER>/agentai.git
cd agentai
bun install
```
This installs all workspace dependencies via Bun & Turbo (declared in `workspaces`).

## 5. Environment Variables (Complete List)
Create two env files:
- `apps/api/company/.env`
- `apps/web/company/.env.local`

Below are every referenced variable (from grep). Marked REQUIRED / OPTIONAL for local dev.

### API (`apps/api/company/.env`)
| Variable | Purpose | Dev Default | Req |
|----------|---------|-------------|-----|
| PORT | API port | 3002 | OPTIONAL (defaults to 3002) |
| DATABASE_URL | Prisma Postgres connection | `postgresql://postgres:postgres@localhost:5432/agentai?schema=public` | REQUIRED |
| SUPABASE_PROJECT_REF | Supabase project ref (e.g. `abcd1234`) | (your value) | REQUIRED if using Supabase JWTs |
| SUPABASE_JWKS_URL | JWKS endpoint for token verification | `https://<ref>.supabase.co/auth/v1/jwks` | OPTIONAL (derived if absent) |
| SUPABASE_JWT_SECRET | Used for JWT validation fallback | (your value from Supabase UI) | REQUIRED if JWKS not used |
| AUTH_DEV_ALLOW_UNVERIFIED | Allow tokens without full verification (dev only) | `true` | OPTIONAL |
| DEV_FAKE_DATA | Enable fake agent data responses | `true` | OPTIONAL |
| CORS_ORIGIN | Allowed origin for web app | `http://localhost:3000` | REQUIRED |
| FRONTEND_ORIGIN | Alternative origin variable (used if CORS_ORIGIN unset) | `http://localhost:3000` | OPTIONAL |
| LOG_LEVEL | Pino log level | `info` | OPTIONAL |
| BODY_LIMIT | Max request body size | `1mb` | OPTIONAL |
| TRUST_PROXY | If true, enables proxy trust in Nest | `false` | OPTIONAL |
| WORKFLOW_AUTOCOMMIT_ENABLED | Auto-commit workflow changes | `false` | OPTIONAL |

Example `apps/api/company/.env`:
```
PORT=3002
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentai?schema=public
SUPABASE_PROJECT_REF=your_project_ref
SUPABASE_JWKS_URL=https://your_project_ref.supabase.co/auth/v1/jwks
SUPABASE_JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
AUTH_DEV_ALLOW_UNVERIFIED=true
DEV_FAKE_DATA=true
WORKFLOW_AUTOCOMMIT_ENABLED=false
```

### Web (`apps/web/company/.env.local`)
| Variable | Purpose | Dev Default | Req |
|----------|---------|-------------|-----|
| NEXT_PUBLIC_SUPABASE_URL | Supabase REST base URL | `https://<ref>.supabase.co` | REQUIRED |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon public key | (from Supabase) | REQUIRED |
| NEXT_PUBLIC_API_URL | API base URL | `http://localhost:3002` | REQUIRED |

Example `apps/web/company/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your_project_ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3002
```

## 6. Local Database Setup (Postgres via Docker)
Run a Postgres 15 container:
```
docker run --name agentai-postgres \
	-e POSTGRES_PASSWORD=postgres \
	-e POSTGRES_USER=postgres \
	-e POSTGRES_DB=agentai \
	-p 5432:5432 -d postgres:15
```
Validate connectivity:
```
docker logs agentai-postgres --tail=20
```
Set `DATABASE_URL` as shown earlier.

## 7. Prisma & Migrations
From `apps/api/company` directory:
```
cd apps/api/company
bunx prisma migrate deploy   # apply existing migrations
# or during iterative dev
bunx prisma migrate dev --name init
```
Generate client (usually part of migrate dev, run if needed):
```
bunx prisma generate
```
The `seed.js` file is currently empty; add logic there if you need seed data (e.g. with Prisma client).

## 8. Supabase Project Setup
1. Create a new project in Supabase dashboard.
2. Retrieve: Project Ref (in project settings), Anon Key, JWT Secret.
3. Derive JWKS URL: `https://<PROJECT_REF>.supabase.co/auth/v1/jwks`.
4. Populate both env files as described.
5. (Optional) Apply migrations in `supabase/migrations` using Supabase SQL editor if they differ from Prisma (these are raw SQL for agents table evolution).

## 9. Running the API (NestJS)
```
cd apps/api/company
bun run dev    # uses node --watch + ts-node
```
Alternative build then start:
```
bun run build
bun run start:prod
```
Port defaults to 3002; adjust `PORT` in `.env` if needed.

## 10. Running the Web App (Next.js)
```
cd apps/web/company
bun run dev    # starts Next.js (Turbopack) on port 3000
```
Build & start production:
```
bun run build
bun run start
```

## 11. Unified Dev with Turbo
From repository root:
```
bun run dev
```
Runs `turbo run dev --parallel` starting both API and Web concurrently (ensure env files exist first).

## 12. Testing
### API (Jest)
```
cd apps/api/company
bun run test          # unit tests (*.spec.ts in src)
bun run test:e2e      # e2e tests in test/ directory
```
Coverage:
```
bun run test:cov
```
### Web (Playwright)
Install browsers (first run auto):
```
cd apps/web/company
npx playwright install
npx playwright test    # or bunx playwright test
```
Playwright config at `apps/web/company/playwright.config.ts`.

## 13. Workflow Builder Notes
Active implementation: `apps/web/company/src/components/workflows/**` using XYFlow.
Key behaviors restored:
- Selection-based grouping
- Text node drag-to-size creation (size corrected for zoom & padding)
- Double-click to edit text; single-click selects
- Caret stability via local draft buffer
Group draw-to-size feature planned (see TODO list if present).

## 14. Security Controls Summary
Implemented measures (highlights):
- Helmet + CSP, rate limiting (global + auth bucket)
- JWT guard (Supabase JWKS / secret) + RLS on agents
- Hardened login proxy & enumeration-safe reset/invite flows
- Password policy (>=12 chars, complexity) client & server
- Structured JSON logging with correlation IDs, sanitized exception handling
- Pino redaction for sensitive fields
- Global security headers (CSP, HSTS, frame, referrer, permissions policy)
- Request timeout + circuit breaker + body size limit
- Playwright & Jest security regression tests
See `SECURITY.md` & `SECURITY_MATRIX.md` for exhaustive mapping.

## 15. Troubleshooting & Common Pitfalls
| Issue | Symptom | Fix |
|-------|---------|-----|
| Missing env vars | 401/403 or blank UI sections | Re-check `.env` & `.env.local` keys present |
| Wrong Supabase ref | JWT verification fails | Confirm project ref matches URL prefix |
| Postgres not reachable | Prisma migrate errors | Ensure container running & port 5432 accessible |
| CORS blocked | Browser console CORS errors | Set `CORS_ORIGIN` to exact frontend origin |
| Playwright fails auth tests | 302 loops | Ensure Supabase keys & API URL match running services |
| Caret jump in text node | Cursor moves to start | Confirm running latest code (draft commit fix applied) |
| API logs show unverified token allowed | Security concern | Disable `AUTH_DEV_ALLOW_UNVERIFIED` in production |

### Log Levels
Set `LOG_LEVEL=debug` temporarily for deeper inspection (avoid in production).

### Regenerating Prisma Client
Run `bunx prisma generate` after changing `schema.prisma`.

## 16. Recommended Next Steps / Production Hardening
- Implement token version revocation for global logout.
- Externalize rate limit storage (Redis) for horizontal scaling.
- Centralized logging + alerting (e.g., Datadog, ELK).
- Add automated dependency scanning (Dependabot/Renovate).
- Consider field-level encryption for future sensitive entities.

---
### Quick Start (Condensed)
```
git clone ...
cd agentai
bun install
# create apps/api/company/.env & apps/web/company/.env.local (see sections above)
docker run --name agentai-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=agentai -p 5432:5432 -d postgres:15
cd apps/api/company && bunx prisma migrate deploy && cd ../../..
bun run dev
```
Open: Frontend http://localhost:3000, API http://localhost:3002

---
> For full security posture consult `SECURITY.md`. For verification matrix consult `SECURITY_MATRIX.md`.

_Last updated: 2025-11-18_
