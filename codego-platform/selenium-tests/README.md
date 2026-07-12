# 🧪 Selenium E2E Tests — CodeGo Platform

Automated end-to-end tests using **Selenium WebDriver** + **Mocha** + **Chai**, following the *Git Live Automation Testing Setup* document.

---

## 📁 Folder Structure

```
selenium-tests/
├── helpers/
│   ├── driver.js       ← Chrome WebDriver factory (headed / headless)
│   └── wait.js         ← Reusable wait & assertion helpers
├── tests/
│   ├── login.test.js       ← Login page tests (7 scenarios)
│   ├── dashboard.test.js   ← Student dashboard tests (7 scenarios)
│   ├── navigation.test.js  ← Route guards & navbar tests (7 scenarios)
│   ├── faculty.test.js     ← Faculty dashboard tests (3 scenarios)
│   └── e2e-flow.test.js    ← Full student journey (1 compound scenario)
└── package.json        ← Local scripts for this sub-folder
```

---

## ⚙️ Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 18 |
| Google Chrome | Latest stable |
| ChromeDriver | Matches Chrome version (auto-managed by selenium-webdriver) |

---

## 🚀 Running Tests Locally

### Step 1 — Start the dev server

```bash
# Inside codego-platform/
npm run dev:web
```
> App runs at **http://localhost:5173**

### Step 2 — Run a specific suite

```bash
# From codego-platform/
npm run test:login        # Login page only
npm run test:dashboard    # Student dashboard only
npm run test:navigation   # Route guards & navbar
npm run test:faculty      # Faculty dashboard
npm run test:e2e          # Full student journey (60 s timeout)

# Run all suites
npm test
```

### Step 3 — Run in headed mode (watch Chrome open)

```bash
# Set HEADLESS=false to see the browser
$env:HEADLESS="false"; npm run test:login     # PowerShell
HEADLESS=false npm run test:login             # bash / macOS
```

### Step 4 — Run against a deployed URL

```bash
$env:BASE_URL="https://your-username.github.io/your-repo"; npm test
```

---

## 🤖 CI/CD — GitHub Actions

The workflow at `.github/workflows/selenium-e2e.yml` runs automatically on every **push** and **pull request** to `main`, `master`, or `develop`.

**Pipeline steps:**
1. Checkout code
2. Install Node.js 20
3. `npm ci` — install dependencies
4. `npm run build:web` — build Vite app
5. Serve built files on port 5173
6. Install Chrome (stable)
7. Run Selenium tests headlessly
8. Upload failure logs as an artifact (on failure)

---

## 🗂️ Test Coverage Map

| Suite | Page | Scenarios |
|---|---|---|
| `login.test.js` | `/login` | Page load · Form elements · Empty validation · Bad creds · Demo student · Demo faculty · Auth guard |
| `dashboard.test.js` | `/dashboard` | Page load · Stat cards · Language buttons · Difficulty buttons · Start disabled · Start enabled · Navigate to /assessment |
| `navigation.test.js` | All routes | Landing · /dashboard guard · /faculty guard · Student→/faculty blocked · Navbar · Progress link · Logout |
| `faculty.test.js` | `/faculty` | Page load · Faculty content · Navbar |
| `e2e-flow.test.js` | End-to-end | Landing → Login → Dashboard → Assessment selection → Code editor |

**Total: 25 test scenarios**

---

## 🔑 Stable Element IDs Used

The tests rely on `id` attributes already in the source code. Ensure these are **never removed**:

| ID | Element | File |
|---|---|---|
| `regNumber` | Registration number input | `Login.tsx` |
| `password` | Password input | `Login.tsx` |
| `loginBtn` | Sign In button | `Login.tsx` |
| `demoStudentBtn` | Demo Student button | `Login.tsx` |
| `demoFacultyBtn` | Demo Faculty button | `Login.tsx` |
| `lang-python` `lang-java` etc. | Language selector buttons | `Dashboard.tsx` |
| `diff-easy` `diff-medium` `diff-hard` | Difficulty selector buttons | `Dashboard.tsx` |
| `startAssessmentBtn` | Start Assessment button | `Dashboard.tsx` |

---

## 📝 Adding a New Test

1. Create `selenium-tests/tests/my-feature.test.js`
2. Use helpers:
   ```js
   const { buildDriver } = require('../helpers/driver');
   const { waitForId, waitForUrlContains } = require('../helpers/wait');
   ```
3. Add a script to `package.json`:
   ```json
   "test:myfeature": "mocha selenium-tests/tests/my-feature.test.js --timeout 30000"
   ```
4. The GitHub Actions workflow will pick it up automatically.
