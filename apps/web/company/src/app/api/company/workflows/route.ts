import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

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

export async function GET(req: NextRequest) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL
    if (!apiBase) {
      console.error('Proxy Error: NEXT_PUBLIC_API_URL is not set.')
      return NextResponse.json({ error: 'API endpoint is not configured' }, { status: 500 })
    }

    const cookieStore = await cookies()
    const token = cookieStore.get('sb-access-token')?.value || req.cookies.get('sb-access-token')?.value || getCookieFromHeader(req, 'sb-access-token')
    const incomingAuth = req.headers.get('authorization')

    const proxyHeaders = new Headers()
    if (incomingAuth) {
      proxyHeaders.set('authorization', incomingAuth)
    } else if (token) {
      proxyHeaders.set('authorization', `Bearer ${token}`)
    }
    proxyHeaders.set('accept', 'application/json')
    proxyHeaders.set('content-type', 'application/json')

    if (!proxyHeaders.has('authorization')) {
      if (process.env.NODE_ENV !== 'production') {
        proxyHeaders.set('authorization', 'Bearer dev')
        proxyHeaders.set('x-company-id', 'dev-company')
        console.warn('Workflows proxy (DEV): injecting dummy Authorization for local testing')
      } else {
        console.warn('Workflows proxy: no Authorization present; token?', Boolean(token))
        return NextResponse.json({ error: 'Unauthorized', message: 'No session token present' }, { status: 401 })
      }
    }

    const res = await fetch(`${apiBase}/workflows`, {
      headers: proxyHeaders,
      credentials: 'include',
      next: { revalidate: 0 },
    })

    const responseText = await res.text()
    const responseHeaders = new Headers()
    responseHeaders.set('content-type', res.headers.get('content-type') || 'application/json')
    return new NextResponse(responseText, { status: res.status, headers: responseHeaders })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error(`Workflows proxy GET request failed: ${errorMessage}`)
    return NextResponse.json({ error: 'Proxy error', message: errorMessage }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL
    if (!apiBase) {
      console.error('Proxy Error: NEXT_PUBLIC_API_URL is not set.')
      return NextResponse.json({ error: 'API endpoint is not configured' }, { status: 500 })
    }

    const cookieStore = await cookies()
    const token = cookieStore.get('sb-access-token')?.value || req.cookies.get('sb-access-token')?.value || getCookieFromHeader(req, 'sb-access-token')
    const incomingAuth = req.headers.get('authorization')

    const proxyHeaders = new Headers()
    if (incomingAuth) {
      proxyHeaders.set('authorization', incomingAuth)
    } else if (token) {
      proxyHeaders.set('authorization', `Bearer ${token}`)
    }
    proxyHeaders.set('accept', 'application/json')
    proxyHeaders.set('content-type', 'application/json')

    if (!proxyHeaders.has('authorization')) {
      if (process.env.NODE_ENV !== 'production') {
        proxyHeaders.set('authorization', 'Bearer dev')
        proxyHeaders.set('x-company-id', 'dev-company')
        console.warn('Workflows proxy (DEV POST): injecting dummy Authorization for local testing')
      } else {
        console.warn('Workflows proxy (POST): no Authorization present; token?', Boolean(token))
        return NextResponse.json({ error: 'Unauthorized', message: 'No session token present' }, { status: 401 })
      }
    }

    const body = await req.text()
    const res = await fetch(`${apiBase}/workflows`, {
      method: 'POST',
      headers: proxyHeaders,
      body,
      credentials: 'include',
      next: { revalidate: 0 },
    })

    const responseText = await res.text()
    const responseHeaders = new Headers()
    responseHeaders.set('content-type', res.headers.get('content-type') || 'application/json')
    return new NextResponse(responseText, { status: res.status, headers: responseHeaders })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error(`Workflows proxy POST request failed: ${errorMessage}`)
    return NextResponse.json({ error: 'Proxy error', message: errorMessage }, { status: 500 })
  }
}
