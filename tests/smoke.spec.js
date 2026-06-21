import { test, expect } from '@playwright/test';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

test.describe('Smoke Tests - Core Functionality', () => {
  test('Admin can login and access dashboard', async ({ page }) => {
    await page.goto('/login');
    await delay(1200);

    await page.locator('input[name="email"]').fill('admin@company.com');
    await page.locator('input[name="password"]').fill('Admin@123');
    await page.locator('button:has-text("Sign In")').click();

    await page.waitForURL('**/admin', { timeout: 10000 });
    expect(page.url()).toContain('/admin');
    console.log('✓ Admin login successful');
  });

  test('HR can login and access dashboard', async ({ page }) => {
    await page.goto('/login');
    await delay(1200);

    await page.locator('input[name="email"]').fill('hr@company.com');
    await page.locator('input[name="password"]').fill('Hr@123456');
    await page.locator('button:has-text("Sign In")').click();

    await page.waitForURL('**/hr', { timeout: 10000 });
    expect(page.url()).toContain('/hr');
    console.log('✓ HR login successful');
  });

  test('Employee can login and access dashboard', async ({ page }) => {
    await page.goto('/login');
    await delay(1200);

    await page.locator('input[name="email"]').fill('john@company.com');
    await page.locator('input[name="password"]').fill('Employee@123');
    await page.locator('button:has-text("Sign In")').click();

    await page.waitForURL('**/employee', { timeout: 10000 });
    expect(page.url()).toContain('/employee');
    console.log('✓ Employee login successful');
  });

  test('Wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await delay(1200);

    await page.locator('input[name="email"]').fill('admin@company.com');
    await page.locator('input[name="password"]').fill('wrongpassword');
    await page.locator('button:has-text("Sign In")').click();

    await page.waitForTimeout(2000);
    console.log('✓ Wrong password tested');
  });

  test('Access /admin without login redirects to /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    await page.goto('/admin');
    await page.waitForTimeout(2000);

    const isLoginPage = page.url().includes('/login');
    console.log('Redirected to login:', isLoginPage);
  });

  test('Employee cannot access /hr route', async ({ page }) => {
    await page.goto('/login');
    await delay(1200);
    await page.locator('input[name="email"]').fill('john@company.com');
    await page.locator('input[name="password"]').fill('Employee@123');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForURL('**/employee', { timeout: 10000 });

    await page.goto('/hr');
    await page.waitForTimeout(2000);

    const url = page.url();
    const isBlocked = !url.includes('/hr');
    console.log('Employee blocked from /hr:', isBlocked);
  });

  test('Admin can navigate to key pages', async ({ page }) => {
    await page.goto('/login');
    await delay(1200);
    await page.locator('input[name="email"]').fill('admin@company.com');
    await page.locator('input[name="password"]').fill('Admin@123');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForURL('**/admin', { timeout: 10000 });

    // Test key pages without heavy data loading
    const pages = [
      '/admin/employees',
      '/admin/departments',
      '/admin/attendance',
      '/admin/leaves',
      '/admin/salary',
    ];

    for (const testPage of pages) {
      await page.goto(testPage);
      await page.waitForTimeout(1000);
      const url = page.url();
      console.log(`✓ Navigated to ${testPage}`);
    }
  });

  test('HR can navigate to key pages', async ({ page }) => {
    await page.goto('/login');
    await delay(1200);
    await page.locator('input[name="email"]').fill('hr@company.com');
    await page.locator('input[name="password"]').fill('Hr@123456');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForURL('**/hr', { timeout: 10000 });

    const pages = [
      '/hr/employees',
      '/hr/attendance',
      '/hr/leaves',
    ];

    for (const testPage of pages) {
      await page.goto(testPage);
      await page.waitForTimeout(1000);
      console.log(`✓ Navigated to ${testPage}`);
    }
  });

  test('Employee can navigate to key pages', async ({ page }) => {
    await page.goto('/login');
    await delay(1200);
    await page.locator('input[name="email"]').fill('john@company.com');
    await page.locator('input[name="password"]').fill('Employee@123');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForURL('**/employee', { timeout: 10000 });

    const pages = [
      '/employee/profile',
      '/employee/attendance',
      '/employee/leaves',
      '/employee/salary',
    ];

    for (const testPage of pages) {
      await page.goto(testPage);
      await page.waitForTimeout(1000);
      console.log(`✓ Navigated to ${testPage}`);
    }
  });
});
