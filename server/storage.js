const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const APPLIED_JOBS_FILE = path.join(DATA_DIR, 'applied_jobs.json');
const COOKIES_FILE = path.join(DATA_DIR, 'cookies.json');
const LOGS_FILE = path.join(DATA_DIR, 'activity_logs.json');
const AUTO_REPLY_SETTINGS_FILE = path.join(DATA_DIR, 'auto_reply_settings.json');
const AUTO_REPLIES_FILE = path.join(DATA_DIR, 'auto_replies.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure default JSON files exist
function initFile(filePath, defaultContent) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2), 'utf-8');
  }
}

const DEFAULT_AUTO_REPLY_SETTINGS = {
  enabled: true,
  candidateName: 'Riya Tiwari',
  candidateEmail: 'riyatiwari2626@gmail.com',
  candidatePhone: '',
  platform: 'both',
  checkIntervalMinutes: 15,
  headless: false,
  replyTemplate: 'Hello, thank you for reaching out! I am actively looking for new opportunities and would love to connect. I am available for an interview or discussion at your convenience. You can also reach me directly at {phone} or {email}. Looking forward to hearing from you! Best regards, {candidateName}'
};

initFile(APPLIED_JOBS_FILE, []);
initFile(COOKIES_FILE, { indeed: [], naukri: [] });
initFile(LOGS_FILE, []);
initFile(AUTO_REPLY_SETTINGS_FILE, DEFAULT_AUTO_REPLY_SETTINGS);
initFile(AUTO_REPLIES_FILE, []);

// In-memory runtime state for live dashboard streaming
let runtimeState = {
  status: 'idle', // 'idle' | 'running' | 'stopping' | 'error'
  currentPlatform: null,
  currentKeyword: '',
  currentLocation: '',
  totalSearched: 0,
  totalApplied: 0,
  totalFailed: 0,
  totalSkipped: 0,
  currentAction: 'System is ready',
  startedAt: null,
  stoppedAt: null,
  recentLogs: []
};

// Safe JSON reader
function readJson(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const content = fs.readFileSync(filePath, 'utf-8');
    return content ? JSON.parse(content) : fallback;
  } catch (err) {
    console.error(`[Storage] Error reading ${filePath}:`, err.message);
    return fallback;
  }
}

// Safe JSON writer
function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[Storage] Error writing ${filePath}:`, err.message);
    return false;
  }
}

// Applied jobs tracking
function getAppliedJobs() {
  return readJson(APPLIED_JOBS_FILE, []);
}

function isJobApplied(jobId, jobUrl) {
  const jobs = getAppliedJobs();
  return jobs.some(j => {
    if (jobId && j.jobId && j.jobId === jobId) return true;
    if (jobUrl && j.url && j.url === jobUrl) return true;
    return false;
  });
}

function recordAppliedJob(jobDetails) {
  const jobs = getAppliedJobs();
  const entry = {
    id: 'app_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    jobId: jobDetails.jobId || 'N/A',
    title: jobDetails.title || 'Unknown Title',
    company: jobDetails.company || 'Unknown Company',
    location: jobDetails.location || 'Unknown Location',
    platform: jobDetails.platform || 'General',
    url: jobDetails.url || '',
    status: jobDetails.status || 'applied', // 'applied' | 'failed' | 'skipped'
    errorReason: jobDetails.errorReason || null,
    appliedAt: new Date().toISOString()
  };

  // Add to top
  jobs.unshift(entry);
  // Keep up to 1000 items in record
  if (jobs.length > 1000) jobs.pop();
  writeJson(APPLIED_JOBS_FILE, jobs);

  if (entry.status === 'applied') {
    runtimeState.totalApplied++;
  } else if (entry.status === 'failed') {
    runtimeState.totalFailed++;
  } else if (entry.status === 'skipped') {
    runtimeState.totalSkipped++;
  }

  return entry;
}

// Activity Logging
function logActivity(level, message, platform = 'system') {
  const logItem = {
    id: Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    timestamp: new Date().toISOString(),
    level, // 'info' | 'success' | 'warning' | 'error'
    platform,
    message
  };

  console.log(`[${logItem.timestamp}] [${level.toUpperCase()}] [${platform}] ${message}`);

  runtimeState.currentAction = message;
  runtimeState.recentLogs.unshift(logItem);
  if (runtimeState.recentLogs.length > 100) {
    runtimeState.recentLogs.pop();
  }

  // Persist to disk asynchronously
  const logs = readJson(LOGS_FILE, []);
  logs.unshift(logItem);
  if (logs.length > 500) logs.length = 500;
  writeJson(LOGS_FILE, logs);

  return logItem;
}

function getLogs() {
  return readJson(LOGS_FILE, []);
}

// Cookie Management
function getCookies(platform) {
  let allCookies = readJson(COOKIES_FILE, { indeed: [], naukri: [] });
  
  // If cookies are empty on disk (e.g. fresh cloud container deploy), fallback to COOKIES_JSON env var
  if ((!allCookies.indeed || allCookies.indeed.length === 0) && process.env.COOKIES_JSON) {
    try {
      const fromEnv = JSON.parse(process.env.COOKIES_JSON);
      if (fromEnv && typeof fromEnv === 'object') {
        allCookies = fromEnv;
      }
    } catch (e) {}
  }

  if (platform) {
    return allCookies[platform.toLowerCase()] || [];
  }
  return allCookies;
}

function saveCookies(platform, cookiesList) {
  const allCookies = readJson(COOKIES_FILE, { indeed: [], naukri: [] });
  allCookies[platform.toLowerCase()] = cookiesList;
  writeJson(COOKIES_FILE, allCookies);
  logActivity('info', `Saved ${cookiesList.length} session cookies for ${platform}`, platform);
  return true;
}

function hasValidCookies(platform) {
  const cookies = getCookies(platform);
  return Array.isArray(cookies) && cookies.length > 0;
}

// Runtime State Helpers
function getRuntimeStatus() {
  const appliedList = getAppliedJobs();
  return {
    ...runtimeState,
    totalRecords: appliedList.length,
    cookiesStatus: {
      indeed: hasValidCookies('indeed'),
      naukri: hasValidCookies('naukri')
    }
  };
}

function updateRuntimeState(updates) {
  runtimeState = { ...runtimeState, ...updates };
  return runtimeState;
}

function resetRuntimeStats() {
  runtimeState.totalSearched = 0;
  runtimeState.totalApplied = 0;
  runtimeState.totalFailed = 0;
  runtimeState.totalSkipped = 0;
  runtimeState.startedAt = new Date().toISOString();
  runtimeState.stoppedAt = null;
  runtimeState.status = 'running';
}

// ============================================================
// Auto-Reply Storage & State
// ============================================================

let autoReplyRuntimeState = {
  isChecking: false,
  lastCheckedAt: null,
  currentAction: 'Auto-responder ready',
  totalReplied: 0
};

function getAutoReplySettings() {
  return readJson(AUTO_REPLY_SETTINGS_FILE, DEFAULT_AUTO_REPLY_SETTINGS);
}

function saveAutoReplySettings(updates) {
  const current = getAutoReplySettings();
  const merged = { ...current, ...updates };
  writeJson(AUTO_REPLY_SETTINGS_FILE, merged);
  logActivity('info', 'Auto-reply settings updated successfully');
  return merged;
}

function getAutoRepliesHistory() {
  return readJson(AUTO_REPLIES_FILE, []);
}

function hasRepliedToThread(platform, threadId) {
  if (!threadId) return false;
  const history = getAutoRepliesHistory();
  return history.some(
    r => r.platform.toLowerCase() === platform.toLowerCase() && r.threadId === String(threadId)
  );
}

function recordAutoReply({ platform, threadId, sender, company, incomingMessage, replySent, status = 'replied', errorReason = null }) {
  const history = getAutoRepliesHistory();
  const entry = {
    id: 'reply_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    platform,
    threadId: String(threadId || 'N/A'),
    sender: sender || 'Recruiter/HR',
    company: company || 'Company',
    incomingMessage: incomingMessage || '',
    replySent: replySent || '',
    status,
    errorReason,
    timestamp: new Date().toISOString()
  };

  history.unshift(entry);
  if (history.length > 500) history.pop();
  writeJson(AUTO_REPLIES_FILE, history);

  if (status === 'replied') {
    autoReplyRuntimeState.totalReplied++;
    logActivity('success', `[Auto-Reply Sent] To ${entry.sender} (${entry.company}) on ${platform}`, platform);
  }

  return entry;
}

function getAutoReplyStatus() {
  const history = getAutoRepliesHistory();
  return {
    ...autoReplyRuntimeState,
    settings: getAutoReplySettings(),
    totalHistoryCount: history.length,
    recentReplies: history.slice(0, 10)
  };
}

function updateAutoReplyStatus(updates) {
  autoReplyRuntimeState = { ...autoReplyRuntimeState, ...updates };
  return autoReplyRuntimeState;
}

module.exports = {
  getAppliedJobs,
  isJobApplied,
  recordAppliedJob,
  logActivity,
  getLogs,
  getCookies,
  saveCookies,
  hasValidCookies,
  getRuntimeStatus,
  getRuntimeState: getRuntimeStatus,
  updateRuntimeState,
  resetRuntimeStats,
  // Auto-Reply
  getAutoReplySettings,
  saveAutoReplySettings,
  getAutoRepliesHistory,
  hasRepliedToThread,
  recordAutoReply,
  getAutoReplyStatus,
  updateAutoReplyStatus,
  DATA_DIR,
  COOKIES_FILE,
  AUTO_REPLIES_FILE,
  AUTO_REPLY_SETTINGS_FILE
};

