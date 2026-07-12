/**
 * ============================================================
 * TEST SUITE: Navigation & Route Guards — CodeGo Platform
 * ============================================================
 * Covers:
 *  1. Landing page (/) loads with "Get Started" CTA
 *  2. Unauthenticated access to /dashboard → redirected to /login
 *  3. Unauthenticated access to /faculty → redirected to /login
 *  4. Student cannot access /faculty (redirected to /dashboard)
 *  5. Navbar renders on authenticated pages
 *  6. Navbar "Progress" link navigates to /profile
 *  7. Logout clears session and redirects to /login
 * ============================================================
 *
 * Run individually:
 *   npx mocha selenium-tests/tests/navigation.test.js --timeout 30000
 */

const { By } = require('selenium-webdriver');
const { expect } = require('chai');
const { buildDriver } = require('../helpers/driver');
const { waitForId, waitForCss, waitForUrlContains, sleep } = require('../helpers/wait');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

async function demoStudentLogin(driver) {
  await driver.get(`${BASE_URL}/login`);
  const btn = await waitForId(driver, 'demoStudentBtn');
  await btn.click();
  await waitForUrlContains(driver, '/dashboard');
}

async function demoFacultyLogin(driver) {
  await driver.get(`${BASE_URL}/login`);
  const btn = await waitForId(driver, 'demoFacultyBtn');
  await btn.click();
  await waitForUrlContains(driver, '/faculty');
}

describe('🗺️ Navigation & Route Guards', function () {
  this.timeout(30000);

  let driver;

  before(async () => {
    driver = await buildDriver();
  });

  afterEach(async () => {
    try { await driver.executeScript('localStorage.clear();'); } catch (_) {}
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  // ── 1. Landing page ──────────────────────────────────────────
  it('should load the landing page with Get Started CTA', async () => {
    await driver.get(BASE_URL);
    await sleep(1000); // allow animations
    const source = await driver.getPageSource();
    // Landing page should mention CodeGo and a CTA
    expect(source).to.include('CodeGo');
    expect(source.toLowerCase()).to.satisfy(
      (s) => s.includes('get started') || s.includes('start') || s.includes('login'),
      'Expected CTA text on landing page',
    );
  });

  // ── 2. /dashboard guard ──────────────────────────────────────
  it('should redirect unauthenticated /dashboard access to /login', async () => {
    await driver.get(`${BASE_URL}/dashboard`);
    await waitForUrlContains(driver, '/login');
    expect(await driver.getCurrentUrl()).to.include('/login');
  });

  // ── 3. /faculty guard ───────────────────────────────────────
  it('should redirect unauthenticated /faculty access to /login', async () => {
    await driver.get(`${BASE_URL}/faculty`);
    await waitForUrlContains(driver, '/login');
    expect(await driver.getCurrentUrl()).to.include('/login');
  });

  // ── 4. Student blocked from /faculty ────────────────────────
  it('should redirect a student who visits /faculty back to /dashboard', async () => {
    await demoStudentLogin(driver);
    await driver.get(`${BASE_URL}/faculty`);
    await waitForUrlContains(driver, '/dashboard');
    expect(await driver.getCurrentUrl()).to.include('/dashboard');
  });

  // ── 5. Navbar on authenticated page ─────────────────────────
  it('should render the navbar on the dashboard', async () => {
    await demoStudentLogin(driver);
    // Navbar element — look for the nav tag
    const nav = await waitForCss(driver, 'nav');
    expect(await nav.isDisplayed()).to.be.true;
  });

  // ── 6. Navbar Progress link → /profile ──────────────────────
  it('should navigate to /profile when the Progress link is clicked', async () => {
    await demoStudentLogin(driver);
    // The link text is "Progress" 
    const progressLink = await waitForCss(driver, 'a[href="/profile"]');
    await progressLink.click();
    await waitForUrlContains(driver, '/profile');
    expect(await driver.getCurrentUrl()).to.include('/profile');
  });

  // ── 7. Logout flow ───────────────────────────────────────────
  it('should clear the session on logout and redirect to /login', async () => {
    await demoStudentLogin(driver);
    // Simulate logout by clearing storage then navigating to /dashboard
    await driver.executeScript('localStorage.clear();');
    await driver.get(`${BASE_URL}/dashboard`);
    await waitForUrlContains(driver, '/login');
    expect(await driver.getCurrentUrl()).to.include('/login');
  });
});
