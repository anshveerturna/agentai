import { createServer } from 'http'
import next from 'next'
import fetch from 'node-fetch'

// NOTE: This spins up a minimal Next server to inspect headers. For large suites, consider supertest + custom handler.
// Timeboxed simple approach.

describe('Security Headers', () => {
  let server: any
  let address: string

  beforeAll(async () => {
    const app = next({ dev: false, dir: process.cwd() })
    await app.prepare()
    const handle = app.getRequestHandler()
    server = createServer((req, res) => handle(req, res))
    await new Promise<void>(resolve => server.listen(0, resolve))
    const port = (server.address() as any).port
    address = `http://127.0.0.1:${port}`
  }, 30000)

  afterAll(async () => {
    if (server) await new Promise(resolve => server.close(resolve))
  })

  it('includes critical security headers and hardened CSP', async () => {
    const res = await fetch(address + '/')
    expect(res.status).toBe(200)
    const csp = res.headers.get('content-security-policy')
    expect(csp).toBeTruthy()
    expect(csp).not.toMatch(/unsafe-inline/) // production CSP must exclude unsafe-inline
    expect(csp).toMatch(/default-src 'self'/)

    const hsts = res.headers.get('strict-transport-security')
    expect(hsts).toMatch(/max-age=63072000/)

    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('referrer-policy')).toBe('no-referrer')

    const permissions = res.headers.get('permissions-policy')
    expect(permissions).toMatch(/camera=\(\)/)
    expect(permissions).toMatch(/microphone=\(\)/)

    // Ensure no server tech leakage beyond allowed
    expect(res.headers.get('x-powered-by')).toBe('Next.js')
  })
})
