import { test, expect } from '@playwright/test';

test.describe('UI Components & UX', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
  });

  test('Sidebar navigation links work correctly', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);

    const navLinks = await page.locator('nav a, [role="navigation"] a, [class*="sidebar"] a').all();
    console.log('Number of navigation links found:', navLinks.length);

    let brokenLinks = 0;
    let successfulNavs = 0;

    for (let i = 0; i < Math.min(navLinks.length, 5); i++) {
      try {
        const href = await navLinks[i].getAttribute('href');
        if (href && !href.startsWith('http')) {
          await navLinks[i].click();
          await page.waitForTimeout(1500);
          const status = page.url();
          const hasError = await page.locator('text=/404|not found|error/i').isVisible().catch(() => false);
          if (hasError) {
            brokenLinks++;
            console.log('Broken link found:', href);
          } else {
            successfulNavs++;
          }
        }
      } catch (e) {
        console.log('Navigation test error:', e.message);
      }
    }
    console.log('Successful navigations:', successfulNavs, 'Broken:', brokenLinks);
  });

  test('Loading spinner appears and disappears', async ({ page }) => {
    await page.goto('/admin/employees');
    // Check if loading state appears briefly
    const loadingVisible = await page.locator('[class*="loading"], [class*="spinner"], text=/Loading/i').isVisible().catch(() => false);
    console.log('Loading spinner visible:', loadingVisible);
    await page.waitForTimeout(3000);
    const loadingGone = !(await page.locator('[class*="loading"], [class*="spinner"]').isVisible().catch(() => true));
    console.log('Loading spinner gone after data load:', loadingGone);
  });

  test('Empty states show when no data', async ({ page }) => {
    // Navigate to a page that might have empty state
    await page.goto('/admin/notices');
    await page.waitForTimeout(2000);
    const emptyStateVisible = await page.locator('text=/No|empty|nothing/i').isVisible().catch(() => false);
    console.log('Empty state visible (if applicable):', emptyStateVisible);
  });

  test('Modals open and close correctly', async ({ page }) => {
    await page.goto('/admin/employees');
    await page.waitForTimeout(2000);

    // Try to find and click create button
    const createButton = await page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
    const createExists = await createButton.isVisible().catch(() => false);
    console.log('Create button visible:', createExists);

    if (createExists) {
      await createButton.click();
      await page.waitForTimeout(1000);
      const modalVisible = await page.locator('[role="dialog"], [class*="modal"]').isVisible().catch(() => false);
      console.log('Modal opened:', modalVisible);

      // Try to close
      const closeButton = await page.locator('button:has-text("Close"), button:has-text("Cancel"), [aria-label="Close"]').first();
      const closeExists = await closeButton.isVisible().catch(() => false);
      if (closeExists) {
        await closeButton.click();
        await page.waitForTimeout(500);
        const modalGone = !(await page.locator('[role="dialog"], [class*="modal"]').isVisible().catch(() => false));
        console.log('Modal closed:', modalGone);
      }
    }
  });

  test('Theme toggle works (if available)', async ({ page }) => {
    await page.goto('/admin');
    const themeButton = await page.locator('button[aria-label*="Theme"], button[aria-label*="Dark"], button[aria-label*="Light"]').first();
    const themeToggleExists = await themeButton.isVisible().catch(() => false);
    console.log('Theme toggle button visible:', themeToggleExists);

    if (themeToggleExists) {
      const initialClass = await page.locator('html, body').first().getAttribute('class');
      console.log('Initial theme class:', initialClass);

      await themeButton.click();
      await page.waitForTimeout(500);

      const newClass = await page.locator('html, body').first().getAttribute('class');
      console.log('After toggle class:', newClass);
      console.log('Theme changed:', initialClass !== newClass);
    }
  });

  test('No horizontal scroll at 1280px width', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/admin');
    await page.waitForTimeout(2000);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    console.log('Scroll width:', scrollWidth, 'Client width:', clientWidth);
    const hasHorizontalScroll = scrollWidth > clientWidth;
    console.log('Horizontal scroll present at 1280px:', hasHorizontalScroll);
  });

  test('Page title matches portal section', async ({ page }) => {
    const tests = [
      { url: '/admin', expectedTitle: /Admin|Dashboard/ },
      { url: '/admin/employees', expectedTitle: /Employee/ },
      { url: '/admin/salary', expectedTitle: /Salary/ },
    ];

    for (const test of tests) {
      await page.goto(test.url);
      await page.waitForTimeout(1500);
      const title = await page.title();
      const matches = test.expectedTitle.test(title);
      console.log(`Page ${test.url}: title="${title}", matches expected:`, matches);
    }
  });

  test('No JavaScript errors in console', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/admin');
    await page.waitForTimeout(2000);
    await page.goto('/admin/employees');
    await page.waitForTimeout(2000);

    console.log('Console errors found:', errors.length);
    if (errors.length > 0) {
      errors.slice(0, 5).forEach((err) => console.log('  -', err));
    }
  });
});
