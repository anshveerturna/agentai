# Security Overview

This document summarizes the security controls implemented in this repository and outlines recommended next steps.

## Implemented Controls

### Authentication & Authorization
- Supabase-managed auth (email/password) with JWT validation on API (custom guard + JWKS verification previously added).
- Agents data row-level security (RLS) enforced via `user_id` column and policies.
- SSR route protection middleware for `/agents` pages (redirects unauthenticated users to login preserving `next` param).
- Hardened login proxy endpoint (`apps/web/company/src/app/api/auth/login/route.ts`) adding progressive delay, lockout tracking, and uniform error responses to mitigate brute-force & enumeration.
- Password reset (request + update) flow with enumeration-safe responses and token handling (`/api/auth/reset-request`, `/api/auth/reset-update`).
- Invite-based signup endpoint (`/api/auth/invite`) for controlled onboarding (admin only, server-side validation).
- Global logout endpoint (`/api/auth/logout-all`) wired in UI; server-side token-version revocation planned (TODO noted in route) to invalidate all sessions.

### Password Policy
- Client-side live password complexity validation: >=12 chars, upper, lower, digit, symbol.
- Server-side password policy guard in `/api/auth/signup` route preventing weak passwords before upstream request.

### Transport & Browser Security
- Next.js global security headers: CSP (restrictive baseline; production build removes `'unsafe-inline'` for scripts & styles), HSTS (2 years + preload), X-Frame-Options DENY, Referrer-Policy no-referrer, Permissions-Policy locked down, MIME sniffing disabled.
- Nest API Helmet integration: CSP, frameguard, referrer policy, cross origin policies, X-Powered-By removed.

### Rate Limiting & Abuse Prevention
- Global rate limiting (100 req/min/IP) plus dedicated stricter bucket (10/min) for auth-sensitive operations (extensible).
- Brute-force protections: in-memory attempt tracker (placeholder for Redis) with exponential backoff delays and temporary lockouts enforced in hardened login proxy.

### Logging & Traceability
- Correlation ID middleware assigns `X-Request-Id` to every API request (propagates if provided).
- Structured JSON request logs (method, path, status, duration, userId, requestId).
- Global exception filter logs unhandled errors with stack (non-production) and user/context metadata.
- Pino logger with redaction of sensitive fields (authorization headers, cookies, tokens, password fields) preventing secret leakage.

### Input & Error Handling
- Centralized exception capture with sanitized JSON responses.
- Password policy error messages generalized (no over-disclosure of internal validation logic beyond criteria list).
- Request body size limits enforced (Nest main bootstrap + Next.js `next.config.ts` runtime config) to mitigate large-payload DoS.
- Request timeout (5s) & lightweight circuit breaker interceptor to fail fast under downstream latency and prevent resource exhaustion.

### Frontend Hardening
- CSP disallows external origins by default (adjust intentionally when adding assets).
- Middleware performs lightweight JWT expiry check to protect SSR routes.
- Proactive session refresh utility (`sessionRefresh.ts`) refreshes tokens near expiry and on window focus to reduce session fixation / stale token risk.
- Header presence & snapshot Jest tests ensure regression detection for critical security headers; Playwright E2E suite covers auth & security flows (login hardening, password reset, invite path, header assertions).

## Files of Interest
- `apps/api/company/src/main.ts`: Helmet and CORS config.
- `apps/api/company/src/app.module.ts`: Throttler, logging interceptor, exception filter wiring.
- `apps/api/company/src/common/middleware/correlation-id.middleware.ts`: Correlation IDs.
- `apps/api/company/src/common/interceptors/logging.interceptor.ts`: Structured logs.
- `apps/api/company/src/common/filters/all-exceptions.filter.ts`: Global error handling.
- `apps/api/company/src/common/interceptors/timeout.interceptor.ts`: Timeout & circuit breaker.
- `apps/web/company/src/app/api/auth/login/route.ts`: Hardened login proxy (brute-force defenses, uniform errors).
- `apps/web/company/next.config.ts`: Security headers.
- `apps/web/company/src/app/signup/page.tsx`: Client password validation UI.
- `apps/web/company/src/app/api/auth/signup/route.ts`: Server password policy enforcement.
- `apps/web/company/src/middleware.ts`: SSR route protection.
- `apps/web/company/src/app/api/auth/reset-request/route.ts` & `reset-update/route.ts`: Password reset flows.
- `apps/web/company/src/app/api/auth/invite/route.ts`: Admin invite.
- `apps/web/company/src/app/api/auth/logout-all/route.ts`: Global logout (future token revocation TODO).
- `apps/web/company/src/lib/sessionRefresh.ts`: Proactive token refresh helper.
- `apps/web/company/src/tests/security-headers.spec.ts`: Header presence test.
- `apps/web/company/src/tests/security-headers.snapshot.spec.ts`: Header snapshot regression test.
- `apps/web/company/playwright.config.ts` & `apps/web/company/e2e/auth.enterprise.spec.ts`: E2E security/auth coverage.

## Operational Considerations (Recommended Next Steps)
1. Session Management:
   - Implement server-side token versioning & revocation to back global logout and invalidate stolen refresh tokens.
2. Brute Force & Enumeration:
   - (Partially Mitigated) Consider adding CAPTCHA / challenge after repeated lockouts; move attempt tracker to Redis for horizontal scaling.
3. Secrets Management:
   - Ensure environment variables managed via secure secret store (e.g., Doppler, Vault, Vercel secrets) not committed.
4. Monitoring & Alerting:
   - Ship logs to centralized system (ELK, Datadog) and add anomaly detection on spikes or error ratios.
5. Audit & Compliance:
   - Periodic dependency vulnerability scans (e.g., `bun audit` / GitHub Dependabot) and SAST.
6. CSP Hardening:
   - DONE: `'unsafe-inline'` removed in production build. Add nonces/hashes if inline scripts become necessary.
7. Data Protection:
   - Evaluate encryption at rest for sensitive data beyond defaults; consider field-level encryption for future secret storage.
8. Availability:
   - DONE: Request timeout + basic circuit breaker and body size limits. Expand to external dependency health checks.
9. Secrets in Logs:
   - DONE: Pino redaction in place. Add detection for anomalous large log events or secret patterns via centralized logging.
10. Testing & Regression Safety:
   - DONE: Header presence + snapshot tests, Playwright auth & security flows. Extend to load testing & fuzzing.
11. Dependency Hygiene:
   - Automate periodic dependency/update scanning & renovate bot integration.

## Reporting a Vulnerability
If you discover a vulnerability, please create a private security advisory or contact the maintainers directly. Do not open a public issue for undisclosed security vulnerabilities.

---
_Last updated: 2025-08-21 (documentation delta including advanced controls)_

See `SECURITY_MATRIX.md` for a detailed pass/fail verification matrix mapping each control to code & tests.
