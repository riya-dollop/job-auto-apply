# 📋 Full-Stack Job Application Automation System — Master Instructions

Complete guide for setup, execution, session capture, DOM selector maintenance, and REST API usage for the **Indeed & Naukri Auto-Apply Engine**.

---

## 📌 1. Project Overview & Architecture

This application automates job discovery and applications across **Indeed** and **Naukri.com** with anti-bot stealth emulation, persistent session cookies, duplicate prevention, and a real-time React + Tailwind CSS dashboard.

### 🏗️ Directory Layout

```
job-auto-apply/
├── server/
│   ├── server.js              # Express REST API (Endpoints: /api/start, /api/stop, /api/status, /api/jobs)
│   ├── scraper.js             # Puppeteer Stealth automation engine for Indeed & Naukri
│   ├── storage.js             # JSON storage & state manager (applied_jobs.json, cookies.json)
│   ├── cookie-helper.js       # CLI helper to login once and extract cookies to cookies.json
│   └── data/
│       ├── applied_jobs.json     # Tracking DB preventing duplicate applications
│       ├── cookies.json          # Saved authenticated session cookies
│       └── activity_logs.json    # Application execution logs
├── client/
│   ├── src/
│   │   ├── App.jsx            # Real-time React Dashboard (Tailwind CSS)
│   │   ├── main.jsx           # React app entry point
│   │   └── index.css          # Tailwind directives & dark custom scrollbars
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js         # Vite proxy configuration (routes /api to port 5000)
│   └── tailwind.config.js
├── assets/
│   └── resume.pdf             # Target PDF resume for auto-attaching
├── .env.example               # Template environment configuration
├── .env                       # Active local environment variables
├── package.json               # Root scripts (PowerShell concurrency)
├── INSTRUCTIONS.md            # This instruction manual
└── README.md                  # Project documentation
```

---

## ⚙️ 2. Manual Settings & Configuration (Setup Once)

Before launching the automation engine, ensure these configurations are set up on your machine:

### A. Environment Variables (`.env`)
In your project root, verify the `.env` file settings:

```ini
# Server Port
PORT=5000

# Browser Configuration
# Set to false to see the browser click and navigate visually in real time!
# Set to true for background headless operation.
HEADLESS=false
BROWSER_TIMEOUT=60000

# Human-like delay range between job applications (milliseconds)
MIN_DELAY_MS=5000
MAX_DELAY_MS=15000

# Default Resume Path (Local relative or absolute path)
DEFAULT_RESUME_PATH=assets/resume.pdf

# Automation Target Platform: indeed | naukri | both
DEFAULT_PLATFORM=both

# Max applications per run
MAX_APPLICATIONS=25
```

---

### B. Resume & Profile Assets
1. Put your updated resume in PDF format inside the `assets/` folder:
   - Path: `c:\Users\Asus\Desktop\job-auto-apply\assets\resume.pdf`
2. Alternatively, you can use the **"Upload File"** button directly on the React Dashboard at [http://localhost:3000](http://localhost:3000) to upload any PDF file at runtime.

---

### C. One-Time Session Capture (`cookies.json`)
Websites like Indeed and Naukri block repeated automated logins via CAPTCHA or OTP. Use the included helper script to log in once manually and extract authenticated cookies:

#### 1. Save Indeed Cookies:
In your PowerShell terminal, run:
```powershell
npm run save-cookies:indeed
```
- A visible Chrome window will open to Indeed's login page.
- Log into your account (complete OTP / 2FA / Google login if prompted).
- Once your home feed loads, switch back to your PowerShell terminal and press **ENTER**.
- Cookies are automatically saved into `server/data/cookies.json`.

#### 2. Save Naukri Cookies:
In your PowerShell terminal, run:
```powershell
npm run save-cookies:naukri
```
- Log into your Naukri.com account in the opened browser.
- Switch back to PowerShell and press **ENTER**.
- Cookies are automatically saved.

---

## 🚀 3. How to Run Locally Using PowerShell

Because Puppeteer launches a local Chromium instance, run the app directly on your Windows PC using PowerShell:

### Step 1: Open Terminal in Project Directory
```powershell
cd c:\Users\Asus\Desktop\job-auto-apply
```

### Step 2: Start Full-Stack System (Server + Dashboard)
Run:
```powershell
npm run dev
```

This single command launches both:
- **Backend Express Server**: [http://localhost:5000](http://localhost:5000)
- **Frontend React Dashboard**: [http://localhost:3000](http://localhost:3000)

*(To run them independently in separate terminal tabs, you can use `npm run server` and `npm run client`)*.

---

## 🖥️ 4. Using the React Dashboard

1. Open **[http://localhost:3000](http://localhost:3000)** in your browser.
2. Configure your search parameters:
   - **Target Job Title**: e.g., `MERN Stack Developer`, `React Node Developer`
   - **Location**: e.g., `India`, `Bengaluru`, `Remote`
   - **Platform**: `All (Both)`, `Indeed`, or `Naukri`
   - **Resume Path**: `assets/resume.pdf` (or click "Upload File")
   - **Human Delay Range**: Default is `5` to `15` seconds (mimics human speed)
   - **Max Applications**: Limit the number of jobs per run (e.g., `20`)
   - **Visible Browser Window**: Toggle **ON** to watch Puppeteer navigate and submit applications in real time.
3. Click **"Start Auto-Apply"**.
4. Monitor live status cards (`Applied`, `Failed`, `Skipped`), live activity logs terminal, and the historical application table.
5. Click **"Stop Automation"** anytime to halt the Puppeteer browser cleanly.

---

## 🛠️ 5. DOM Selectors & Maintenance Guide

Job portals periodically update their frontend classes. If a button or job title fails to be clicked, inspect the element in Chrome Developer Tools (`F12`) and update the selector in `server/scraper.js`:

| Platform | Target Element | Current Selector in `server/scraper.js` | Action if Broken |
|---|---|---|---|
| **Indeed** | Job Card Container | `[data-jk], .job_seen_beacon, .result` | Inspect search result card; update `data-jk` attribute selector. |
| **Indeed** | Job Title Text | `h2.jobTitle span, a[data-jk] span, .jobTitle` | Inspect the anchor tag or heading containing job title. |
| **Indeed** | Apply Now Button | `[id*="indeedApplyButton"], button.ia-IndeedApplyButton, [data-testid="indeedApply"]` | Inspect the blue "Apply now" / "Easily apply" button. |
| **Indeed** | Form Modal Actions | Buttons containing `submit your application`, `continue`, `next` | Check the label text on Indeed application modal buttons. |
| **Naukri** | Job Tuple Container | `.srp-jobtuple-wrapper, .jobTuple, .cust-job-tuple` | Inspect job listing card on Naukri search results. |
| **Naukri** | Job Title Link | `a.title, .job-title` | Inspect the title link tag inside the tuple. |
| **Naukri** | Apply Button | `button:contains("Apply"), #apply-button, .apply-button` | Inspect the "Apply" / "Quick Apply" button on Naukri. |

---

## 📡 6. REST API Reference

You can also trigger or monitor the engine externally using curl, Postman, or automated scripts:

### 1. `POST /api/start`
Starts background automation with custom parameters.
- **Request Body**:
```json
{
  "keyword": "MERN Stack Developer",
  "location": "India",
  "platform": "both",
  "resumePath": "assets/resume.pdf",
  "headless": false,
  "minDelay": 5000,
  "maxDelay": 15000,
  "maxApplications": 25
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Automation started successfully in the background."
}
```

### 2. `POST /api/stop`
Safely terminates the running browser and resets system state to `idle`.
- **Response**:
```json
{
  "success": true,
  "message": "Automation has been safely stopped."
}
```

### 3. `GET /api/status`
Returns real-time execution statistics, logs, and cookie session states.
- **Response**:
```json
{
  "success": true,
  "data": {
    "status": "running",
    "totalApplied": 8,
    "totalFailed": 0,
    "totalSkipped": 3,
    "totalRecords": 24,
    "currentPlatform": "Indeed",
    "currentAction": "Clicking 'Apply now' for Senior React Developer...",
    "cookiesStatus": {
      "indeed": true,
      "naukri": true
    }
  }
}
```

### 4. `GET /api/jobs`
Returns list of all recorded jobs from `server/data/applied_jobs.json`.

### 5. `POST /api/upload-resume`
Multipart form upload for `.pdf` resumes; saves directly to `assets/` and returns the file path.

---

## 🛡️ 7. Anti-Detection & Account Safety Recommendations

1. **Keep Delays Natural**: Keep delays between 5 and 15 seconds (or more). Do not set delay to 0.
2. **Daily Application Limit**: Avoid submitting more than 30–50 applications per platform per day to prevent temporary platform rate limits.
3. **Use Session Cookies**: Always use `npm run save-cookies:<platform>` rather than hardcoding passwords in `.env` to bypass bot challenges.
4. **Inspect First Run**: Run with `HEADLESS=false` initially to verify that your profile information and resume attach properly without unhandled custom employer questions.

