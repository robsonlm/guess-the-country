import { test, expect } from '@playwright/test';

test.describe('Guess the Country App', () => {
  test('should load the page and render main elements', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle(/Guess the Country/i);

    // Header brand title
    const brand = page.locator('.brand-title');
    await expect(brand).toBeVisible();
  });

  test('should fit inside mobile viewport without page scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');

    const appContainer = page.locator('.app-container');
    await expect(appContainer).toBeVisible();

    // Verify root doesn't overflow
    const hasScroll = await page.evaluate(() => {
      return document.documentElement.scrollHeight > document.documentElement.clientHeight;
    });

    expect(hasScroll).toBe(false);
  });
});
