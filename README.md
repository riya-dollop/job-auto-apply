# 🚀 Job Auto-Apply System (Indeed & Naukri Automation)

A production-ready full-stack job application automation system built with **Node.js**, **Express**, **Puppeteer Stealth** (`puppeteer-extra-plugin-stealth`), and a modern **React + Tailwind CSS** live dashboard.

---

## 🌟 Key Features

1. **Anti-Bot Stealth Engine**:
   - Uses `puppeteer-extra-plugin-stealth` to bypass Cloudflare, Akamai, and bot detection heuristics.
   - Randomized human-like delays (5 to 15 seconds) between applications.
   - Mouse movement and smooth scrolling emulation.

2. **Dual Platform Support**:
   - **Indeed (India & Global)**: Filters for "Easy Apply" / "Apply now" flows, parses job descriptions, fills multi-step application forms, uploads resumes, and confirms submissions.
   - **Naukri.com**: Handles 1-click applies, skips external employer redirects, and detects duplicate applications.

3. **Persistent Session Handling (`cookies.json`)**:
   - Zero login hassles or OTP blockages during automated runs.
   - Comes with a built-in interactive cookie extraction CLI tool (`npm run save-cookies:indeed` and `npm run save-cookies:naukri`).

4. **Duplicate Prevention Tracking (`applied_jobs.json`)**:
   - Logs every applied, failed, and skipped job with its unique ID, title, company, location, URL, and timestamp.
   - Automatically skips already processed jobs to keep your profile clean.

5. **REST API & Live React Dashboard**:
   - `POST /api/start` - Trigger automation with custom job title, location, platform, and delay parameters.
   - `POST /api/stop` - Safely halts browser instances without leaving dangling Chrome processes.
   - `GET /api/status` - Live polling for applied counts, failed attempts, and current Puppeteer action.
   - `GET /api/jobs` - Full application history table with filters and direct job links.
   - `POST /api/upload-resume` - Upload resume file directly through the UI.

---

## 📁 Project Structure

```
job-auto-apply/
├── server/
│   ├── server.js            # Express REST API & static server
│   ├── scraper.js           # Puppeteer stealth automation engine (Indeed & Naukri)
│   ├── storage.js           # Applied jobs JSON database & runtime state manager
│   ├── cookie-helper.js     # CLI helper to login once and save session cookies
│   └── data/
│       ├── applied_jobs.json   # Persistent record of applied jobs
│       ├── cookies.json        # Saved authentication cookies
│       └── activity_logs.json  # Application execution logs
├── client/
│   ├── src/
│   │   ├── App.jsx          # React Tailwind Dashboard
│   │   ├── main.jsx         # React entry point
│   │   └── index.css        # Tailwind styles & custom scrollbars
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js       # Vite proxy to backend port 5000
│   └── tailwind.config.js
├── assets/
│   └── resume.pdf           # Target PDF resume for auto-attaching
├── .env.example             # Configuration template
├── .env                     # Local environment variables
├── package.json             # Root orchestration scripts
└── README.md
```

---

## 🛠️ Step-by-Step Setup Guide (Windows PowerShell)

### Step 1: Clone or Open Directory in PowerShell
```powershell
cd c:\Users\Asus\Desktop\job-auto-apply
```

### Step 2: Install Dependencies
The project dependencies are already configured in both root and client directories:
```powershell
# In root directory:
npm install

# In client directory:
npm --prefix client install
```

### Step 3: Configure `.env`
Copy `.env.example` to `.env` if not already done:
```powershell
cp .env.example .env
```
Key variables:
- `HEADLESS=false` (Set to `false` to see the browser clicking live, or `true` for headless background mode)
- `MIN_DELAY_MS=5000` & `MAX_DELAY_MS=15000` (Human cooldown range between job submissions)
- `DEFAULT_RESUME_PATH=assets/resume.pdf`

---

## 🔐 Session Cookies Setup (Manual 1-Time Step)

Websites like Indeed and Naukri enforce CAPTCHA or OTP verification on new headless browser logins. To ensure 100% reliable automated applications without getting blocked:

### Capture Indeed Cookies:
Run this command in PowerShell:
```powershell
npm run save-cookies:indeed
```
1. A real Chrome window will open to Indeed's login page.
2. Sign in with your email, password, and OTP/Google login.
3. Once your Indeed homepage/feed loads, return to PowerShell and press **ENTER**.
4. Your authenticated cookies will be automatically saved to `server/data/cookies.json`!

### Capture Naukri.com Cookies:
Run this command in PowerShell:
```powershell
npm run save-cookies:naukri
```
1. A real Chrome window will open to Naukri's login page.
2. Complete your login.
3. Return to PowerShell and press **ENTER**.
4. Cookies will be saved.

---

## 🚀 Running the Full-Stack Application

Launch both backend API server and frontend React dashboard concurrently with a single command:

```powershell
npm run dev
```

- **Frontend Dashboard**: Open your browser at [http://localhost:3000](http://localhost:3000)
- **Backend API**: Running at [http://localhost:5000](http://localhost:5000)

---

## 🧭 Using the Dashboard

1. **Target Parameters**:
   - **Job Title**: Enter keywords (e.g. `MERN Stack Developer`, `Full Stack React Node`, `Software Engineer`).
   - **Location**: Enter location (e.g. `India`, `Bengaluru`, `Remote`, `Delhi`).
   - **Target Platform**: Select `Indeed`, `Naukri`, or `All (Both)`.
   - **Resume**: Use the "Upload File" button or provide a local PDF path (e.g. `assets/resume.pdf`).
   - **Visible Browser Window**: Toggle ON to watch Puppeteer navigate, fill forms, and submit applications in real time!
2. **Start Auto-Apply**:
   - Click the **Start Auto-Apply** button.
   - The status changes to `Running` with a live activity terminal and status counters.
3. **Emergency Stop**:
   - Click **Stop Automation** at any point. The running Puppeteer browser gracefully closes.

---

## 🔍 DOM Selectors & Maintenance Guide

Indeed and Naukri periodically update their HTML class names. If an apply button or job title changes, update the selectors in `server/scraper.js`:

| Target Element | Current Selector in `server/scraper.js` | How to Update via Inspect Element |
|---|---|---|
| **Indeed Job Card** | `[data-jk], .job_seen_beacon, .result` | Right click a job card on Indeed -> inspect container attribute |
| **Indeed Job Title** | `h2.jobTitle span, a[data-jk] span` | Inspect job title text inside card |
| **Indeed Apply Button** | `[id*="indeedApplyButton"], button.ia-IndeedApplyButton` | Inspect "Apply now" / "Easily apply" button |
| **Naukri Job Tuple** | `.srp-jobtuple-wrapper, .jobTuple, .cust-job-tuple` | Inspect job listing container on Naukri search |
| **Naukri Apply Button** | `button:contains("Apply"), #apply-button, .apply-button` | Inspect "Apply" or "Quick Apply" button on Naukri |

---

## 📡 REST API Reference

### 1. `POST /api/start`
Trigger the automation job in the background.
```json
{
  "keyword": "MERN Stack Developer",
  "location": "India",
  "platform": "both",
  "resumePath": "assets/resume.pdf",
  "headless": false,
  "minDelay": 5000,
  "maxDelay": 15000,
  "maxApplications": 20
}
```

### 2. `POST /api/stop`
Halts the active automation run and terminates browser tabs.

### 3. `GET /api/status`
Returns real-time execution statistics:
```json
{
  "status": "running",
  "totalApplied": 12,
  "totalFailed": 1,
  "totalSkipped": 4,
  "totalRecords": 35,
  "currentPlatform": "Indeed",
  "currentAction": "Applying to Senior React Developer at TechCorp...",
  "cookiesStatus": { "indeed": true, "naukri": true }
}
```

### 4. `GET /api/jobs`
Returns list of all applied, skipped, and failed job records from `applied_jobs.json`.

---

## 🛡️ Best Practices & Anti-Detection Tips

1. **Keep Human Delays Active**: Always use 5-15s (or higher) delays between submissions to mimic authentic human browsing.
2. **Cap Daily Limit**: Do not exceed 30-50 applications per platform per day to keep your account in good standing.
3. **Use Session Cookies**: Never automate password typing repeatedly. Once cookies are saved via `npm run save-cookies:<platform>`, they remain valid for weeks.

