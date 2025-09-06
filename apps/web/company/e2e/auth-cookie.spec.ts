import { test, expect } from '@playwright/test'

// Generate a minimal unsigned JWT-like token with future expiration
function fakeJwt() {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ sub: 'test-user', email: 'test@example.com', exp: Math.floor(Date.now()/1000) + 60 * 10 })).toString('base64url')
  return `${header}.${payload}.` // no signature needed for our lightweight decoding check
}

test.describe('Auth via cookie', () => {
  test('allows accessing /agents with valid cookie', async ({ page }) => {
    // Set cookie before navigation
    await page.context().addCookies([
      {
        name: 'sb-access-token',
        value: fakeJwt(),
        path: '/',
        domain: 'localhost',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax'
      }
    ])

    await page.goto('/agents')
    // Should not be redirected to /login
    await expect(page).toHaveURL(/\/agents$/)

    // Expect either agents table rows, grid cards, or an error banner (any indicates page rendered)
    const appeared = await Promise.race([
      page.waitForSelector('table tbody tr', { timeout: 10000 }).then(() => 'table'),
      page.waitForSelector('.grid > div', { timeout: 10000 }).then(() => 'grid'),
      page.waitForSelector('text=Error loading agents', { timeout: 10000 }).then(() => 'error')
    ]).catch(() => 'none')
    expect(appeared).not.toBe('none')

    // Sanity: middleware header on some resource fetch (optional) – can't assert easily cross-origin
  })
})
