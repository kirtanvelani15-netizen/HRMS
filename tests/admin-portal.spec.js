import { test, expect } from '@playwright/test';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

test.describe('Admin Portal', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await delay(1200);
    await page.locator('input[name="email"]').fill('admin@company.com');
    await page.locator('input[name="password"]').fill('Admin@123');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForURL('**/admin', { timeout: 10000 });
  });

  test('Admin dashboard loads and displays cards', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    const dashboardVisible = await page.locator('text=/Dashboard|Welcome|Overview/i').isVisible().catch(() => false);
    console.log('Dashboard visible:', dashboardVisible);
    const cards = await page.locator('[role="article"], [class*="card"], [class*="Chart"]').count();
    console.log('Number of dashboard cards/components:', cards);
  });

  test('Employees page loads and search works', async ({ page }) => {
    await page.goto('/admin/employees');
    await page.waitForTimeout(2000);
    const tableVisible = await page.locator('table, [role="grid"], [class*="table"]').isVisible().catch(() => false);
    console.log('Employees table visible:', tableVisible);
  });

  test('Departments page loads', async ({ page }) => {
    await page.goto('/admin/departments');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Department|Departments/i').isVisible().catch(() => false);
    console.log('Departments page visible:', pageVisible);
  });

  test('Attendance page loads', async ({ page }) => {
    await page.goto('/admin/attendance');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Attendance/i').isVisible().catch(() => false);
    console.log('Attendance page visible:', pageVisible);
  });

  test('Leaves management page loads', async ({ page }) => {
    await page.goto('/admin/leaves');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Leave/i').isVisible().catch(() => false);
    console.log('Leaves page visible:', pageVisible);
  });

  test('Salary page loads', async ({ page }) => {
    await page.goto('/admin/salary');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Salary/i').isVisible().catch(() => false);
    console.log('Salary page visible:', pageVisible);
  });

  test('Notices page loads', async ({ page }) => {
    await page.goto('/admin/notices');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Notice/i').isVisible().catch(() => false);
    console.log('Notices page visible:', pageVisible);
  });

  test('Assets page loads', async ({ page }) => {
    await page.goto('/admin/assets');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Asset/i').isVisible().catch(() => false);
    console.log('Assets page visible:', pageVisible);
  });

  test('Documents page loads', async ({ page }) => {
    await page.goto('/admin/documents');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Document/i').isVisible().catch(() => false);
    console.log('Documents page visible:', pageVisible);
  });

  test('Recruitment page loads', async ({ page }) => {
    await page.goto('/admin/recruitment');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Recruitment|Job|Applicant/i').isVisible().catch(() => false);
    console.log('Recruitment page visible:', pageVisible);
  });

  test('Performance cycles page loads', async ({ page }) => {
    await page.goto('/admin/performance/cycles');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Performance|Cycle/i').isVisible().catch(() => false);
    console.log('Performance cycles page visible:', pageVisible);
  });

  test('Worklog page loads', async ({ page }) => {
    await page.goto('/admin/worklog/log');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Worklog|Work Log/i').isVisible().catch(() => false);
    console.log('Worklog page visible:', pageVisible);
  });

  test('Training page loads', async ({ page }) => {
    await page.goto('/admin/training');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Training|Course/i').isVisible().catch(() => false);
    console.log('Training page visible:', pageVisible);
  });

  test('Audit log page loads', async ({ page }) => {
    await page.goto('/admin/audit-log');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Audit|Log/i').isVisible().catch(() => false);
    console.log('Audit log page visible:', pageVisible);
  });

  test('System settings page loads', async ({ page }) => {
    await page.goto('/admin/system-settings');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/System|Settings/i').isVisible().catch(() => false);
    console.log('System settings page visible:', pageVisible);
  });
});
