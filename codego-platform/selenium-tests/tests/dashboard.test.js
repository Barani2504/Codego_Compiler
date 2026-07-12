/**
 * ============================================================
 * TEST SUITE: Student Dashboard — CodeGo Platform
 * ============================================================
 * Covers:
 *  1. Dashboard loads after demo-student login
 *  2. Stat cards are visible (Assessments, Passed, Avg Score, Streak)
 *  3. Language selector buttons all render (Python, Java, C++, C, JS)
 *  4. Difficulty selector buttons all render (easy, medium, hard)
 *  5. Start Assessment button is disabled until language + difficulty chosen
 *  6. Selecting language + difficulty enables the Start button
 *  7. Clicking Start Assessment navigates to /assessment
 * ============================================================
 *
 * Run individually:
 *   npx mocha selenium-tests/tests/dashboard.test.js --timeout 30000
 */

const { By } = require('selenium-webdriver');
const { expect } = require('chai');
const { buildDriver } = require('../helpers/driver');
const { waitForId, waitForCss, waitForUrlContains } = require('../helpers/wait');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Helper: perform demo-student login via the UI
async function demoStudentLogin(driver) {
  await driver.get(`${BASE_URL}/login`);
  const btn = await waitForId(driver, 'demoStudentBtn');
  await btn.click();
  await waitForUrlContains(driver, '/dashboard');
}

describe('📊 Student Dashboard', function () {
  this.timeout(30000);

  let driver;

  before(async () => {
    driver = await buildDriver();
    await demoStudentLogin(driver);
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  // ── 1. Dashboard loaded ──────────────────────────────────────
  it('should display the "Start New Assessment" section', async () => {
    const source = await driver.getPageSource();
    expect(source).to.include('Start New Assessment');
  });

  // ── 2. Stat cards ────────────────────────────────────────────
  it('should show the four stat card labels', async () => {
    const cards = await driver.findElements(By.css('.stat-label'));
    const labels = await Promise.all(cards.map((c) => c.getText()));
    const labelText = labels.join(' ');
    expect(labelText).to.include('Assessments');
    expect(labelText).to.include('Passed');
    expect(labelText).to.include('Avg Score');
    expect(labelText).to.include('Streak');
  });

  // ── 3. Language buttons ──────────────────────────────────────
  it('should render all five language selector buttons', async () => {
    for (const lang of ['python', 'java', 'cpp', 'c', 'javascript']) {
      const btn = await waitForId(driver, `lang-${lang}`);
      expect(await btn.isDisplayed()).to.be.true;
    }
  });

  // ── 4. Difficulty buttons ────────────────────────────────────
  it('should render all three difficulty selector buttons', async () => {
    for (const diff of ['easy', 'medium', 'hard']) {
      const btn = await waitForId(driver, `diff-${diff}`);
      expect(await btn.isDisplayed()).to.be.true;
    }
  });

  // ── 5. Start button disabled without selection ───────────────
  it('should keep Start Assessment button disabled with no selection', async () => {
    const startBtn = await waitForId(driver, 'startAssessmentBtn');
    const isDisabled = await startBtn.getAttribute('disabled');
    expect(isDisabled).to.not.be.null;
  });

  // ── 6. Button enables after lang + difficulty chosen ─────────
  it('should enable Start Assessment button after selecting language and difficulty', async () => {
    // Select Python
    const pythonBtn = await waitForId(driver, 'lang-python');
    await pythonBtn.click();

    // Select Easy
    const easyBtn = await waitForId(driver, 'diff-easy');
    await easyBtn.click();

    // Start button should no longer be disabled
    const startBtn = await waitForId(driver, 'startAssessmentBtn');
    const isDisabled = await startBtn.getAttribute('disabled');
    expect(isDisabled).to.be.null;
  });

  // ── 7. Navigate to /assessment ───────────────────────────────
  it('should navigate to /assessment when Start Assessment is clicked', async () => {
    const startBtn = await waitForId(driver, 'startAssessmentBtn');
    await startBtn.click();
    await waitForUrlContains(driver, '/assessment');
    const url = await driver.getCurrentUrl();
    expect(url).to.include('/assessment');
  });
});
