const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const APPLIED_JOBS_FILE = path.join(DATA_DIR, 'applied_jobs.json');
const COOKIES_FILE = path.join(DATA_DIR, 'cookies.json');
const LOGS_FILE = path.join(DATA_DIR, 'activity_logs.json');

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

initFile(APPLIED_JOBS_FILE, []);
initFile(COOKIES_FILE, { indeed: [], naukri: [] });
initFile(LOGS_FILE, []);

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
  const allCookies = readJson(COOKIES_FILE, { indeed: [], naukri: [] });
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
  updateRuntimeState,
  resetRuntimeStats,
  DATA_DIR,
  COOKIES_FILE
};

