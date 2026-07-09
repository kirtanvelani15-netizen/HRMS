import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173/holidays');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Take a screenshot of the initial page
    await page.screenshot({ path: 'screenshot_initial.png', fullPage: true });
    console.log('Initial page screenshot saved');
    
    // Look for the "Create New Template" button
    const createBtn = await page.$('button:has-text("Create New Template")');
    if (createBtn) {
      console.log('Found Create New Template button');
      await createBtn.click();
      await page.waitForTimeout(1000);
      
      // Take screenshot of modal
      await page.screenshot({ path: 'screenshot_modal_open.png', fullPage: true });
      console.log('Modal open screenshot saved');
      
      // Check if modal is visible
      const modal = await page.$('text=/Create Weekly Off Template/');
      if (modal) {
        console.log('✓ Modal is displaying correctly!');
      } else {
        console.log('✗ Modal not found');
      }
    } else {
      console.log('Create button not found');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
