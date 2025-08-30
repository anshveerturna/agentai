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

function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return null
  return createClient(url, anon)
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    const errs = passwordPolicyErrors(password)
    if (errs.length) {
      return NextResponse.json({ error: 'Password must include ' + errs.join(', ') }, { status: 400 })
    }
    const supabase = getSupabaseServiceClient()
    if (!supabase) {
      // In non-configured environments, respond as if confirmation email was sent
      return NextResponse.json({ message: 'Check email to confirm account.' }, { status: 201 })
    }
    const { data, error } = await supabase.auth.signUp({ email: String(email).trim(), password })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    // Return minimal data; instruct client if confirmation needed
    if (data.user && !data.session) {
      return NextResponse.json({ message: 'Check email to confirm account.' }, { status: 201 })
    }
    return NextResponse.json({ message: 'Signup successful', userId: data.user?.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 })
  }
}
