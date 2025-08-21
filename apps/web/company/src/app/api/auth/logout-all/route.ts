import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Supabase env missing')
  return createClient(url, anon)
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies.get('sb-access-token')?.value
    if (!token) return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })

    // TODO (enterprise): Implement true global revocation by storing a session_version in user metadata
    // and incrementing it here using the Supabase service role key (SUPABASE_SERVICE_ROLE_KEY) via admin API.
    // Middleware / API guard would then reject tokens whose embedded user_metadata.session_version is older.
    // Current implementation simply instructs clients to clear local sessions.

    return NextResponse.json({ success: true, message: 'Global logout processed (local sessions should be cleared).', actionable: false })
  } catch (e) {
    return NextResponse.json({ success: false, message: 'Logout failed' }, { status: 500 })
  }
}

export function GET() { return NextResponse.json({ success: false, message: 'Method not allowed' }, { status: 405 }) }
