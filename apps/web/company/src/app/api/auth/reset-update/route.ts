import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function passwordPolicyErrors(pw: string): string[] {
  const errors: string[] = []
  if (pw.length < 12) errors.push('at least 12 characters')
  if (!/[A-Z]/.test(pw)) errors.push('one uppercase letter')
  if (!/[a-z]/.test(pw)) errors.push('one lowercase letter')
  if (!/[0-9]/.test(pw)) errors.push('one digit')
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push('one symbol')
  return errors
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Supabase env missing')
  return createClient(url, anon)
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 })
    const errs = passwordPolicyErrors(password)
    if (errs.length) return NextResponse.json({ error: 'Password must include ' + errs.join(', ') }, { status: 400 })
    const supabase = getClient()
    // Updating password uses authenticated session (link from email should create a session)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return NextResponse.json({ error: 'Reset failed' }, { status: 400 })
    return NextResponse.json({ message: 'Password updated' })
  } catch {
    return NextResponse.json({ error: 'Reset failed' }, { status: 400 })
  }
}
