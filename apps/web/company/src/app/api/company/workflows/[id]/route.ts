import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getCookieFromHeader(req: NextRequest, name: string): string | undefined {
  const raw = req.headers.get('cookie')
  if (!raw) return undefined
  const parts = raw.split(/;\s*/)
  for (const p of parts) {
    const [k, ...rest] = p.split('=')
    if (decodeURIComponent(k) === name) return rest.join('=')
  }
  return undefined
}

async function buildAuthHeaders(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value || req.cookies.get('sb-access-token')?.value || getCookieFromHeader(req, 'sb-access-token')
  const incomingAuth = req.headers.get('authorization')
  const headers = new Headers()
  if (incomingAuth) headers.set('authorization', incomingAuth)
  else if (token) headers.set('authorization', `Bearer ${token}`)
  headers.set('accept', 'application/json')
  headers.set('content-type', 'application/json')
  if (!headers.has('authorization')) {
    if (process.env.NODE_ENV !== 'production') {
      headers.set('authorization', 'Bearer dev')
      headers.set('x-company-id', 'dev-company')
      console.warn('Workflow item proxy (DEV): injecting dummy Authorization')
    } else {
      throw new Error('Unauthorized')
    }
  }
  return headers
}

export async function GET(req: NextRequest, ctx: any) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL
    if (!apiBase) return NextResponse.json({ error: 'API endpoint not configured' }, { status: 500 })
    const headers = await buildAuthHeaders(req)
  const { id } = await ctx.params
    const res = await fetch(`${apiBase}/workflows/${id}`, { headers, credentials: 'include', cache: 'no-store' })
    const text = await res.text()
    return new NextResponse(text, { status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const code = msg === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: 'Proxy error', message: msg }, { status: code })
  }
}

export async function PUT(req: NextRequest, ctx: any) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL
    if (!apiBase) return NextResponse.json({ error: 'API endpoint not configured' }, { status: 500 })
    const headers = await buildAuthHeaders(req)
    const body = await req.text()
  const { id } = await ctx.params
    const res = await fetch(`${apiBase}/workflows/${id}`, { method: 'PUT', headers, body, credentials: 'include', cache: 'no-store' })
    const text = await res.text()
    return new NextResponse(text, { status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const code = msg === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: 'Proxy error', message: msg }, { status: code })
  }
}
