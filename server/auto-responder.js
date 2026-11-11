const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const storage = require('./storage');

puppeteer.use(StealthPlugin());

let activeBrowser = null;
let isScanRunning = false;
let schedulerTimer = null;

function microDelay(min = 300, max = 900) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}

function interpolateTemplate(template, vars) {
  let text = template || '';
  const candidatePhone = vars.candidatePhone || vars.phone || '';
  const candidateEmail = vars.candidateEmail || vars.email || '';
  const candidateName = vars.candidateName || vars.name || 'Candidate';

  const map = {
    '{candidateName}': candidateName,
    '{candidateEmail}': candidateEmail,
    '{candidatePhone}': candidatePhone,
    '{phone}': candidatePhone,
    '{email}': candidateEmail,
    '{company}': vars.company || 'your company',
    '{sender}': vars.sender || 'Hiring Team',
    '{jobTitle}': vars.jobTitle || 'the position'
  };

  for (const [key, val] of Object.entries(map)) {
    text = text.split(key).join(val);
  }
  return text.trim();
}

async function injectCookies(page, platform) {
  const cookies = storage.getCookies(platform);
  if (cookies && cookies.length > 0) {
    try {
      const cleanCookies = cookies.map(c => {
        const item = { ...c };
        if (item.sameSite && !['Strict', 'Lax', 'None'].includes(item.sameSite)) {
          delete item.sameSite;
        }
        return item;
      });
      await page.setCookie(...cleanCookies);
      return true;
    } catch (err) {
      let count = 0;
      for (const c of cookies) {
        try {
          const item = { ...c };
          if (item.sameSite && !['Strict', 'Lax', 'None'].includes(item.sameSite)) {
            delete item.sameSite;
          }
          await page.setCookie(item);
          count++;
        } catch (e) {}
      }
      return count > 0;
    }
  }
  return false;
}

async function launchStealthBrowser(headless = false) {
  const isLinux = process.platform === 'linux';
  const isHeadless = isLinux || headless === true || process.env.HEADLESS === 'true';
  const options = {
    headless: isHeadless ? 'new' : false,
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
      '--no-zygote',
      '--disable-infobars',
      '--window-position=0,0'
    ]
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    options.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  return await puppeteer.launch(options);
}

/**
 * Check and Auto-Reply to Indeed Messages
 */
async function checkIndeedMessages(browser, settings) {
  const hasCookies = storage.hasValidCookies('indeed');
  if (!hasCookies) {
    storage.logActivity('warning', 'Indeed cookies missing. Skipping Indeed auto-reply.', 'indeed');
    return { platform: 'Indeed', checked: 0, replied: 0 };
  }

  storage.logActivity('info', 'Checking Indeed messages for recruiter inquiries...', 'indeed');
  storage.updateAutoReplyStatus({ currentAction: 'Opening Indeed Messages inbox...' });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  let checkedCount = 0;
  let repliedCount = 0;

  try {
    // 1. Inject cookies and navigate
    await page.goto('https://in.indeed.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await injectCookies(page, 'indeed');
    await microDelay(1000, 2000);

    // 2. Open Indeed Messages inbox
    storage.logActivity('info', 'Navigating to Indeed Messages portal...', 'indeed');
    await page.goto('https://messages.indeed.com/', { waitUntil: 'networkidle2', timeout: 60000 }).catch(async () => {
      // Fallback
      await page.goto('https://in.indeed.com/messages', { waitUntil: 'domcontentloaded', timeout: 60000 });
    });
    await microDelay(3000, 5000);

    // Check if redirected to login / blocked
    const pageUrl = page.url();
    if (pageUrl.includes('/auth') || pageUrl.includes('/login') || pageUrl.includes('/challenge')) {
      storage.logActivity('warning', 'Indeed session expired or captcha prompted. Please re-run: npm run save-cookies:indeed', 'indeed');
      await page.close();
      return { platform: 'Indeed', checked: 0, replied: 0, error: 'Session expired' };
    }

    // 3. Find conversations list
    storage.updateAutoReplyStatus({ currentAction: 'Scanning Indeed conversation threads...' });
    
    // Selectors covering different Indeed responsive layouts
    const conversationSelectors = [
      '[data-testid*="conversation"]',
      'div[role="listitem"]',
      'a[href*="/conversations/"]',
      'div[data-testid="conversation-list-item"]',
      'li[class*="conversation"]',
      '.icl-NavigationList-item'
    ];

    let conversationElements = [];
    for (const sel of conversationSelectors) {
      const found = await page.$$(sel);
      if (found && found.length > 0) {
        conversationElements = found;
        break;
      }
    }

    storage.logActivity('info', `Found ${conversationElements.length} conversations in Indeed inbox`, 'indeed');
    checkedCount = conversationElements.length;

    if (conversationElements.length === 0) {
      storage.logActivity('info', 'No message conversations found in Indeed inbox.', 'indeed');
      await page.close();
      return { platform: 'Indeed', checked: 0, replied: 0 };
    }

    // Inspect first 10 latest conversations
    const limit = Math.min(conversationElements.length, 10);
    for (let i = 0; i < limit; i++) {
      try {
        // Re-query in case DOM refreshed
        let items = [];
        for (const sel of conversationSelectors) {
          const list = await page.$$(sel);
          if (list && list.length > 0) {
            items = list;
            break;
          }
        }
        if (!items[i]) continue;

        const convEl = items[i];

        // Extract thread info
        const threadInfo = await page.evaluate(el => {
          const text = el.innerText || '';
          const href = el.getAttribute('href') || (el.querySelector('a') ? el.querySelector('a').getAttribute('href') : '') || '';
          const id = el.getAttribute('data-id') || el.getAttribute('data-testid') || href || text.slice(0, 30);
          
          // Check for unread indicators
          const isUnread = Boolean(
            el.querySelector('[class*="unread"], [data-testid*="unread"], .badge, [aria-label*="unread" i]') ||
            el.className.toLowerCase().includes('unread') ||
            (el.style && el.style.fontWeight === 'bold')
          );

          // Header / Company / Sender info
          const senderEl = el.querySelector('strong, h3, h4, [class*="sender"], [class*="title"], [data-testid*="name"]');
          const sender = senderEl ? senderEl.innerText.trim() : (text.split('\n')[0] || 'Recruiter');

          return { id, href, text, isUnread, sender };
        }, convEl);

        const threadId = threadInfo.href || threadInfo.id || `indeed_conv_${i}`;
        
        // Check if we have already replied to this thread
        if (storage.hasRepliedToThread('Indeed', threadId)) {
          storage.logActivity('info', `[Already Replied] Skipping thread with ${threadInfo.sender}`, 'indeed');
          continue;
        }

        storage.logActivity('info', `Opening thread with: "${threadInfo.sender}"...`, 'indeed');
        storage.updateAutoReplyStatus({ currentAction: `Inspecting thread: ${threadInfo.sender}` });

        // Click into the conversation
        await convEl.click().catch(async () => {
          await page.evaluate(el => el.click(), convEl);
        });
        await microDelay(2000, 3500);

        // Check the last message in the thread
        const messageAnalysis = await page.evaluate(() => {
          // Bubbles
          const bubbles = Array.from(document.querySelectorAll(
            '[data-testid*="message-bubble"], [data-qa*="message"], [class*="messageBubble"], [class*="Message-body"], div[role="region"] div[class*="message"]'
          ));

          if (!bubbles || bubbles.length === 0) {
            // General fallback: all chat message elements
            const allP = Array.from(document.querySelectorAll('main p, [role="main"] p'));
            return {
              hasMessages: allP.length > 0,
              isOutgoing: false,
              lastMessageText: allP.length > 0 ? allP[allP.length - 1].innerText.trim() : '',
              company: document.querySelector('h1, h2, [data-testid*="header"]')?.innerText?.trim() || ''
            };
          }

          const lastBubble = bubbles[bubbles.length - 1];
          const text = lastBubble.innerText || '';
          const className = (lastBubble.className || '').toLowerCase();
          const parentClass = (lastBubble.parentElement?.className || '').toLowerCase();

          // Outgoing indicators (messages sent by user)
          const isOutgoing = (
            className.includes('outgoing') ||
            className.includes('me') ||
            className.includes('sender') ||
            className.includes('mine') ||
            parentClass.includes('outgoing') ||
            parentClass.includes('me') ||
            lastBubble.getAttribute('data-is-sender') === 'true'
          );

          const company = document.querySelector('h1, h2, [data-testid*="header"]')?.innerText?.trim() || '';

          return {
            hasMessages: true,
            isOutgoing,
            lastMessageText: text.trim(),
            company
          };
        });

        // If the last message was sent by the candidate/user themselves, don't double reply
        if (messageAnalysis.isOutgoing) {
          storage.logActivity('info', `Last message in thread was already sent by you. Skipping.`, 'indeed');
          continue;
        }

        // Prepare auto-reply message
        const replyText = interpolateTemplate(settings.replyTemplate, {
          candidateName: settings.candidateName,
          candidateEmail: settings.candidateEmail,
          candidatePhone: settings.candidatePhone,
          sender: threadInfo.sender,
          company: messageAnalysis.company || threadInfo.sender
        });

        storage.logActivity('info', `Sending auto-reply to "${threadInfo.sender}"...`, 'indeed');
        storage.updateAutoReplyStatus({ currentAction: `Replying to ${threadInfo.sender}...` });

        // Find input box
        const inputSelectors = [
          'textarea[data-testid*="message-input"]',
          'textarea[placeholder*="Type a reply" i]',
          'textarea[placeholder*="message" i]',
          'div[contenteditable="true"]',
          'textarea.ia-MessageInput',
          'textarea'
        ];

        let inputElement = null;
        for (const sel of inputSelectors) {
          const el = await page.$(sel);
          if (el) {
            inputElement = el;
            break;
          }
        }

        if (!inputElement) {
          storage.logActivity('warning', 'Could not locate message input box in Indeed conversation.', 'indeed');
          continue;
        }

        // Focus and type response
        await inputElement.focus();
        await microDelay(300, 600);
        await page.keyboard.sendCharacter(''); // Ensure focus
        await page.keyboard.type(replyText, { delay: 25 });
        await microDelay(800, 1500);

        // Click send button
        const sendBtnSelectors = [
          'button[data-testid*="send" i]',
          'button[type="submit"]',
          'button[aria-label*="Send" i]',
          'button:has(svg[aria-label*="Send" i])'
        ];

        let sent = false;
        for (const btnSel of sendBtnSelectors) {
          const btn = await page.$(btnSel);
          if (btn) {
            await btn.click();
            sent = true;
            break;
          }
        }

        if (!sent) {
          // Fallback: press Enter key
          await page.keyboard.press('Enter');
          sent = true;
        }

        await microDelay(2000, 4000);

        // Record successful auto-reply
        storage.recordAutoReply({
          platform: 'Indeed',
          threadId,
          sender: threadInfo.sender,
          company: messageAnalysis.company || threadInfo.sender,
          incomingMessage: messageAnalysis.lastMessageText || 'Recruiter inquiry',
          replySent: replyText,
          status: 'replied'
        });

        repliedCount++;
        storage.logActivity('success', `Auto-replied to ${threadInfo.sender} on Indeed!`, 'indeed');
        await microDelay(2000, 4000);
      } catch (threadErr) {
        storage.logActivity('error', `Error processing conversation #${i}: ${threadErr.message}`, 'indeed');
      }
    }

    await page.close();
    return { platform: 'Indeed', checked: checkedCount, replied: repliedCount };
  } catch (err) {
    storage.logActivity('error', `Indeed message scan error: ${err.message}`, 'indeed');
    if (!page.isClosed()) await page.close();
    return { platform: 'Indeed', checked: checkedCount, replied: repliedCount, error: err.message };
  }
}

/**
 * Check and Auto-Reply to Naukri Messages / Inbox
 */
async function checkNaukriMessages(browser, settings) {
  const hasCookies = storage.hasValidCookies('naukri');
  if (!hasCookies) {
    storage.logActivity('warning', 'Naukri cookies missing. Skipping Naukri auto-reply.', 'naukri');
    return { platform: 'Naukri', checked: 0, replied: 0 };
  }

  storage.logActivity('info', 'Checking Naukri inbox for recruiter messages...', 'naukri');
  storage.updateAutoReplyStatus({ currentAction: 'Opening Naukri Messages portal...' });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  let checkedCount = 0;
  let repliedCount = 0;

  try {
    // 1. Inject cookies and navigate
    await page.goto('https://www.naukri.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await injectCookies(page, 'naukri');
    await microDelay(1000, 2000);

    // 2. Open Naukri Inbox
    const inboxUrl = 'https://www.naukri.com/mnjuser/inbox';
    storage.logActivity('info', `Navigating to Naukri Inbox: ${inboxUrl}`, 'naukri');
    await page.goto(inboxUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await microDelay(3000, 5000);

    // Check if session valid
    if (page.url().includes('nlogin') || page.url().includes('login')) {
      storage.logActivity('warning', 'Naukri session expired. Please re-run: npm run save-cookies:naukri', 'naukri');
      await page.close();
      return { platform: 'Naukri', checked: 0, replied: 0, error: 'Session expired' };
    }

    // 3. Scan chats / messages
    storage.updateAutoReplyStatus({ currentAction: 'Scanning Naukri chat threads...' });

    const chatItemSelectors = [
      '.chat-item',
      '.inbox-item',
      '[class*="chatCard"]',
      '[class*="conversation"]',
      'div.thread',
      'li[class*="chat"]'
    ];

    let chatItems = [];
    for (const sel of chatItemSelectors) {
      const found = await page.$$(sel);
      if (found && found.length > 0) {
        chatItems = found;
        break;
      }
    }

    checkedCount = chatItems.length;
    storage.logActivity('info', `Found ${chatItems.length} conversations in Naukri inbox`, 'naukri');

    if (chatItems.length === 0) {
      storage.logActivity('info', 'No unread recruiter conversations in Naukri inbox.', 'naukri');
      await page.close();
      return { platform: 'Naukri', checked: 0, replied: 0 };
    }

    const limit = Math.min(chatItems.length, 5);
    for (let i = 0; i < limit; i++) {
      try {
        let items = [];
        for (const sel of chatItemSelectors) {
          const list = await page.$$(sel);
          if (list && list.length > 0) {
            items = list;
            break;
          }
        }
        if (!items[i]) continue;

        const chatEl = items[i];
        const info = await page.evaluate(el => {
          const text = el.innerText || '';
          const sender = el.querySelector('strong, [class*="name"], h4')?.innerText?.trim() || text.split('\n')[0] || 'Recruiter';
          const isUnread = Boolean(el.querySelector('.unread, [class*="unread"], .dot'));
          return { text, sender, isUnread };
        }, chatEl);

        const threadId = `naukri_thread_${info.sender.replace(/[^a-zA-Z0-9]/g, '_')}`;

        if (storage.hasRepliedToThread('Naukri', threadId)) {
          storage.logActivity('info', `[Already Replied] Skipping thread with ${info.sender}`, 'naukri');
          continue;
        }

        storage.logActivity('info', `Opening Naukri chat with: "${info.sender}"...`, 'naukri');
        await chatEl.click();
        await microDelay(2000, 3000);

        const replyText = interpolateTemplate(settings.replyTemplate, {
          candidateName: settings.candidateName,
          candidateEmail: settings.candidateEmail,
          candidatePhone: settings.candidatePhone,
          sender: info.sender,
          company: info.sender
        });

        // Input selector for Naukri chat
        const inputSelectors = [
          'textarea[placeholder*="Type a message" i]',
          'textarea[placeholder*="message" i]',
          'input[type="text"][placeholder*="message" i]',
          'div[contenteditable="true"]',
          'textarea'
        ];

        let inputEl = null;
        for (const sel of inputSelectors) {
          const el = await page.$(sel);
          if (el) {
            inputEl = el;
            break;
          }
        }

        if (!inputEl) {
          storage.logActivity('warning', 'Could not locate input field in Naukri chat.', 'naukri');
          continue;
        }

        await inputEl.focus();
        await microDelay(300, 600);
        await page.keyboard.type(replyText, { delay: 25 });
        await microDelay(500, 1000);

        // Click send
        const sendBtn = await page.$('button[type="submit"], button.send-btn, [class*="send"]');
        if (sendBtn) {
          await sendBtn.click();
        } else {
          await page.keyboard.press('Enter');
        }

        await microDelay(2000, 3000);

        storage.recordAutoReply({
          platform: 'Naukri',
          threadId,
          sender: info.sender,
          company: info.sender,
          incomingMessage: info.text.slice(0, 120),
          replySent: replyText,
          status: 'replied'
        });

        repliedCount++;
        storage.logActivity('success', `Auto-replied to ${info.sender} on Naukri!`, 'naukri');
      } catch (chatErr) {
        storage.logActivity('error', `Error processing Naukri chat #${i}: ${chatErr.message}`, 'naukri');
      }
    }

    await page.close();
    return { platform: 'Naukri', checked: checkedCount, replied: repliedCount };
  } catch (err) {
    storage.logActivity('error', `Naukri message scan error: ${err.message}`, 'naukri');
    if (!page.isClosed()) await page.close();
    return { platform: 'Naukri', checked: checkedCount, replied: repliedCount, error: err.message };
  }
}

/**
 * Main Trigger Function for Scanning and Auto-Replying
 */
async function runAutoReplyScan() {
  if (isScanRunning) {
    storage.logActivity('warning', 'Auto-reply scan is already currently running.');
    return { success: false, message: 'Scan already in progress' };
  }

  const settings = storage.getAutoReplySettings();
  if (!settings.enabled) {
    storage.logActivity('info', 'Auto-reply is currently disabled in settings.');
    return { success: false, message: 'Auto-reply is disabled' };
  }

  isScanRunning = true;
  storage.updateAutoReplyStatus({
    isChecking: true,
    currentAction: 'Starting auto-reply scan...'
  });

  const results = [];
  try {
    activeBrowser = await launchStealthBrowser(Boolean(settings.headless));

    // Target platforms
    const targetPlatform = (settings.platform || 'both').toLowerCase();

    if (targetPlatform === 'indeed' || targetPlatform === 'both') {
      const indeedRes = await checkIndeedMessages(activeBrowser, settings);
      results.push(indeedRes);
    }

    if (targetPlatform === 'naukri' || targetPlatform === 'both') {
      const naukriRes = await checkNaukriMessages(activeBrowser, settings);
      results.push(naukriRes);
    }

    storage.logActivity('info', 'Auto-reply inbox scan completed successfully.');
  } catch (err) {
    storage.logActivity('error', `Auto-reply scanner failed: ${err.message}`);
  } finally {
    if (activeBrowser) {
      try {
        await activeBrowser.close();
      } catch (e) {}
      activeBrowser = null;
    }
    isScanRunning = false;
    storage.updateAutoReplyStatus({
      isChecking: false,
      lastCheckedAt: new Date().toISOString(),
      currentAction: 'Auto-reply scan completed'
    });
  }

  return { success: true, results };
}

/**
 * Start Background Periodic Scheduler
 */
function initScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  const settings = storage.getAutoReplySettings();
  if (!settings.enabled) {
    return;
  }

  const intervalMs = Math.max(5, settings.checkIntervalMinutes || 15) * 60 * 1000;
  console.log(`[Auto-Responder] Background scheduler active: running every ${settings.checkIntervalMinutes || 15} minutes.`);

  schedulerTimer = setInterval(() => {
    const currentSettings = storage.getAutoReplySettings();
    if (currentSettings.enabled && !isScanRunning) {
      console.log('[Auto-Responder] Periodic scheduled check starting...');
      runAutoReplyScan().catch(err => {
        console.error('[Auto-Responder Scheduler Error]', err);
      });
    }
  }, intervalMs);
}

module.exports = {
  runAutoReplyScan,
  initScheduler,
  interpolateTemplate,
  isScanInProgress: () => isScanRunning
};
