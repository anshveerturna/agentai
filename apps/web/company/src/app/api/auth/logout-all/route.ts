import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })

    // TODO (enterprise): Implement true global revocation by storing a session_version in user metadata
    // and incrementing it here using the Supabase service role key (SUPABASE_SERVICE_ROLE_KEY) via admin API.
    // Middleware / API guard would then reject tokens whose embedded user_metadata.session_version is older.
    // Current implementation simply instructs clients to clear local sessions.
  const res = NextResponse.json({ success: true, message: 'Global logout processed (local sessions should be cleared).', actionable: false })
  // Clear HttpOnly cookies used by middleware
  const isProd = process.env.NODE_ENV === 'production'
  res.cookies.set('sb-access-token', '', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 })
  res.cookies.set('sb-refresh-token', '', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 })
  return res
  } catch {
    return NextResponse.json({ success: false, message: 'Logout failed' }, { status: 500 })
  }
}

export function GET() { return NextResponse.json({ success: false, message: 'Method not allowed' }, { status: 405 }) }
