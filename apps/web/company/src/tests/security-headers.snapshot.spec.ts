import { createServer, type Server } from 'http'
import next from 'next'
import fetch from 'node-fetch'

// Snapshot test to detect accidental header regressions.
// Run in CI; update snapshot intentionally when policy changes.

describe('Security Headers Snapshot', () => {
  let server: Server
  let address: string

  beforeAll(async () => {
    const app = next({ dev: false, dir: process.cwd() })
    await app.prepare()
    const handle = app.getRequestHandler()
    server = createServer((req, res) => handle(req, res))
    await new Promise<void>(resolve => server.listen(0, resolve))
  const addr = server.address()
  const port = typeof addr === 'object' && addr ? addr.port : 0
    address = `http://127.0.0.1:${port}`
  }, 30000)

  afterAll(async () => {
    if (server) await new Promise(resolve => server.close(resolve))
  })

  it('matches header snapshot', async () => {
    const res = await fetch(address + '/')
    const headers: Record<string, string> = {}
    res.headers.forEach((value, key) => { headers[key] = value })
    // Only snapshot the headers we care about (normalized lowercase keys)
    const subset: Record<string, string> = {}
    ;['content-security-policy','strict-transport-security','x-frame-options','x-content-type-options','referrer-policy','permissions-policy','x-powered-by'].forEach(k => {
      if (headers[k]) subset[k] = headers[k]
    })
    expect(subset).toMatchSnapshot('security-headers')
  })
})
