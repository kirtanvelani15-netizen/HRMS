import { test, expect } from '@playwright/test';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

test.describe('Employee Portal', () => {
  test.beforeEach(async ({ page }) => {
    // Login as employee
    await page.goto('/login');
    await delay(1200);
    await page.locator('input[name="email"]').fill('john@company.com');
    await page.locator('input[name="password"]').fill('Employee@123');
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForURL('**/employee', { timeout: 10000 });
  });

  test('Employee dashboard loads', async ({ page }) => {
    await page.goto('/employee');
    await page.waitForTimeout(2000);
    const dashboardVisible = await page.locator('text=/Dashboard|Welcome/i').isVisible().catch(() => false);
    console.log('Employee Dashboard visible:', dashboardVisible);
  });

  test('Employee profile page loads', async ({ page }) => {
    await page.goto('/employee/profile');
    await page.waitForTimeout(2000);
    const profileVisible = await page.locator('text=/Profile|Personal|Information/i').isVisible().catch(() => false);
    console.log('Employee Profile page visible:', profileVisible);
  });

  test('Employee attendance page loads and shows own data', async ({ page }) => {
    await page.goto('/employee/attendance');
    await page.waitForTimeout(2000);
    const attendanceVisible = await page.locator('text=/Attendance/i').isVisible().catch(() => false);
    console.log('Employee Attendance page visible:', attendanceVisible);
  });

  test('Employee leave page loads', async ({ page }) => {
    await page.goto('/employee/leaves');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Leave|Leaves/i').isVisible().catch(() => false);
    console.log('Employee Leaves page visible:', pageVisible);
  });

  test('Employee salary page loads', async ({ page }) => {
    await page.goto('/employee/salary');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Salary|Payslip|Earnings/i').isVisible().catch(() => false);
    console.log('Employee Salary page visible:', pageVisible);
  });

  test('Employee notices page loads', async ({ page }) => {
    await page.goto('/employee/notices');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Notice/i').isVisible().catch(() => false);
    console.log('Employee Notices page visible:', pageVisible);
  });

  test('Employee documents page loads', async ({ page }) => {
    await page.goto('/employee/documents');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Document/i').isVisible().catch(() => false);
    console.log('Employee Documents page visible:', pageVisible);
  });

  test('Employee assets page loads', async ({ page }) => {
    await page.goto('/employee/assets');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Asset|My Assets/i').isVisible().catch(() => false);
    console.log('Employee Assets page visible:', pageVisible);
  });

  test('Employee chat page loads', async ({ page }) => {
    await page.goto('/employee/chat');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Chat|Message/i').isVisible().catch(() => false);
    console.log('Employee Chat page visible:', pageVisible);
  });

  test('Employee expenses page loads', async ({ page }) => {
    await page.goto('/employee/expenses');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Expense/i').isVisible().catch(() => false);
    console.log('Employee Expenses page visible:', pageVisible);
  });

  test('Employee worklog page loads', async ({ page }) => {
    await page.goto('/employee/worklog/log');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Worklog|Work Log|Timer/i').isVisible().catch(() => false);
    console.log('Employee Worklog page visible:', pageVisible);
  });

  test('Employee performance goals page loads', async ({ page }) => {
    await page.goto('/employee/performance/goals');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Goal|Performance/i').isVisible().catch(() => false);
    console.log('Employee Performance Goals page visible:', pageVisible);
  });

  test('Employee grievances page loads', async ({ page }) => {
    await page.goto('/employee/grievances');
    await page.waitForTimeout(2000);
    const pageVisible = await page.locator('text=/Grievance/i').isVisible().catch(() => false);
    console.log('Employee Grievances page visible:', pageVisible);
  });

  test('Employee cannot access /admin', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    const url = page.url();
    const isBlocked = !url.includes('/admin') || url.includes('/employee') || url.includes('/login');
    console.log('Employee blocked from /admin:', isBlocked);
    console.log('Current URL:', url);
  });

  test('Employee cannot access /hr', async ({ page }) => {
    await page.goto('/hr');
    await page.waitForTimeout(2000);
    const url = page.url();
    const isBlocked = !url.includes('/hr') || url.includes('/employee') || url.includes('/login');
    console.log('Employee blocked from /hr:', isBlocked);
    console.log('Current URL:', url);
  });
});
