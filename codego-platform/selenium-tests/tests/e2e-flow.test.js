/**
 * ============================================================
 * TEST SUITE: Full E2E Flow — Student Journey
 * ============================================================
 * Simulates a complete student journey end-to-end:
 *  1. Visit landing page
 *  2. Navigate to login
 *  3. Log in as demo student
 *  4. View dashboard, check stat cards
 *  5. Select Python + Easy
 *  6. Start assessment → land on /assessment page
 *  7. Verify the code editor is rendered
 * ============================================================
 *
 * Run individually:
 *   npx mocha selenium-tests/tests/e2e-flow.test.js --timeout 60000
 */

const { By } = require('selenium-webdriver');
const { expect } = require('chai');
const { buildDriver } = require('../helpers/driver');
const { waitForId, waitForCss, waitForUrlContains, sleep } = require('../helpers/wait');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

describe('🚀 Full E2E Student Journey', function () {
  this.timeout(60000);

  let driver;

  before(async () => {
    driver = await buildDriver();
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  it('completes the full student assessment journey', async () => {
    // ── Step 1: Landing page ────────────────────────────────────
    await driver.get(BASE_URL);
    await sleep(800);
    const landingSource = await driver.getPageSource();
    expect(landingSource).to.include('CodeGo');
    console.log('  ✔ Step 1: Landing page loaded');

    // ── Step 2: Navigate to /login ──────────────────────────────
    await driver.get(`${BASE_URL}/login`);
    await waitForId(driver, 'regNumber');
    console.log('  ✔ Step 2: Login page loaded');

    // ── Step 3: Demo-student login ──────────────────────────────
    const demoStudentBtn = await waitForId(driver, 'demoStudentBtn');
    await demoStudentBtn.click();
    await waitForUrlContains(driver, '/dashboard');
    console.log('  ✔ Step 3: Demo student login → /dashboard');

    // ── Step 4: Dashboard stat cards ───────────────────────────
    const statCards = await driver.findElements(By.css('.stat-card'));
    expect(statCards.length).to.be.greaterThan(0);
    console.log(`  ✔ Step 4: Dashboard loaded with ${statCards.length} stat card(s)`);

    // ── Step 5: Select Python ───────────────────────────────────
    const pythonBtn = await waitForId(driver, 'lang-python');
    await pythonBtn.click();
    console.log('  ✔ Step 5a: Python selected');

    // Select Easy difficulty
    const easyBtn = await waitForId(driver, 'diff-easy');
    await easyBtn.click();
    console.log('  ✔ Step 5b: Easy difficulty selected');

    // ── Step 6: Start assessment ────────────────────────────────
    const startBtn = await waitForId(driver, 'startAssessmentBtn');
    // Confirm button is now enabled
    const isDisabled = await startBtn.getAttribute('disabled');
    expect(isDisabled).to.be.null;
    await startBtn.click();
    await waitForUrlContains(driver, '/assessment');
    console.log('  ✔ Step 6: Navigated to /assessment');

    // ── Step 7: Code editor visible ─────────────────────────────
    await sleep(2000); // allow Monaco editor to initialise
    const editorEl = await waitForCss(driver, '.monaco-editor', 15000);
    expect(await editorEl.isDisplayed()).to.be.true;
    console.log('  ✔ Step 7: Monaco code editor is visible');

    console.log('\n  🎉 Full E2E student journey completed successfully!');
  });
});
