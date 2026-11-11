const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const storage = require('./storage');

puppeteer.use(StealthPlugin());

const CONTACTS_FILE = path.join(__dirname, 'data/whatsapp_contacts.json');
const SETTINGS_FILE = path.join(__dirname, 'data/whatsapp_settings.json');
const LOGS_FILE = path.join(__dirname, 'data/whatsapp_dispatch_logs.json');
const USER_DATA_DIR = path.join(__dirname, 'data/whatsapp_browser_profile');

// Ensure directories and default files exist
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}
if (!fs.existsSync(LOGS_FILE)) {
  fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// Runtime batch state
let batchState = {
  isRunning: false,
  currentIndex: 0,
  totalToProcess: 0,
  currentCompany: '',
  currentPhone: '',
  currentAction: 'Idle',
  successCount: 0,
  failedCount: 0,
  startedAt: null,
  stoppedAt: null
};

let activeBrowser = null;
let stopRequested = false;

function microDelay(min = 1000, max = 2500) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}

function readJson(file, fallback = []) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const content = fs.readFileSync(file, 'utf-8');
    return content ? JSON.parse(content) : fallback;
  } catch (err) {
    console.error(`[WhatsApp Outreach] Error reading ${file}:`, err.message);
    return fallback;
  }
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[WhatsApp Outreach] Error writing ${file}:`, err.message);
    return false;
  }
}

function getSettings() {
  return readJson(SETTINGS_FILE, {
    candidateName: 'Riya Tiwari',
    candidatePhone: '+91 97553 49572',
    candidateEmail: 'riyatiwari2626@gmail.com',
    cadenceDays: 15,
    autoSendEnabled: false,
    delaySeconds: 15,
    messageTemplate: 'Hello {contactPerson} / {company} Team,\n\nHope you are doing well!\n\nI am {candidateName}, a MERN Stack, Frontend & Full-Stack Developer based in Indore, actively looking for developer opportunities.\n\n💻 Core Technical Skills:\n• Frontend: React.js, Next.js, Redux Toolkit, Tailwind CSS, TypeScript\n• Backend: Node.js, Express.js, REST APIs\n• Database: MongoDB, PostgreSQL\n• Tools: Git, Postman, Docker\n\nIf your team at {company} has any openings for Frontend or MERN/Full-Stack Developers, I would love to share my resume and connect for a quick discussion.\n\n📞 Phone: {candidatePhone}\n✉️ Email: {candidateEmail}\n\nLooking forward to hearing from you. Thank you!\n\nBest regards,\n{candidateName}'
  });
}

function saveSettings(updates) {
  const current = getSettings();
  const merged = { ...current, ...updates };
  writeJson(SETTINGS_FILE, merged);
  return merged;
}

function generateMessage(contact, settings) {
  let text = settings.messageTemplate || '';
  const map = {
    '{company}': contact.company || 'Team',
    '{contactPerson}': contact.contactPerson || 'Hiring Manager',
    '{candidateName}': settings.candidateName || 'Candidate',
    '{candidatePhone}': settings.candidatePhone || '',
    '{candidateEmail}': settings.candidateEmail || '',
    '{portfolioUrl}': settings.portfolioUrl || '',
    '{githubUrl}': settings.githubUrl || ''
  };

  for (const [key, val] of Object.entries(map)) {
    text = text.split(key).join(val);
  }
  return text.trim();
}

function getContacts() {
  const contacts = readJson(CONTACTS_FILE, []);
  const settings = getSettings();
  const cadenceDays = Number(settings.cadenceDays) || 15;
  const now = new Date();

  return contacts.map(c => {
    let daysSince = null;
    let daysUntilNext = 0;
    let computedStatus = 'due';

    if (c.lastSentAt) {
      const lastDate = new Date(c.lastSentAt);
      const diffMs = now.getTime() - lastDate.getTime();
      daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      daysUntilNext = Math.max(0, cadenceDays - daysSince);

      if (daysSince >= cadenceDays) {
        computedStatus = 'due';
      } else {
        computedStatus = 'sent';
      }
    } else {
      computedStatus = 'due';
      daysUntilNext = 0;
    }

    const message = generateMessage(c, settings);
    const waLink = `https://wa.me/${c.cleanPhone}?text=${encodeURIComponent(message)}`;
    const webWaLink = `https://web.whatsapp.com/send?phone=${c.cleanPhone}&text=${encodeURIComponent(message)}`;

    return {
      ...c,
      status: computedStatus,
      daysSinceLastSent: daysSince,
      daysUntilNext,
      generatedMessage: message,
      waLink,
      webWaLink
    };
  });
}

function saveContacts(contactsList) {
  const raw = contactsList.map(c => ({
    id: c.id,
    company: c.company,
    contactPerson: c.contactPerson || 'HR / Hiring Team',
    phone: c.phone,
    cleanPhone: (c.cleanPhone || c.phone || '').replace(/[^0-9]/g, ''),
    location: c.location || 'Indore',
    status: c.status || 'due',
    lastSentAt: c.lastSentAt || null,
    nextScheduledAt: c.nextScheduledAt || null,
    notes: c.notes || ''
  }));
  return writeJson(CONTACTS_FILE, raw);
}

function markAsSent(contactId) {
  const contacts = readJson(CONTACTS_FILE, []);
  const settings = getSettings();
  const cadenceDays = Number(settings.cadenceDays) || 15;
  const now = new Date();
  const nextDate = new Date(now.getTime() + cadenceDays * 24 * 60 * 60 * 1000);

  const idx = contacts.findIndex(c => c.id === contactId);
  if (idx !== -1) {
    contacts[idx].lastSentAt = now.toISOString();
    contacts[idx].nextScheduledAt = nextDate.toISOString();
    contacts[idx].status = 'sent';
    writeJson(CONTACTS_FILE, contacts);

    logDispatch({
      contactId,
      company: contacts[idx].company,
      phone: contacts[idx].phone,
      sentAt: now.toISOString(),
      type: 'automated'
    });

    storage.logActivity('success', `[WhatsApp Outreach] Message sent to ${contacts[idx].company} (+15 days follow-up set)`, 'whatsapp');
    return contacts[idx];
  }
  return null;
}

function logDispatch(entry) {
  const logs = readJson(LOGS_FILE, []);
  logs.unshift({
    id: 'wlog_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    ...entry
  });
  if (logs.length > 500) logs.length = 500;
  writeJson(LOGS_FILE, logs);
}

function getDispatchLogs() {
  return readJson(LOGS_FILE, []);
}

function addContact(contactData) {
  const contacts = readJson(CONTACTS_FILE, []);
  const cleanPhone = (contactData.phone || '').replace(/[^0-9]/g, '');
  const newContact = {
    id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    company: contactData.company || 'New IT Company',
    contactPerson: contactData.contactPerson || 'HR / Hiring Team',
    phone: contactData.phone || '',
    cleanPhone,
    location: contactData.location || 'Indore',
    status: 'due',
    lastSentAt: null,
    nextScheduledAt: new Date().toISOString(),
    notes: contactData.notes || ''
  };

  contacts.unshift(newContact);
  writeJson(CONTACTS_FILE, contacts);
  storage.logActivity('info', `Added new Indore company to WhatsApp outreach: ${newContact.company}`, 'whatsapp');
  return newContact;
}

function deleteContact(contactId) {
  let contacts = readJson(CONTACTS_FILE, []);
  const found = contacts.find(c => c.id === contactId);
  contacts = contacts.filter(c => c.id !== contactId);
  writeJson(CONTACTS_FILE, contacts);
  if (found) {
    storage.logActivity('info', `Removed company from WhatsApp outreach: ${found.company}`, 'whatsapp');
  }
  return true;
}

function updateContact(contactId, updates) {
  const contacts = readJson(CONTACTS_FILE, []);
  const idx = contacts.findIndex(c => c.id === contactId);
  if (idx !== -1) {
    if (updates.phone) {
      updates.cleanPhone = updates.phone.replace(/[^0-9]/g, '');
    }
    contacts[idx] = { ...contacts[idx], ...updates };
    writeJson(CONTACTS_FILE, contacts);
    return contacts[idx];
  }
  return null;
}

function resetAllToDue() {
  const contacts = readJson(CONTACTS_FILE, []);
  const updated = contacts.map(c => ({
    ...c,
    status: 'due',
    lastSentAt: null,
    nextScheduledAt: new Date().toISOString()
  }));
  writeJson(CONTACTS_FILE, updated);
  storage.logActivity('info', `Reset all ${contacts.length} companies to Due status for immediate outreach`, 'whatsapp');
  return true;
}

// ============================================================
// AUTOMATED WHATSAPP WEB DISPATCHER (PUPPETEER PERSISTENT SESSION)
// ============================================================

/**
 * Open WhatsApp Web for one-time QR login scan
 */
async function openWhatsAppLogin() {
  const isLinux = process.platform === 'linux';
  storage.logActivity('info', 'Launching browser for WhatsApp Web QR login scan...', 'whatsapp');
  const launchOptions = {
    headless: isLinux ? 'new' : (process.env.HEADLESS === 'true' ? 'new' : false),
    userDataDir: USER_DATA_DIR,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--no-first-run',
      '--no-zygote'
    ]
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const browser = await puppeteer.launch(launchOptions);

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );
  await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
  return { success: true, message: 'WhatsApp Web login window opened. Please scan QR on your phone.' };
}

/**
 * Start Automated Batch Dispatch to all "due" Indore companies
 */
async function startBatchAutoSend(options = {}) {
  if (batchState.isRunning) {
    return { success: false, message: 'Batch dispatch is already running.' };
  }

  stopRequested = false;
  const contacts = getContacts().filter(c => c.status === 'due');
  const settings = getSettings();
  const delaySec = Math.max(10, options.delaySeconds || settings.delaySeconds || 15);

  if (contacts.length === 0) {
    return { success: false, message: 'All companies are already contacted! None are due today.' };
  }

  batchState = {
    isRunning: true,
    currentIndex: 0,
    totalToProcess: contacts.length,
    currentCompany: contacts[0].company,
    currentPhone: contacts[0].phone,
    currentAction: `Starting batch dispatch for ${contacts.length} companies...`,
    successCount: 0,
    failedCount: 0,
    startedAt: new Date().toISOString(),
    stoppedAt: null
  };

  storage.logActivity('info', `[WhatsApp Automation] Launching automated dispatch for ${contacts.length} companies (Delay: ${delaySec}s)...`, 'whatsapp');

  (async () => {
    try {
      const isLinux = process.platform === 'linux';
      const batchLaunchOptions = {
        headless: isLinux ? 'new' : (process.env.HEADLESS === 'true' ? 'new' : false),
        userDataDir: USER_DATA_DIR,
        defaultViewport: null,
        args: [
          '--start-maximized',
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--no-first-run',
          '--no-zygote'
        ]
      };
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        batchLaunchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }
      activeBrowser = await puppeteer.launch(batchLaunchOptions);

      const page = await activeBrowser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      );

      // Verify WhatsApp Web session
      batchState.currentAction = 'Verifying WhatsApp Web authenticated session...';
      await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await microDelay(4000, 7000);

      // Check if QR code is showing (meaning not logged in)
      const qrEl = await page.$('canvas[aria-label="Scan me!"]');
      if (qrEl) {
        storage.logActivity('warning', 'WhatsApp Web not logged in. Please scan QR code once to authenticate.', 'whatsapp');
        batchState.currentAction = 'WhatsApp Web requires one-time QR login scan.';
        batchState.isRunning = false;
        return;
      }

      // Loop over due contacts
      for (let i = 0; i < contacts.length; i++) {
        if (stopRequested) {
          storage.logActivity('warning', 'Batch WhatsApp dispatch stopped by user.', 'whatsapp');
          break;
        }

        const contact = contacts[i];
        batchState.currentIndex = i + 1;
        batchState.currentCompany = contact.company;
        batchState.currentPhone = contact.phone;
        batchState.currentAction = `Navigating to ${contact.company} (${contact.phone})... [${i+1}/${contacts.length}]`;

        storage.logActivity('info', `[Sending ${i+1}/${contacts.length}] Opening chat with ${contact.company} (${contact.phone})...`, 'whatsapp');

        try {
          const directUrl = `https://web.whatsapp.com/send?phone=${contact.cleanPhone}&text=${encodeURIComponent(contact.generatedMessage)}`;
          await page.goto(directUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
          await microDelay(4000, 7000);

          // Check if invalid phone popup appears
          const invalidPopup = await page.$('div[data-animate-modal-popup="true"]');
          if (invalidPopup) {
            storage.logActivity('warning', `Phone ${contact.phone} is invalid or not registered on WhatsApp. Skipping.`, 'whatsapp');
            batchState.failedCount++;
            continue;
          }

          // Locate send button or press enter in text box
          const sendBtnSelectors = [
            'button[aria-label*="Send" i]',
            'span[data-icon="send"]',
            'button[data-testid*="send" i]'
          ];

          let sent = false;
          for (const sel of sendBtnSelectors) {
            const btn = await page.$(sel);
            if (btn) {
              await btn.click();
              sent = true;
              break;
            }
          }

          if (!sent) {
            // Press Enter in input box
            const inputEl = await page.$('footer div[contenteditable="true"], div[role="textbox"]');
            if (inputEl) {
              await inputEl.focus();
              await page.keyboard.press('Enter');
              sent = true;
            }
          }

          if (sent) {
            await microDelay(2000, 3500);
            markAsSent(contact.id);
            batchState.successCount++;
            storage.logActivity('success', `✓ Successfully sent WhatsApp hiring message to ${contact.company}!`, 'whatsapp');
          } else {
            batchState.failedCount++;
            storage.logActivity('warning', `Could not find Send button for ${contact.company}.`, 'whatsapp');
          }

          // Human delay between messages (15 to 25s) to stay 100% safe from WhatsApp spam flags
          if (i < contacts.length - 1 && !stopRequested) {
            batchState.currentAction = `Cooling down for ${delaySec}s before next contact...`;
            await microDelay(delaySec * 1000, (delaySec + 5) * 1000);
          }
        } catch (itemErr) {
          batchState.failedCount++;
          storage.logActivity('error', `Error sending to ${contact.company}: ${itemErr.message}`, 'whatsapp');
        }
      }

      batchState.currentAction = `Batch completed! Sent: ${batchState.successCount}, Failed/Skipped: ${batchState.failedCount}`;
      storage.logActivity('success', `WhatsApp batch dispatch completed (${batchState.successCount} sent)!`, 'whatsapp');
    } catch (err) {
      storage.logActivity('error', `Batch dispatch halted: ${err.message}`, 'whatsapp');
    } finally {
      if (activeBrowser) {
        try {
          await activeBrowser.close();
        } catch (e) {}
        activeBrowser = null;
      }
      batchState.isRunning = false;
      batchState.stoppedAt = new Date().toISOString();
    }
  })();

  return { success: true, message: `Batch dispatch started for ${contacts.length} companies.` };
}

function stopBatchAutoSend() {
  stopRequested = true;
  if (activeBrowser) {
    try {
      activeBrowser.close();
    } catch (e) {}
    activeBrowser = null;
  }
  batchState.isRunning = false;
  batchState.currentAction = 'Batch dispatch stopped.';
  storage.logActivity('warning', 'Stop signal sent to WhatsApp automated dispatcher.', 'whatsapp');
  return { success: true, message: 'Stopped batch dispatch' };
}

function getBatchRuntimeStatus() {
  return batchState;
}

module.exports = {
  getContacts,
  saveContacts,
  getSettings,
  saveSettings,
  generateMessage,
  markAsSent,
  addContact,
  deleteContact,
  updateContact,
  resetAllToDue,
  getDispatchLogs,
  openWhatsAppLogin,
  startBatchAutoSend,
  stopBatchAutoSend,
  getBatchRuntimeStatus
};
