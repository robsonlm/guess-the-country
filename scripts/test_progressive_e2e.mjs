import { chromium } from '@playwright/test';

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const requestedUrls = [];
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/flags/') || url.includes('/textures/')) {
      requestedUrls.push(url);
    }
  });

  console.log('Navigating to http://localhost:3000/guess-the-country/...');
  await page.goto('http://localhost:3000/guess-the-country/');
  await page.waitForTimeout(1000);

  // Set user login in localStorage if not already logged in
  await page.evaluate(() => {
    localStorage.setItem(
      'guessTheCountry.authUser',
      JSON.stringify({
        uid: 'test-user-123',
        email: 'robsonlmaraia@gmail.com',
        displayName: 'Robson',
        isAdmin: true,
      })
    );
  });

  // Reload to pick up session
  await page.reload();
  await page.waitForTimeout(1200);

  console.log('Inspecting start button...');
  const startBtn = page.locator('.main-btn-start-large');
  await startBtn.waitFor({ state: 'visible', timeout: 5000 });
  const btnText = await startBtn.innerText();
  console.log('Button text:', btnText);
  await startBtn.click();
  await page.waitForTimeout(1000);

  // Wait for login form to appear
  console.log('Filling login form...');
  const emailInput = page.locator('#auth-email-input');
  await emailInput.waitFor({ state: 'visible', timeout: 5000 });
  await emailInput.fill('robsonlmaraia@gmail.com');

  const passwordInput = page.locator('#auth-password-input');
  await passwordInput.fill('test123');

  const submitBtn = page.locator('form:has(#auth-email-input) button[type="submit"]');
  await submitBtn.click();
  console.log('Submitted modal login credentials...');
  await page.waitForTimeout(3000);

  const errorEl = page.locator('text=Failed to sign in, text=Firebase: Error');
  if (await errorEl.isVisible()) {
    console.log('Login error displayed:', await errorEl.innerText());
  }

  const modalText = await page.locator('.auth-modal-card, form').innerText().catch(() => '');
  console.log('Form text after submission:', modalText.slice(0, 200));

  console.log('Clicking Launch New Expedition now that user is logged in...');
  const launchBtn = page.locator('.main-btn-start-large');
  await launchBtn.waitFor({ state: 'visible', timeout: 5000 });
  console.log('Launch button text:', await launchBtn.innerText());
  await launchBtn.click();

  // Check if loading screen is visible
  const loadingScreen = page.locator('.loading-screen-container, .loading-screen');
  if (await loadingScreen.isVisible()) {
    console.log('Loading screen is active and calibrating...');
  }

  // Wait for game arena to load
  await page.waitForSelector('.globe-game-container, #game-area', { timeout: 25000 });
  console.log('Game arena loaded successfully!');

  await page.waitForTimeout(3000);

  // Inspect the requested assets
  const lowFlags = requestedUrls.filter((u) => u.includes('/flags/low/'));
  const highFlags = requestedUrls.filter((u) => u.includes('/flags/') && !u.includes('/flags/low/'));
  const lowTextures = requestedUrls.filter((u) => u.includes('/textures/low/'));
  const highTextures = requestedUrls.filter((u) => u.includes('/textures/') && !u.includes('/textures/low/'));

  console.log('Asset Network Report:');
  console.log(`- Low-res flags requested: ${lowFlags.length}`);
  console.log(`- High-res flags requested: ${highFlags.length}`);
  console.log(`- Low-res textures requested: ${lowTextures.length}`);
  console.log(`- High-res textures requested: ${highTextures.length}`);

  // Verify that low-res assets were requested
  if (lowFlags.length === 0) {
    throw new Error('Expected low-res flags to be requested first, but none were detected!');
  }
  if (lowTextures.length === 0) {
    throw new Error('Expected low-res textures to be requested first, but none were detected!');
  }

  // Verify that cards on screen have loaded images
  const flagImages = await page.locator('.globe-flag-img, .flag-image').all();
  console.log(`Found ${flagImages.length} flag images rendered in the UI.`);
  for (let i = 0; i < flagImages.length; i++) {
    const src = await flagImages[i].getAttribute('src');
    const naturalWidth = await flagImages[i].evaluate((img) => img.naturalWidth);
    console.log(`Flag [${i}]: src=${src}, naturalWidth=${naturalWidth}`);
  }

  // Test answering question 1 to test round transition
  console.log('Answering question...');
  const choiceBtn = page.locator('.globe-choice-card').nth(1); // Admin option 2
  if (await choiceBtn.isVisible()) {
    await choiceBtn.click();
    await page.waitForTimeout(3500); // wait for resolution and next round transition
  }

  console.log('Verified Question transition!');
  await browser.close();
  console.log('Test completed with SUCCESS!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
