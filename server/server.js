const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const storage = require('./storage');
const scraper = require('./scraper');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure assets directory exists for resume storage
const ASSETS_DIR = path.join(__dirname, '../assets');
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Multer setup for direct resume upload from Dashboard
const storageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ASSETS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${cleanName}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage: storageConfig,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Serve frontend in production or if static build is present
const CLIENT_DIST = path.join(__dirname, '../client/dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
}

// ============================================================
// API ROUTES
// ============================================================

/**
 * GET /api/status
 * Returns real-time counts of total applied jobs, failed attempts, and current status.
 */
app.get('/api/status', (req, res) => {
  try {
    const status = storage.getRuntimeStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/start
 * Triggers the background automation job with custom search parameters.
 */
app.post('/api/start', async (req, res) => {
  try {
    const currentStatus = storage.getRuntimeStatus();
    if (currentStatus.status === 'running') {
      return res.status(400).json({
        success: false,
        message: 'Automation is already currently running. Please stop it first before restarting.'
      });
    }

    const {
      keyword = 'MERN Stack Developer',
      location = 'India',
      platform = 'both',
      resumePath = '',
      headless = false,
      minDelay = 5000,
      maxDelay = 15000,
      maxApplications = 25
    } = req.body;

    // Check resume file existence if given
    let finalResumePath = resumePath;
    if (!finalResumePath) {
      finalResumePath = path.resolve(__dirname, '../assets/resume.pdf');
    }

    // Launch background task without blocking the HTTP response
    scraper.startAutomation({
      keyword,
      location,
      platform,
      resumePath: finalResumePath,
      headless,
      minDelay: parseInt(minDelay, 10),
      maxDelay: parseInt(maxDelay, 10),
      maxApplications: parseInt(maxApplications, 10)
    }).catch(err => {
      console.error('[Automation Background Error]', err);
    });

    storage.logActivity('info', `Automation triggered via API for "${keyword}" (${platform})`);

    res.json({
      success: true,
      message: 'Automation started successfully in the background.',
      parameters: {
        keyword,
        location,
        platform,
        resumePath: finalResumePath,
        headless
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/stop
 * Safely halts the running Puppeteer instance.
 */
app.post('/api/stop', async (req, res) => {
  try {
    storage.logActivity('warning', 'Stop command received from API endpoint');
    await scraper.stopAutomation();
    res.json({
      success: true,
      message: 'Automation has been safely stopped.',
      status: storage.getRuntimeStatus()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/jobs
 * Returns list of applied/skipped/failed jobs with duplicate history.
 */
app.get('/api/jobs', (req, res) => {
  try {
    const jobs = storage.getAppliedJobs();
    res.json({
      success: true,
      total: jobs.length,
      data: jobs
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/logs
 * Returns full activity logs.
 */
app.get('/api/logs', (req, res) => {
  try {
    const logs = storage.getLogs();
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/upload-resume
 * Allows uploading resume PDF directly from dashboard.
 */
app.post('/api/upload-resume', upload.single('resume'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const uploadedPath = req.file.path;
    storage.logActivity('info', `Resume uploaded successfully: ${req.file.originalname}`);
    res.json({
      success: true,
      message: 'Resume uploaded successfully',
      filePath: uploadedPath,
      filename: req.file.originalname
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/cookies
 * Update session cookies directly.
 */
app.post('/api/cookies', (req, res) => {
  try {
    const { platform, cookies } = req.body;
    if (!platform || !cookies || !Array.isArray(cookies)) {
      return res.status(400).json({ success: false, message: 'Invalid payload: platform and cookies array required' });
    }
    storage.saveCookies(platform, cookies);
    res.json({ success: true, message: `Updated cookies for ${platform}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback handler for SPA client or API welcome page
app.use((req, res) => {
  const indexPath = path.join(CLIENT_DIST, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Job Auto Apply API</title><style>body{font-family:sans-serif;padding:40px;background:#0f172a;color:#f8fafc;}</style></head>
      <body>
        <h1>🚀 Job Auto Apply Backend Server Running</h1>
        <p>Port: ${PORT}</p>
        <p>Frontend: Run <code>npm run dev</code> to launch both the Backend and React/Tailwind Dashboard.</p>
        <p>API Status: <a href="/api/status" style="color:#38bdf8;">/api/status</a></p>
        <p>Applied Jobs: <a href="/api/jobs" style="color:#38bdf8;">/api/jobs</a></p>
      </body>
      </html>
    `);
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🤖 Job Auto Apply Server is running on http://localhost:${PORT}`);
  console.log(`📊 Status API: http://localhost:${PORT}/api/status`);
  console.log(`💼 Jobs API:   http://localhost:${PORT}/api/jobs`);
  console.log(`======================================================\n`);
  storage.logActivity('info', `Server initialized on port ${PORT}`);
});
