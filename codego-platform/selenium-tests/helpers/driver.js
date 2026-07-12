/**
 * WebDriver Factory — creates and tears down a Chrome driver instance.
 * Uses selenium-webdriver with Chrome options suited for CI (headless)
 * and local development (headed).
 */

const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

/**
 * Build and return a configured Chrome WebDriver instance.
 * Set HEADLESS=false in your environment to run headed locally.
 */
async function buildDriver() {
  const options = new chrome.Options();

  const isHeadless = process.env.HEADLESS !== 'false';
  if (isHeadless) {
    options.addArguments('--headless=new');
  }

  options.addArguments(
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1440,900',
    '--disable-extensions',
    '--disable-popup-blocking',
    '--disable-infobars',
  );

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  // Implicit wait: up to 5 s for elements to appear
  await driver.manage().setTimeouts({ implicit: 5000, pageLoad: 15000 });

  return driver;
}

module.exports = { buildDriver };
