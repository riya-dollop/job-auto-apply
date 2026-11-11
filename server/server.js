const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const storage = require('./storage');
const scraper = require('./scraper');
const autoResponder = require('./auto-responder');
const whatsappOutreach = require('./whatsapp-outreach');

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

// Serve uploaded assets (resume PDFs, etc.) publicly
app.use('/assets', express.static(path.join(__dirname, '../assets')));

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

// ============================================================
// AUTO-REPLY RECRUITER & HR MESSAGING ROUTES
// ============================================================

/**
 * GET /api/auto-reply/status
 * Returns current status of auto-reply engine, settings and recent replies.
 */
app.get('/api/auto-reply/status', (req, res) => {
  try {
    const status = storage.getAutoReplyStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/auto-reply/settings
 * Returns configured reply template and user preferences.
 */
app.get('/api/auto-reply/settings', (req, res) => {
  try {
    const settings = storage.getAutoReplySettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auto-reply/settings
 * Updates auto-reply configuration (template, candidate info, toggle).
 */
app.post('/api/auto-reply/settings', (req, res) => {
  try {
    const updated = storage.saveAutoReplySettings(req.body);
    // Re-initialize scheduler with new interval / status
    autoResponder.initScheduler();
    res.json({
      success: true,
      message: 'Auto-reply settings saved successfully',
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auto-reply/check-now
 * Triggers an immediate inbox scan and auto-replies to recruiter inquiries.
 */
app.post('/api/auto-reply/check-now', async (req, res) => {
  try {
    if (autoResponder.isScanInProgress()) {
      return res.status(400).json({
        success: false,
        message: 'Auto-reply scan is already currently running in the background.'
      });
    }

    storage.logActivity('info', 'Manual auto-reply check triggered from dashboard');

    // Run in background without blocking response
    autoResponder.runAutoReplyScan().catch(err => {
      console.error('[Auto-Reply Background Scan Error]', err);
    });

    res.json({
      success: true,
      message: 'Inbox scan and auto-reply triggered in the background.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/auto-reply/history
 * Returns full history of all auto-replies sent.
 */
app.get('/api/auto-reply/history', (req, res) => {
  try {
    const history = storage.getAutoRepliesHistory();
    res.json({ success: true, total: history.length, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// INDORE COMPANIES WHATSAPP OUTREACH ROUTES (15-DAY CADENCE)
// ============================================================

/**
 * GET /api/whatsapp/contacts
 * Returns all 47+ Indore IT company contacts with dynamic 15-day cadence status.
 */
app.get('/api/whatsapp/contacts', (req, res) => {
  try {
    const contacts = whatsappOutreach.getContacts();
    const settings = whatsappOutreach.getSettings();
    const dueCount = contacts.filter(c => c.status === 'due').length;
    res.json({
      success: true,
      total: contacts.length,
      dueCount,
      cadenceDays: settings.cadenceDays,
      data: contacts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/whatsapp/settings
 */
app.get('/api/whatsapp/settings', (req, res) => {
  try {
    const settings = whatsappOutreach.getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/whatsapp/settings
 */
app.post('/api/whatsapp/settings', (req, res) => {
  try {
    const updated = whatsappOutreach.saveSettings(req.body);
    res.json({
      success: true,
      message: 'WhatsApp outreach settings updated successfully',
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/whatsapp/mark-sent/:id
 * Marks a company contacted and advances next scheduled date by 15 days.
 */
app.post('/api/whatsapp/mark-sent/:id', (req, res) => {
  try {
    const result = whatsappOutreach.markAsSent(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }
    res.json({
      success: true,
      message: `Marked message sent for ${result.company}. Next follow-up in 15 days!`,
      data: result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/whatsapp/contacts
 * Adds a new IT company contact.
 */
app.post('/api/whatsapp/contacts', (req, res) => {
  try {
    const newContact = whatsappOutreach.addContact(req.body);
    res.json({
      success: true,
      message: `Added ${newContact.company} to outreach database`,
      data: newContact
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/whatsapp/contacts/:id
 */
app.put('/api/whatsapp/contacts/:id', (req, res) => {
  try {
    const updated = whatsappOutreach.updateContact(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }
    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/whatsapp/contacts/:id
 */
app.delete('/api/whatsapp/contacts/:id', (req, res) => {
  try {
    whatsappOutreach.deleteContact(req.params.id);
    res.json({ success: true, message: 'Contact deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/whatsapp/reset-due
 * Resets all contacts to "Due" status for a fresh 15-day outreach round.
 */
app.post('/api/whatsapp/reset-due', (req, res) => {
  try {
    whatsappOutreach.resetAllToDue();
    res.json({ success: true, message: 'All 47+ companies reset to Due for fresh 15-day outreach round' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/whatsapp/login-qr
 * Launches browser with saved profile so user can scan WhatsApp Web QR once.
 */
app.post('/api/whatsapp/login-qr', async (req, res) => {
  try {
    const result = await whatsappOutreach.openWhatsAppLogin();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/whatsapp/auto-send/start
 * Launches Puppeteer to automatically iterate through all Due companies and send WhatsApp messages.
 */
app.post('/api/whatsapp/auto-send/start', async (req, res) => {
  try {
    const result = await whatsappOutreach.startBatchAutoSend(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/whatsapp/auto-send/stop
 * Halts running automated dispatch.
 */
app.post('/api/whatsapp/auto-send/stop', (req, res) => {
  try {
    const result = whatsappOutreach.stopBatchAutoSend();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/whatsapp/auto-send/status
 * Returns current real-time progress of automated WhatsApp dispatcher.
 */
app.get('/api/whatsapp/auto-send/status', (req, res) => {
  try {
    const status = whatsappOutreach.getBatchRuntimeStatus();
    res.json({ success: true, data: status });
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
  autoResponder.initScheduler();

  // Automatically start continuous job application engine on boot
  setTimeout(() => {
    try {
      const status = storage.getRuntimeStatus();
      if (status.status === 'idle') {
        console.log('[Auto-Engine] Auto-starting continuous job auto-apply engine...');
        scraper.startAutomation({
          keyword: 'MERN Stack Developer, React Developer, Node.js Developer, Next.js Developer, Full Stack Developer',
          location: 'India',
          platform: 'both',
          headless: true,
          minDelay: 4000,
          maxDelay: 10000,
          maxApplications: 100
        });
      }
    } catch (e) {
      console.error('[Auto-Engine] Launch error:', e.message);
    }
  }, 2500);
});
