import { test, expect } from '@playwright/test';

test.describe('Agents Loading', () => {
  test('should load agents page after login', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Fill in login form (adjust selectors based on your actual form)
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    
    // Submit login form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to agents page
    await page.waitForURL('/agents');
    
    // Wait for agents data to load
    await page.waitForSelector('[data-testid="agent-table"], [data-testid="agent-list"]', { timeout: 10000 });
    
    // Check for successful API call
    const agentsResponse = await page.waitForResponse(
      response => response.url().includes('/agents') && response.status() === 200,
      { timeout: 10000 }
    );
    
    expect(agentsResponse.status()).toBe(200);
    
    // Verify at least one agent row is visible (adjust selector as needed)
    const agentRows = await page.locator('tr[data-testid="agent-row"], [data-testid="agent-item"]');
    await expect(agentRows.first()).toBeVisible();
    
    // Verify no error messages
    await expect(page.locator('text=Failed to fetch agents')).not.toBeVisible();
    await expect(page.locator('text=Missing bearer token')).not.toBeVisible();
  });
  
  test('should redirect to login when not authenticated', async ({ page }) => {
    // Navigate directly to agents page without login
    await page.goto('/agents');
    
    // Should be redirected to login page
    await page.waitForURL('/login');
    
    // Verify login form is visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
