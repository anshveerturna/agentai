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
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
    const supabase = getClient()
    const redirectTo = new URL('/reset', req.url).toString()
    const { error } = await supabase.auth.resetPasswordForEmail(String(email).trim(), { redirectTo })
    // Uniform response regardless of account existence to prevent enumeration
    if (error) {
      return NextResponse.json({ message: 'If that email exists, a reset link was sent.' })
    }
    return NextResponse.json({ message: 'If that email exists, a reset link was sent.' })
  } catch {
    return NextResponse.json({ message: 'If that email exists, a reset link was sent.' })
  }
}
