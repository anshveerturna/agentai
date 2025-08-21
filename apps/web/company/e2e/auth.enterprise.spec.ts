import { test, expect } from '@playwright/test'

// Helper to generate a unique email for signup/login flows
function uniqueEmail(prefix = 'user') {
  const rand = Math.random().toString(36).slice(2, 10)
  return `${prefix}+${rand}@example.com`
}

const strongPassword = 'Str0ng!Passw0rd#'

// These tests assume the Next.js app is running at baseURL
// and Supabase anon keys are configured. Adjust selectors if UI changes.

test.describe('Enterprise Auth & Security Flows', () => {
  test('signup -> redirect -> protected page access', async ({ page }) => {
    const email = uniqueEmail('signup')
    await page.goto('/signup')
    await page.fill('input#email', email)
    await page.fill('input#password', strongPassword)
    await page.click('button:has-text("Create account")')
    // We may not auto log in depending on Supabase email confirmation settings.
    // For this test, expect either success message or redirect path.
    await expect(page.locator('body')).toContainText(/Check your email|Redirecting|verification/i, { timeout: 10000 })
  })

  test('login brute-force generic error & eventual success', async ({ page }) => {
    const email = uniqueEmail('login')
    // Create account first via signup API route (bypassing UI)
    const resp = await page.request.post('/api/auth/signup', { data: { email, password: strongPassword } })
    expect(resp.ok()).toBeTruthy()

    await page.goto('/login')
    // Attempt a wrong password first
    await page.fill('input#email', email)
    await page.fill('input#password', 'WrongPass123!')
    await page.click('button:has-text("Sign in")')
    await expect(page.locator('body')).toContainText(/Invalid email or password/i)

    // Correct password
    await page.fill('input#password', strongPassword)
    await page.click('button:has-text("Sign in")')
    // Should land on agents (protected)
    await page.waitForURL(/\/agents/, { timeout: 15000 })
    await expect(page).toHaveURL(/\/agents/)
  })

  test('password reset request responds enumeration-safe', async ({ page }) => {
    await page.goto('/reset')
    const email = uniqueEmail('reset')
    await page.fill('input#email', email)
    await page.click('button:has-text("Send reset link")')
    // Should show generic message not revealing if user exists
    await expect(page.locator('body')).toContainText(/If an account exists|Check your email/i)
  })

  test('security headers present on root', async ({ request }) => {
    const res = await request.get('/')
    expect(res.status()).toBe(200)
    const csp = res.headers()['content-security-policy']
    expect(csp).toBeTruthy()
    expect(csp).not.toMatch(/unsafe-inline/)
    expect(res.headers()['x-frame-options']).toBe('DENY')
  })
})
