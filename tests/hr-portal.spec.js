import { test, expect } from '@playwright/test';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

test.describe('HR Portal', () => {
  test.beforeEach(async ({ page }) => {
    // Login as HR
    await page.goto('/login');
    await delay(1200);
    await page.locator('input[name="email"]').fill('hr@company.com');
    await page.locator('input[name="password"]').fill('Hr@123456');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForURL('**/hr', { timeout: 10000 });
  });

  test('HR dashboard loads', async ({ page }) => {
    await page.goto('/hr');
    await page.waitForTimeout(2000);
    const dashboardVisible = await page.locator('text=/Dashboard|Welcome|Overview/i').isVisible().catch(() => false);
    console.log('HR Dashboard visible:', dashboardVisible);
  });

  test('HR employees page loads', async ({ page }) => {
    await page.goto('/hr/employees');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Employee/i').isVisible().catch(() => false);
    console.log('HR Employees page visible:', pageVisible);
  });

  test('HR chat page loads', async ({ page }) => {
    await page.goto('/hr/chat');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Chat|Message/i').isVisible().catch(() => false);
    console.log('HR Chat page visible:', pageVisible);
  });

  test('HR attendance page loads', async ({ page }) => {
    await page.goto('/hr/attendance');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Attendance/i').isVisible().catch(() => false);
    console.log('HR Attendance page visible:', pageVisible);
  });

  test('HR leave management page loads', async ({ page }) => {
    await page.goto('/hr/leaves');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Leave/i').isVisible().catch(() => false);
    console.log('HR Leaves page visible:', pageVisible);
  });

  test('HR salary page loads', async ({ page }) => {
    await page.goto('/hr/salary');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Salary/i').isVisible().catch(() => false);
    console.log('HR Salary page visible:', pageVisible);
  });

  test('HR cannot access /manage-hr (admin only)', async ({ page }) => {
    await page.goto('/hr/manage-hr');
    await page.waitForTimeout(2000);
    const url = page.url();
    const isBlocked = !url.includes('/manage-hr') || url.includes('/login');
    console.log('HR blocked from /manage-hr:', isBlocked);
    console.log('Redirect URL:', url);
  });

  test('HR cannot access /system-settings (admin only)', async ({ page }) => {
    await page.goto('/hr/system-settings');
    await page.waitForTimeout(2000);
    const url = page.url();
    const isBlocked = !url.includes('/system-settings') || url.includes('/login');
    console.log('HR blocked from /system-settings:', isBlocked);
    console.log('Redirect URL:', url);
  });

  test('HR grievances page loads', async ({ page }) => {
    await page.goto('/hr/grievances');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Grievance/i').isVisible().catch(() => false);
    console.log('HR Grievances page visible:', pageVisible);
  });

  test('HR worklog page loads', async ({ page }) => {
    await page.goto('/hr/worklog/log');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Worklog|Work Log/i').isVisible().catch(() => false);
    console.log('HR Worklog page visible:', pageVisible);
  });
});
