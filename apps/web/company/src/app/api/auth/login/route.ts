import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Simple in-memory attempt tracker (NOTE: replace with Redis or durable KV in production for multi-instance)
type AttemptRecord = { count: number; first: number; last: number; lockUntil?: number }
const attempts = new Map<string, AttemptRecord>() // key = `${ip}|${email}`

// Configuration constants
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const HARD_LOCK_THRESHOLD = 10 // consecutive failures inside window
const HARD_LOCK_MS = 15 * 60 * 1000 // 15 min lockout
const BASE_DELAY_MS = 200
const MAX_DELAY_MS = 3000

function getClientIp(headers: Headers) {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return headers.get('x-real-ip') || '0.0.0.0'
}

function recordFailure(key: string) {
  const now = Date.now()
  const rec = attempts.get(key)
  if (!rec) {
    const created: AttemptRecord = { count: 1, first: now, last: now }
    attempts.set(key, created)
    return created
  }
  if (now - rec.first > WINDOW_MS) {
    rec.count = 1
    rec.first = now
    rec.lockUntil = undefined
  } else {
    rec.count += 1
  }
  rec.last = now
  if (rec.count >= HARD_LOCK_THRESHOLD && !rec.lockUntil) {
    rec.lockUntil = now + HARD_LOCK_MS
  }
  return rec
}

function recordSuccess(key: string) { attempts.delete(key) }

function computeDelayMs(rec?: AttemptRecord) {
  if (!rec) return BASE_DELAY_MS
  const dynamic = rec.count * rec.count * 50 // quadratic growth
  return Math.min(BASE_DELAY_MS + dynamic, MAX_DELAY_MS)
}

function genericAuthError(status = 400) {
  return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status })
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json().catch(() => ({ email: undefined, password: undefined }))
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return genericAuthError(400)
    }
    const normEmail = email.trim().toLowerCase()
    const ip = getClientIp(req.headers)
    const key = `${ip}|${normEmail}`
    const rec = attempts.get(key)
    if (rec?.lockUntil && Date.now() < rec.lockUntil) {
      return NextResponse.json({ success: false, message: 'Too many attempts. Please wait and try again later.' }, { status: 429 })
    }
    const delayMs = computeDelayMs(rec)
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs))
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !anonKey) return genericAuthError(500)
    const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
    const { data, error } = await client.auth.signInWithPassword({ email: normEmail, password })
    if (error || !data?.session) {
      const updated = recordFailure(key)
      if (updated.lockUntil && Date.now() < updated.lockUntil) {
        return NextResponse.json({ success: false, message: 'Too many attempts. Please wait and try again later.' }, { status: 429 })
      }
      return genericAuthError(400)
    }
    recordSuccess(key)
    const { access_token, refresh_token, expires_in, token_type, user } = data.session
    return NextResponse.json({ success: true, access_token, refresh_token, expires_in, token_type, user: { id: user.id, email: user.email } })
  } catch {
    return genericAuthError(400)
  } finally {
    if (Math.random() < 0.01) { // opportunistic GC
      const now = Date.now()
      for (const [k, rec] of attempts) {
        if (now - rec.first > WINDOW_MS && (!rec.lockUntil || now > rec.lockUntil)) attempts.delete(k)
      }
    }
  }
}

export const dynamic = 'force-dynamic'
