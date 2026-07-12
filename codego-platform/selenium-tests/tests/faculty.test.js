/**
 * ============================================================
 * TEST SUITE: Faculty Dashboard — CodeGo Platform
 * ============================================================
 * Covers:
 *  1. Faculty dashboard loads after demo-faculty login
 *  2. Faculty-specific UI content is present
 *  3. Page title / heading indicates faculty view
 * ============================================================
 *
 * Run individually:
 *   npx mocha selenium-tests/tests/faculty.test.js --timeout 30000
 */

const { By } = require('selenium-webdriver');
const { expect } = require('chai');
const { buildDriver } = require('../helpers/driver');
const { waitForId, waitForCss, waitForUrlContains } = require('../helpers/wait');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

async function demoFacultyLogin(driver) {
  await driver.get(`${BASE_URL}/login`);
  const btn = await waitForId(driver, 'demoFacultyBtn');
  await btn.click();
  await waitForUrlContains(driver, '/faculty');
}

describe('🎓 Faculty Dashboard', function () {
  this.timeout(30000);

  let driver;

  before(async () => {
    driver = await buildDriver();
    await demoFacultyLogin(driver);
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  // ── 1. Page loaded at /faculty ───────────────────────────────
  it('should load the faculty dashboard at /faculty', async () => {
    const url = await driver.getCurrentUrl();
    expect(url).to.include('/faculty');
  });

  // ── 2. Faculty-specific content ──────────────────────────────
  it('should display faculty-specific content', async () => {
    const source = await driver.getPageSource();
    // The faculty dashboard should mention faculty/admin context
    expect(source.toLowerCase()).to.satisfy(
      (s) =>
        s.includes('faculty') ||
        s.includes('students') ||
        s.includes('assessments') ||
        s.includes('dashboard'),
      'Expected faculty-related content on the faculty dashboard page',
    );
  });

  // ── 3. Navbar is present ─────────────────────────────────────
  it('should display the navbar on the faculty page', async () => {
    const nav = await waitForCss(driver, 'nav');
    expect(await nav.isDisplayed()).to.be.true;
  });
});
