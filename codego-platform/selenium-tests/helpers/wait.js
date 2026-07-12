/**
 * Wait / assertion helpers built on selenium-webdriver's until module.
 * These make tests cleaner by encapsulating common polling patterns.
 */

const { until, By } = require('selenium-webdriver');

const DEFAULT_TIMEOUT = 10000; // 10 s

/**
 * Wait for an element to be visible on screen.
 * @param {WebDriver} driver
 * @param {string} id - element ID
 * @param {number} [timeout]
 */
async function waitForId(driver, id, timeout = DEFAULT_TIMEOUT) {
  const el = await driver.wait(
    until.elementLocated(By.id(id)),
    timeout,
    `Timed out waiting for #${id}`,
  );
  await driver.wait(until.elementIsVisible(el), timeout);
  return el;
}

/**
 * Wait for a CSS selector to appear and be visible.
 */
async function waitForCss(driver, selector, timeout = DEFAULT_TIMEOUT) {
  const el = await driver.wait(
    until.elementLocated(By.css(selector)),
    timeout,
    `Timed out waiting for "${selector}"`,
  );
  await driver.wait(until.elementIsVisible(el), timeout);
  return el;
}

/**
 * Wait until the browser URL contains the given substring.
 */
async function waitForUrlContains(driver, part, timeout = DEFAULT_TIMEOUT) {
  await driver.wait(
    until.urlContains(part),
    timeout,
    `URL did not contain "${part}" within ${timeout} ms`,
  );
}

/**
 * Pause execution for a fixed number of milliseconds.
 * Prefer wait helpers above; use this only as a last resort.
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { waitForId, waitForCss, waitForUrlContains, sleep };
