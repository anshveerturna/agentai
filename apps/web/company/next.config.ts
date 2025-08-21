import type { NextConfig } from 'next';

// Build a CSP that excludes 'unsafe-inline' in production.
// Supabase origin is dynamically injected for API / realtime calls.
function buildCSP() {
  const dev = process.env.NODE_ENV !== 'production'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let supabaseOrigin: string | undefined
  try { if (supabaseUrl) supabaseOrigin = new URL(supabaseUrl).origin } catch {}

  const connectSources = ["'self'"]
  if (supabaseOrigin) {
    connectSources.push(supabaseOrigin)
    // Allow websocket as well (Supabase realtime)
    try { const u = new URL(supabaseOrigin); connectSources.push(`wss://${u.host}`) } catch {}
  }

  const scriptSrc = dev
    ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Needed for Next.js HMR in dev
    : ["'self'"]
  const styleSrc = dev
    ? ["'self'", "'unsafe-inline'"] // Tailwind JIT & dev style injection ok in dev
    : ["'self'"]

  const cspDirectives = [
    `default-src 'self'`,
    `script-src ${scriptSrc.join(' ')}`,
    `style-src ${styleSrc.join(' ')}`,
    `img-src 'self' data: https:`,
    `connect-src ${connectSources.join(' ')}`,
    `font-src 'self' data:`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`
  ]
  return cspDirectives.join('; ')
}

const csp = buildCSP();

const securityHeaders = [
  // Enforce HTTPS (enable preload after verifying HSTS works & subdomains covered)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Mitigate XSS
  { key: 'X-XSS-Protection', value: '0' }, // modern browsers rely on CSP
  // Prevent MIME sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Clickjacking protection
  { key: 'X-Frame-Options', value: 'DENY' },
  // Referrer policy
  { key: 'Referrer-Policy', value: 'no-referrer' },
  // Permissions policy (tight baseline - adjust if APIs needed)
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // Content security policy
  { key: 'Content-Security-Policy', value: csp },
  // Remove tech details
  { key: 'X-Powered-By', value: 'Next.js' }
];

const nextConfig: NextConfig = {
  // Limit body size for edge/serverless functions (where supported) via experimental config or custom middleware.
  experimental: {
    serverActions: { bodySizeLimit: parseInt(process.env.NEXT_API_BODY_LIMIT_MB || '1') * 1024 * 1024 }
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
