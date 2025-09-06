import { test, expect } from '@playwright/test';

test.describe('Agents Loading', () => {
  test('should load agents page after login', async ({ page }, testInfo) => {
    // Use env vars so test can be enabled only in environments with seeded user.
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (!email || !password) {
      testInfo.skip(true, 'E2E_USER_EMAIL / E2E_USER_PASSWORD not set');
    }

    await page.goto('/login');
    await page.fill('input[type="email"]', email!);
    await page.fill('input[type="password"]', password!);
    await page.click('button[type="submit"]');

    // Accept optional query params on redirect (e.g. /agents?foo=bar)
    await page.waitForURL(url => url.pathname === '/agents', { timeout: 15000 });

    // Wait for any agent table row (our table has <tbody> rows without data-testid)
    // or grid cards (.grid > div[data-pseudo]) fallback after data fetch.
    await page.waitForSelector('table tbody tr, .grid > div', { timeout: 15000 });

    // Network assertion: first successful /api/company/agents call
    const agentsResponse = await page.waitForResponse(r => /\/api\/company\/agents$/.test(r.url()) && r.status() === 200, { timeout: 15000 });
    expect(agentsResponse.status()).toBe(200);

    // Ensure at least one row visible (table view) OR one card in grid
    const anyRow = page.locator('table tbody tr').first();
    if (await anyRow.count()) {
      await expect(anyRow).toBeVisible();
    } else {
      const anyCard = page.locator('.grid > div').first();
      await expect(anyCard).toBeVisible();
    }
  });
  
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForURL(url => url.pathname === '/login', { timeout: 15000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
