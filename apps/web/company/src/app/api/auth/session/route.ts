import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type SessionBody = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !anonKey) return NextResponse.json({ success: false }, { status: 500 })
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
    // Expect access and refresh tokens in body when called from the client after OAuth
  const { access_token, refresh_token, expires_in } = (await req.json().catch(() => ({} as SessionBody))) as SessionBody
    if (!access_token) return NextResponse.json({ success: false }, { status: 400 })
    const res = NextResponse.json({ success: true })
    const isProd = process.env.NODE_ENV === 'production'
    res.cookies.set('sb-access-token', access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: expires_in ?? 60 * 60,
    })
    if (refresh_token) {
      res.cookies.set('sb-refresh-token', refresh_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 14,
      })
    }
    return res
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
