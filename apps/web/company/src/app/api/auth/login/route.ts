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

function genericAuthError(status = 400, message?: string) {
  const isDev = process.env.NODE_ENV !== 'production'
  return NextResponse.json(
    { success: false, message: message || 'Invalid email or password.' },
    { status }
  )
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
    const isDev = process.env.NODE_ENV !== 'production'
    if (!supabaseUrl || !anonKey) {
      console.error('[auth/login] Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
      return NextResponse.json({ success: false, message: 'Auth not configured.' }, { status: 500 })
    }
    if (isDev && (supabaseUrl.includes('YOUR_PROJECT_REF') || anonKey.includes('YOUR_SUPABASE_ANON_KEY'))) {
      console.error('[auth/login] Placeholder Supabase env values detected. Update .env.local with real project ref and anon key.')
      return NextResponse.json({ success: false, message: 'Supabase environment variables are placeholders. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/company/.env.local and restart dev server.' }, { status: 500 })
    }
    const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
    const { data, error } = await client.auth.signInWithPassword({ email: normEmail, password })
    if (error || !data?.session) {
      if (error) {
        // Log server-side for debugging
        console.error('[auth/login] signInWithPassword error:', { message: error.message, name: (error as any)?.name, status: (error as any)?.status })
        // Provide specific messaging for common cases
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          return NextResponse.json({ success: false, message: 'Please confirm your email before signing in.' }, { status: 400 })
        }
        if ((error as any)?.status === 429 || error.message?.toLowerCase().includes('too many')) {
          const updated = recordFailure(key)
          if (updated.lockUntil && Date.now() < updated.lockUntil) {
            return NextResponse.json({ success: false, message: 'Too many attempts. Please wait and try again later.' }, { status: 429 })
          }
        }
        if (isDev) {
          // In development, return the underlying Supabase error message for easier debugging
          return NextResponse.json({ success: false, message: error.message || 'Authentication failed.' }, { status: 400 })
        }
      }
      if (!error && isDev) {
        console.error('[auth/login] No session and no error returned by Supabase. Possible misconfiguration or email confirmation required.')
        return NextResponse.json({ success: false, message: 'Authentication failed: no session returned. Check Supabase project URL/key and user confirmation status.' }, { status: 400 })
      }
      const updated = recordFailure(key)
      if (updated.lockUntil && Date.now() < updated.lockUntil) {
        return NextResponse.json({ success: false, message: 'Too many attempts. Please wait and try again later.' }, { status: 429 })
      }
      return genericAuthError(400)
    }
    recordSuccess(key)
    const { access_token, refresh_token, expires_in, token_type, user } = data.session
    const res = NextResponse.json({ success: true, access_token, refresh_token, expires_in, token_type, user: { id: user.id, email: user.email } })
    // Set HttpOnly cookies so middleware can read tokens (localStorage is not visible at the edge)
    try {
      const isProd = process.env.NODE_ENV === 'production'
      res.cookies.set('sb-access-token', access_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: expires_in ?? 60 * 60, // default 1h
      })
      if (refresh_token) {
        res.cookies.set('sb-refresh-token', refresh_token, {
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 14, // 14 days
        })
      }
    } catch {
      // If cookie set fails, still return JSON; client-side session will work but middleware redirects may occur
    }
    return res
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
