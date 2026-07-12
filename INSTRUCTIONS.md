# 🚀 Deployment and Testing Instructions

Follow these steps to complete the GitHub Pages deployment and run the Selenium E2E tests, based on your "Git Live Automation Testing Setup.docx" document.

## 1. Push Your Project to GitHub
Open your terminal, ensure you are in the **root** folder (`c:\Users\baran\Downloads\codego`), and run:

```bash
git init
git add .
git commit -m "Initial upload with Selenium E2E and deployment configs"
git branch -M main

# Replace YOUR_USERNAME and YOUR_REPO below:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 2. Install GitHub Pages Package
Navigate to the frontend platform folder and install the `gh-pages` package:

```bash
cd codego-platform
npm install gh-pages --save-dev
```

## 3. Update `package.json` with your GitHub Details
Open `codego-platform/package.json` and change line 3:
```json
"homepage": "https://YOUR_USERNAME.github.io/YOUR_REPO",
```
*(Replace `YOUR_USERNAME` and `YOUR_REPO` with your actual GitHub details).*

## 4. Deploy to GitHub Pages
While still inside the `codego-platform` folder, run the deploy command:

```bash
npm run deploy
```
*This command will build the React application and automatically upload the `dist` folder to the `gh-pages` branch on your GitHub repository.*

## 5. Enable GitHub Pages
1. Open your GitHub repository in the browser.
2. Go to **Settings** → **Pages**.
3. Under **Build and deployment**, select **Source** → **Deploy from branch**.
4. Choose the **Branch**: `gh-pages` and `/ (root)`.
5. Click **Save**.
6. Wait a few minutes, then visit your live app at: `https://YOUR_USERNAME.github.io/YOUR_REPO`

## 6. Run Selenium E2E Tests Locally
You can verify the automated testing pipeline locally. First, ensure your development server is running in one terminal:

**Terminal 1 (Start the app):**
```bash
cd codego-platform
npm run dev:web
```

**Terminal 2 (Run the tests):**
Open a new terminal window, navigate to `codego-platform`, and run the tests:
```bash
cd codego-platform

# Install the Selenium testing packages if you haven't already:
npm install selenium-webdriver mocha chai --save-dev

# Run all test suites:
npm test

# Or run individual test suites:
npm run test:login
npm run test:dashboard
npm run test:navigation
npm run test:e2e
```
*Note: To watch Chrome visually click through the pages, run `HEADLESS=false npm test` (or `$env:HEADLESS="false"; npm test` in PowerShell).*

## 7. Automatic CI/CD Testing
The GitHub Actions workflow has already been configured in `.github/workflows/selenium-e2e.yml`. 
Whenever you run `git push`, GitHub will automatically:
1. Build the Vite application.
2. Start a background server.
3. Run the complete headless Selenium E2E test suite.
4. Report Pass/Fail status on your commit.
