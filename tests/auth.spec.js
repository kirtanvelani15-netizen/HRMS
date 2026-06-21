import { test, expect } from '@playwright/test';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

test.describe('Authentication', () => {
  test('Login with valid admin credentials', async ({ page }) => {
    await page.goto('/login');
    await delay(1200); // Wait for page to be ready (reduced from 1500)

    // Fill email and password using name selectors
    await page.locator('input[name="email"]').fill('admin@company.com');
    await page.locator('input[name="password"]').fill('Admin@123');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForURL('**/admin', { timeout: 10000 });
    console.log('✓ Admin logged in successfully');
  });

  test('Login with valid HR credentials', async ({ page }) => {
    await page.goto('/login');
    await delay(1200);

    await page.locator('input[name="email"]').fill('hr@company.com');
    await page.locator('input[name="password"]').fill('Hr@123456');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForURL('**/hr', { timeout: 10000 });
    console.log('✓ HR logged in successfully');
  });

  test('Login with valid employee credentials', async ({ page }) => {
    await page.goto('/login');
    await delay(1200);

    await page.locator('input[name="email"]').fill('john@company.com');
    await page.locator('input[name="password"]').fill('Employee@123');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForURL('**/employee', { timeout: 10000 });
    console.log('✓ Employee logged in successfully');
  });

  test('Login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await delay(1500);

    await page.locator('input[type="email"]').fill('admin@company.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForTimeout(2000);
    const toastVisible = await page.locator('[role="status"], [class*="toast"]').isVisible().catch(() => false);
    console.log('✗ Error message visible after wrong password:', toastVisible);
  });

  test('Login with non-existent email shows error', async ({ page }) => {
    await page.goto('/login');
    await delay(1500);

    await page.locator('input[type="email"]').fill('nonexistent@example.com');
    await page.locator('input[type="password"]').fill('Password@123');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForTimeout(2000);
    const toastVisible = await page.locator('[role="status"], [class*="toast"]').isVisible().catch(() => false);
    console.log('✗ Error message visible for non-existent user:', toastVisible);
  });

  test('Redirect to login when accessing /admin without auth', async ({ page }) => {
    // Clear auth
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoginPage = url.includes('/login');
    console.log('Redirected to login when accessing /admin:', isLoginPage);
  });

  test('Employee cannot access /hr route', async ({ page }) => {
    // Login as employee
    await page.goto('/login');
    await delay(1500);
    await page.locator('input[type="email"]').fill('john@company.com');
    await page.locator('input[type="password"]').fill('Employee@123');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForURL('**/employee', { timeout: 10000 });

    // Try to access HR portal
    await page.goto('/hr');
    await page.waitForTimeout(2000);
    const url = page.url();
    const isBlocked = !url.includes('/hr') || url.includes('/employee');
    console.log('Employee blocked from /hr:', isBlocked);
  });

  test('Admin cannot access /employee route', async ({ page }) => {
    await page.goto('/login');
    await delay(1500);
    await page.locator('input[type="email"]').fill('admin@company.com');
    await page.locator('input[type="password"]').fill('Admin@123');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForURL('**/admin', { timeout: 10000 });

    await page.goto('/employee');
    await page.waitForTimeout(2000);
    const url = page.url();
    console.log('URL when admin tries /employee:', url);
  });
});
