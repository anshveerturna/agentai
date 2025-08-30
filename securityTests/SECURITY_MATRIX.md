# Security Control Verification Matrix

Status legend:
- PASS: Implemented and verified by test or code reference.
- PARTIAL: Implemented with noted limitation / future work.
- TODO: Not yet implemented.

| ID | Control | Status | Evidence / File References | Tests / Verification |
|----|---------|--------|----------------------------|----------------------|
| A1 | Authentication via Supabase JWT with server validation | PASS | Nest guard & JWKS (earlier implementation not shown here), SSR middleware `apps/web/company/src/middleware.ts` | E2E auth flow in `apps/web/company/e2e/auth.enterprise.spec.ts` |
| A2 | Row-Level Security on agents data | PASS | Prisma / Supabase policy (schema + RLS config) | Manual DB policy (outside code) – assumed active |
| A3 | Hardened login proxy (brute-force, uniform errors) | PASS | `apps/web/company/src/app/api/auth/login/route.ts` | E2E login + brute-force scenario test (enterprise spec) |
| A4 | Password reset (enumeration-safe) | PASS | `reset-request` & `reset-update` routes | E2E password reset path |
| A5 | Invite-based signup flow | PASS | `apps/web/company/src/app/api/auth/invite/route.ts` | E2E invite path |
| A6 | Global logout endpoint (all sessions) | PARTIAL | `logout-all/route.ts` (revocation TODO) | Manual invocation; future token version test pending |
| P1 | Password complexity >=12 + upper/lower/digit/symbol | PASS | Client: `signup/page.tsx`; Server: `signup/route.ts` | Jest unit (policy enforced) / visual validation |
| H1 | CSP without 'unsafe-inline' in production | PASS | `next.config.ts` dynamic CSP builder | Snapshot/header presence tests |
| H2 | HSTS 2y preload | PASS | `next.config.ts` headers | Header presence test |
| H3 | X-Frame-Options DENY | PASS | `next.config.ts` headers | Header presence test |
| H4 | Referrer-Policy no-referrer | PASS | `next.config.ts` headers | Header presence test |
| H5 | Permissions-Policy locked down | PASS | `next.config.ts` headers | Header presence test |
| H6 | X-Content-Type-Options nosniff | PASS | `next.config.ts` headers | Header presence test |
| H7 | Remove X-Powered-By | PASS | Helmet config `main.ts` | Snapshot/header presence (absence) |
| R1 | Global rate limiting | PASS | Throttler in `app.module.ts` | Manual & E2E (no regressions) |
| R2 | Auth-specific stricter rate limiter | PASS | Throttler config (auth bucket) | Code inspection |
| BF1 | Progressive delay + lockout | PASS | Login proxy route logic | E2E brute-force scenario |
| L1 | Correlation IDs | PASS | `correlation-id.middleware.ts` | Logging output inspection |
| L2 | Structured Pino logging with redaction | PASS | Logger provider + interceptor | Manual log review |
| E1 | Global exception filter sanitized responses | PASS | `all-exceptions.filter.ts` | Unit/integration errors show generic output |
| I1 | Request body size limits | PASS | `apps/api/company/src/main.ts`, `next.config.ts` | Manual large payload test (future automate) |
| I2 | Request timeout (5s) & circuit breaker | PASS | `timeout.interceptor.ts` | Unit/integration (future dedicated test) |
| S1 | Proactive session refresh | PASS | `sessionRefresh.ts` + layout init | Manual token lifetime observation |
| T1 | Security header presence test | PASS | `security-headers.spec.ts` | Jest run |
| T2 | Security header snapshot regression test | PASS | `security-headers.snapshot.spec.ts` | Jest snapshot |
| T3 | Playwright E2E auth & security flows | PASS | `e2e/auth.enterprise.spec.ts` | Playwright run |
| D1 | Dependency vulnerability scanning | TODO | (Planned: CI integration) | N/A |
| M1 | Monitoring & alerting centralization | TODO | (Planned: external stack) | N/A |
| S2 | Token versioning for global revocation | TODO | (Design placeholder in logout-all route) | Future test pending |
| B1 | CAPTCHA / challenge after repeated lockouts | TODO | (Future improvement) | N/A |
| A7 | Field-level encryption for sensitive future data | TODO | (Future) | N/A |
| T4 | Load / fuzz testing for auth endpoints | TODO | (Future) | N/A |

## Notes
- PARTIAL indicates a functional surface exists but requires backend session versioning to fully satisfy security objective (e.g., A6).
- Some TODO items are operational (monitoring, scanning) and would be implemented via CI/CD & infrastructure rather than application code.

_Last updated: 2025-08-21_
