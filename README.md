# agentai

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.19. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Security Hardening Summary

Key security measures have been implemented across the stack:

- Helmet on Nest API with CSP & hardened headers
- Next.js global security headers (CSP, HSTS, frame/permissions/referrer policies)
- Rate limiting (global + auth bucket)
- Structured JSON logging with correlation IDs & user context
- Global exception filter (sanitized responses, enriched logs)
- Password complexity (client + server validation >=12 chars, upper/lower/digit/symbol)
- Server signup route enforcing policy before calling Supabase
- SSR middleware protecting `/agents` routes with redirect and token expiry check
- RLS on agents table (user scoping) & JWT guard on API routes
- Hardened login proxy with brute-force backoff & uniform errors
- Password reset (enumeration-safe) & invite flows
- Global logout endpoint (token-version revocation planned)
- Pino logger with sensitive field redaction
- Request timeout + lightweight circuit breaker & body size limits
- Proactive session refresh utility (focus + near-expiry refresh)
- Security header presence & snapshot Jest tests
- Playwright E2E suite (auth & security regression coverage)

See `SECURITY.md` for full details, file references, and recommended next steps.

## Workflow Builder

The project previously had two builder implementations:

- Legacy: `apps/web/company/src/components/flows/**` (custom canvas)
- Current: `apps/web/company/src/components/workflows/**` (XYFlow-based)

The legacy `components/flows` implementation has been removed to reduce clutter and avoid confusion. All flow/editor work should happen under `components/workflows`. App routes under `/flows` now redirect to `/workflows`.
