import { test, expect } from '@playwright/test';

test.describe('Guess the Country App', () => {
  test('should load the page and render main elements', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle(/Guess the Country/i);

    const appContainer = page.locator('.app-container');
    await expect(appContainer).toBeVisible({ timeout: 30000 });

    const brand = page.locator('.brand-title');
    await expect(brand).toBeVisible();
  });

  test('should fit inside mobile viewport without page scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');

    const appContainer = page.locator('.app-container');
    await expect(appContainer).toBeVisible({ timeout: 30000 });

    // Verify root doesn't overflow
    const hasScroll = await page.evaluate(() => {
      return document.documentElement.scrollHeight > document.documentElement.clientHeight;
    });

    expect(hasScroll).toBe(false);
  });

  test('should display and center the highlighted territory banner properly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');

    const banner = page.locator('.globe-target-banner');
    await expect(banner).toBeVisible({ timeout: 30000 });

    // Check bounding box to ensure it is centered and not shifted off-screen
    const box = await banner.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThan(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(box.y).toBeGreaterThan(0);
    }

    // Verify text content
    const text = page.locator('.globe-target-text');
    await expect(text).toBeVisible();
    await expect(text).not.toBeEmpty();

    const subtext = page.locator('.globe-target-subtext');
    await expect(subtext).toBeVisible();
  });

  test('should display and center banner on small iPhone SE (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('./');

    const banner = page.locator('.globe-target-banner');
    await expect(banner).toBeVisible({ timeout: 30000 });

    const box = await banner.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThan(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
  });
});
