/**
 * ============================================================
 * TEST SUITE: Login Page — CodeGo Platform
 * ============================================================
 * Covers:
 *  1. Landing page loads and "Get Started" navigates to /login
 *  2. Login form renders expected elements
 *  3. Empty-form validation shows error message
 *  4. Invalid credentials show an error
 *  5. Demo Student login → redirects to /dashboard
 *  6. Demo Faculty login → redirects to /faculty
 * ============================================================
 *
 * Run individually:
 *   npx mocha selenium-tests/tests/login.test.js --timeout 30000
 */

const { By, until } = require('selenium-webdriver');
const { expect } = require('chai');
const { buildDriver } = require('../helpers/driver');
const { waitForId, waitForCss, waitForUrlContains, sleep } = require('../helpers/wait');

// ── Config ────────────────────────────────────────────────────
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const LOGIN_URL = `${BASE_URL}/login`;

// ── Suite ─────────────────────────────────────────────────────
describe('🔐 Login Page', function () {
  this.timeout(30000);

  let driver;

  before(async () => {
    driver = await buildDriver();
  });

  afterEach(async () => {
    // Clear localStorage between tests so demo tokens don't bleed over
    try {
      await driver.executeScript('localStorage.clear();');
    } catch (_) {}
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  // ── 1. Login page loads ──────────────────────────────────────
  it('should load the login page and display the CodeGo brand', async () => {
    await driver.get(LOGIN_URL);

    // Wait for the registration number field which has a stable id
    await waitForId(driver, 'regNumber');

    const pageSource = await driver.getPageSource();
    expect(pageSource).to.include('CodeGo');
    expect(pageSource).to.include('Sign in');
  });

  // ── 2. Form elements are present ────────────────────────────
  it('should render all required form elements', async () => {
    await driver.get(LOGIN_URL);

    const regInput    = await waitForId(driver, 'regNumber');
    const passInput   = await waitForId(driver, 'password');
    const loginBtn    = await waitForId(driver, 'loginBtn');
    const demoStudent = await waitForId(driver, 'demoStudentBtn');
    const demoFaculty = await waitForId(driver, 'demoFacultyBtn');

    expect(await regInput.isDisplayed()).to.be.true;
    expect(await passInput.isDisplayed()).to.be.true;
    expect(await loginBtn.isDisplayed()).to.be.true;
    expect(await demoStudent.isDisplayed()).to.be.true;
    expect(await demoFaculty.isDisplayed()).to.be.true;
  });

  // ── 3. Empty form validation ─────────────────────────────────
  it('should show a validation error when form is submitted empty', async () => {
    await driver.get(LOGIN_URL);

    const loginBtn = await waitForId(driver, 'loginBtn');
    await loginBtn.click();

    // Expect an error message to appear (the alert-error div)
    const alertEl = await waitForCss(driver, '.alert-error');
    const alertText = await alertEl.getText();
    expect(alertText.toLowerCase()).to.satisfy(
      (t) => t.includes('fill') || t.includes('required') || t.includes('field'),
      `Expected validation message, got: "${alertText}"`,
    );
  });

  // ── 4. Invalid credentials error ────────────────────────────
  it('should display an error for wrong credentials', async () => {
    await driver.get(LOGIN_URL);

    const regInput  = await waitForId(driver, 'regNumber');
    const passInput = await waitForId(driver, 'password');
    const loginBtn  = await waitForId(driver, 'loginBtn');

    await regInput.sendKeys('INVALID000');
    await passInput.sendKeys('wrongpassword');
    await loginBtn.click();

    // Network call may take a moment; wait up to 10 s for the error
    const alertEl = await waitForCss(driver, '.alert-error', 10000);
    const alertText = await alertEl.getText();
    expect(alertText.length).to.be.greaterThan(0);
  });

  // ── 5. Demo Student login ────────────────────────────────────
  it('should log in as a demo student and navigate to /dashboard', async () => {
    await driver.get(LOGIN_URL);

    const demoStudentBtn = await waitForId(driver, 'demoStudentBtn');
    await demoStudentBtn.click();

    await waitForUrlContains(driver, '/dashboard');

    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).to.include('/dashboard');
  });

  // ── 6. Demo Faculty login ────────────────────────────────────
  it('should log in as a demo faculty and navigate to /faculty', async () => {
    await driver.get(LOGIN_URL);

    const demoFacultyBtn = await waitForId(driver, 'demoFacultyBtn');
    await demoFacultyBtn.click();

    await waitForUrlContains(driver, '/faculty');

    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).to.include('/faculty');
  });

  // ── 7. Redirect unauthenticated user from /dashboard ─────────
  it('should redirect unauthenticated users from /dashboard to /login', async () => {
    await driver.executeScript('localStorage.clear();');
    await driver.get(`${BASE_URL}/dashboard`);

    await waitForUrlContains(driver, '/login');
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).to.include('/login');
  });
});
