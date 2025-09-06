import { NextResponse, type NextRequest } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton pattern so middleware import does not throw when env vars absent in local dev.
let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    // In middleware context we should not crash: throw a clearer error for logs.
    throw new Error('Supabase environment variables missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  _supabase = createClient(url, anon)
  return _supabase
}

// Example (uncomment if you add middleware logic):
// export async function middleware(req: NextRequest) {
//   const supabase = getSupabase()
//   // ... your auth / session logic
// }

// Public route prefixes (exact or descendants). Everything else (except API + static) requires auth.
const PUBLIC_PREFIXES = ['/login', '/signup', '/reset', '/auth/callback', '/_next', '/public', '/favicon.ico']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // Allow public prefixes
  if (PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next()
  // Allow API (own auth) & Next static
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) return NextResponse.next()
  if (pathname === '/favicon.ico') return NextResponse.next()
  // All other routes are protected (includes '/agents', '/', etc.)

  try {
    const authHeader = req.headers.get('authorization')
    // Use cookie-based session if available; supabase-js on edge currently limited, fallback: rely on client redirect if fails.
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.cookies.get('sb-access-token')?.value || req.cookies.get('sb:token')?.value

  if (!token) return redirectToLogin(req)

    // Lightweight verification: decode payload (no signature validation at edge here) to check expiry.
    const [, payloadB64] = token.split('.')
    if (!payloadB64) return redirectToLogin(req)
    try {
      const payloadJson = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'))
      if (payloadJson.exp && Date.now() / 1000 > payloadJson.exp) {
        return redirectToLogin(req)
      }
    } catch {
      return redirectToLogin(req)
    }
  const res = NextResponse.next()
  res.headers.set('x-auth-middleware', 'allow')
  return res
  } catch {
    return redirectToLogin(req)
  }
}

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.redirect(loginUrl)
}

// Guard most routes except Next.js internals and API; adjust as needed
export const config = {
  matcher: ['/((?!_next/image|_next/static|favicon.ico).*)']
}

