const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');
const storage = require('./storage');

// Register stealth plugin to bypass bot detections (Cloudflare, Akamai, etc.)
puppeteer.use(StealthPlugin());

let activeBrowser = null;
let activePage = null;
let shouldStop = false;

// Randomized human delay helper
function randomDelay(min = 5000, max = 15000) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Small randomized micro-delay for keystrokes and clicks
function microDelay(min = 200, max = 800) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Human-like mouse wiggle
async function humanScroll(page) {
  try {
    await page.evaluate(async () => {
      const distance = Math.floor(Math.random() * 300) + 150;
      window.scrollBy({ top: distance, behavior: 'smooth' });
    });
    await microDelay(400, 900);
  } catch (e) {
    // ignore scroll errors if page navigated
  }
}

// Check if user requested stop
function checkStopRequested() {
  if (shouldStop) {
    storage.logActivity('warning', 'Stop signal received. Safely halting automation...');
    return true;
  }
  return false;
}

// Launch browser with stealth settings
async function launchBrowser(headless = false) {
  storage.logActivity('info', `Launching stealth browser (headless: ${headless})...`);
  
  const launchOptions = {
    headless: headless ? 'new' : false,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list'
    ]
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const browser = await puppeteer.launch(launchOptions);

  return browser;
}

// Set up page with headers, user agent, and listeners
async function setupPage(browser) {
  const page = await browser.newPage();
  
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8'
  });

  // Block images and heavy fonts optionally if headless, but keep them for full compatibility
  return page;
}

// Inject cookies if available
async function injectCookies(page, platform) {
  const cookies = storage.getCookies(platform);
  if (cookies && cookies.length > 0) {
    try {
      storage.logActivity('info', `Injecting ${cookies.length} session cookies for ${platform}...`, platform);
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
      // Graceful fallback: inject cookies one by one
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
      storage.logActivity('info', `Injected ${count}/${cookies.length} valid cookies for ${platform}`, platform);
      return count > 0;
    }
  } else {
    storage.logActivity('warning', `No saved session cookies found for ${platform}. Applications may require login.`, platform);
  }
  return false;
}

// -------------------------------------------------------------
// INDEED AUTOMATION ENGINE
// -------------------------------------------------------------
async function runIndeedAutomation(options) {
  const { keyword, location, resumePath, minDelay, maxDelay, maxApplications } = options;
  storage.logActivity('info', `Starting Indeed automation for "${keyword}" in "${location}"`, 'indeed');

  if (!activeBrowser) {
    activeBrowser = await launchBrowser(options.headless);
  }
  const page = await setupPage(activeBrowser);
  activePage = page;

  try {
    // 1. Navigate to Indeed India / Global and inject cookies
    await page.goto('https://in.indeed.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await injectCookies(page, 'indeed');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await microDelay(2000, 3500);

    // 2. Build search URL
    const searchUrl = `https://in.indeed.com/jobs?q=${encodeURIComponent(keyword)}&l=${encodeURIComponent(location)}&sort=date`;
    storage.logActivity('info', `Navigating to Indeed Search: ${searchUrl}`, 'indeed');
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    let appliedThisRun = 0;
    let pageNum = 1;

    while (appliedThisRun < maxApplications && !checkStopRequested()) {
      storage.logActivity('info', `Parsing Indeed search results page #${pageNum}`, 'indeed');
      await humanScroll(page);

      // Extract job cards
      const jobCards = await page.evaluate(() => {
        const cards = [];
        const items = document.querySelectorAll('[data-jk], .job_seen_beacon, .result');
        
        items.forEach(el => {
          const jk = el.getAttribute('data-jk') || el.closest('[data-jk]')?.getAttribute('data-jk');
          const titleEl = el.querySelector('h2.jobTitle span, a[data-jk] span, .jobTitle');
          const companyEl = el.querySelector('[data-testid="company-name"], .companyName');
          const locationEl = el.querySelector('[data-testid="text-location"], .companyLocation');
          const easyApplyEl = el.querySelector('[data-testid="indeedApply"], .iaIcon, .iaLabel');

          if (jk && titleEl) {
            cards.push({
              jobId: jk,
              title: titleEl.innerText.trim(),
              company: companyEl ? companyEl.innerText.trim() : 'Unknown Company',
              location: locationEl ? locationEl.innerText.trim() : 'Unknown Location',
              hasEasyApply: !!easyApplyEl,
              url: `https://in.indeed.com/viewjob?jk=${jk}`
            });
          }
        });
        return cards;
      });

      storage.logActivity('info', `Found ${jobCards.length} jobs on page ${pageNum}`, 'indeed');

      if (jobCards.length === 0) {
        storage.logActivity('warning', 'No more job listings found on Indeed or captcha presented.', 'indeed');
        break;
      }

      for (const card of jobCards) {
        if (checkStopRequested()) break;
        if (appliedThisRun >= maxApplications) break;

        // Duplicate Check
        if (storage.isJobApplied(card.jobId, card.url)) {
          storage.logActivity('info', `[Duplicate Skipped] Already applied to "${card.title}" at "${card.company}"`, 'indeed');
          continue;
        }

        storage.logActivity('info', `Evaluating: "${card.title}" at "${card.company}" (${card.hasEasyApply ? 'Easily Apply' : 'Standard Apply'})`, 'indeed');

        try {
          // Open job page in new tab or navigate directly
          const jobPage = await activeBrowser.newPage();
          await jobPage.goto(card.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await microDelay(1500, 3000);

          // Find apply button
          const applyBtn = await jobPage.$('[id*="indeedApplyButton"], button.ia-IndeedApplyButton, [data-testid="indeedApply"]');
          
          if (applyBtn) {
            storage.logActivity('info', `Clicking "Apply now" for "${card.title}"...`, 'indeed');
            await applyBtn.click();
            await microDelay(2000, 4000);

            // Handle multi-step popup/modal if present
            const applicationSuccess = await handleIndeedModal(jobPage, resumePath);
            
            if (applicationSuccess) {
              appliedThisRun++;
              storage.recordAppliedJob({
                jobId: card.jobId,
                title: card.title,
                company: card.company,
                location: card.location,
                platform: 'Indeed',
                url: card.url,
                status: 'applied'
              });
              storage.logActivity('success', `Successfully applied to "${card.title}" at ${card.company}! (${appliedThisRun}/${maxApplications})`, 'indeed');
            } else {
              storage.recordAppliedJob({
                jobId: card.jobId,
                title: card.title,
                company: card.company,
                location: card.location,
                platform: 'Indeed',
                url: card.url,
                status: 'skipped',
                errorReason: 'Multi-question test or external redirect required'
              });
            }
          } else {
            storage.recordAppliedJob({
              jobId: card.jobId,
              title: card.title,
              company: card.company,
              location: card.location,
              platform: 'Indeed',
              url: card.url,
              status: 'skipped',
              errorReason: 'External employer site (Not Indeed Easy Apply)'
            });
            storage.logActivity('info', `Skipped non-Easy Apply job: "${card.title}"`, 'indeed');
          }

          await jobPage.close();

          // Human-like pause before next job
          const waitTime = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
          storage.logActivity('info', `Cooling down for ${(waitTime / 1000).toFixed(1)}s before next application...`, 'indeed');
          await new Promise(r => setTimeout(r, waitTime));

        } catch (jobErr) {
          storage.logActivity('error', `Error processing "${card.title}": ${jobErr.message}`, 'indeed');
          storage.recordAppliedJob({
            jobId: card.jobId,
            title: card.title,
            company: card.company,
            location: card.location,
            platform: 'Indeed',
            url: card.url,
            status: 'failed',
            errorReason: jobErr.message
          });
        }
      }

      // Check next page
      const nextBtn = await page.$('a[data-testid="pagination-page-next"], [aria-label="Next Page"]');
      if (nextBtn && !checkStopRequested() && appliedThisRun < maxApplications) {
        pageNum++;
        await nextBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
        await microDelay(3000, 6000);
      } else {
        break;
      }
    }

  } catch (err) {
    storage.logActivity('error', `Indeed scraping halted: ${err.message}`, 'indeed');
  } finally {
    if (page && !page.isClosed()) await page.close().catch(() => {});
  }
}

// Handle Indeed Application Modal steps
async function handleIndeedModal(page, resumePath) {
  try {
    let maxSteps = 7;
    let step = 0;

    while (step < maxSteps) {
      step++;
      await microDelay(1200, 2500);

      // Check if resume upload is requested
      if (resumePath && fs.existsSync(resumePath)) {
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          storage.logActivity('info', `Attaching resume from ${resumePath}`, 'indeed');
          await fileInput.uploadFile(resumePath);
          await microDelay(1500, 2500);
        }
      }

      // Check if application is already completed
      const isComplete = await page.evaluate(() => {
        const bodyText = document.body.innerText || '';
        return bodyText.includes('Your application has been submitted') ||
               bodyText.includes('Application submitted') ||
               bodyText.includes('Return to job search');
      });

      if (isComplete) {
        return true;
      }

      // Look for Continue, Next, Review, or Submit button
      const actionButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        return buttons.find(b => {
          const txt = (b.innerText || b.value || '').trim().toLowerCase();
          return txt.includes('submit your application') ||
                 txt.includes('submit application') ||
                 txt.includes('review your application') ||
                 txt.includes('continue') ||
                 txt.includes('next');
        }) || null;
      });

      if (actionButton && actionButton.asElement()) {
        const btnText = await page.evaluate(el => el.innerText || el.value, actionButton);
        await actionButton.click();
        await microDelay(1500, 3000);

        if (btnText && btnText.toLowerCase().includes('submit')) {
          await microDelay(2000, 4000);
          return true;
        }
      } else {
        // No recognizable progress button found (e.g. required complex assessment questions)
        break;
      }
    }
    return false;
  } catch (err) {
    return false;
  }
}

// -------------------------------------------------------------
// NAUKRI AUTOMATION ENGINE
// -------------------------------------------------------------
async function runNaukriAutomation(options) {
  const { keyword, location, resumePath, minDelay, maxDelay, maxApplications } = options;
  storage.logActivity('info', `Starting Naukri.com automation for "${keyword}" in "${location}"`, 'naukri');

  if (!activeBrowser) {
    activeBrowser = await launchBrowser(options.headless);
  }
  const page = await setupPage(activeBrowser);
  activePage = page;

  try {
    // 1. Visit Naukri and inject cookies
    await page.goto('https://www.naukri.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await injectCookies(page, 'naukri');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await microDelay(2500, 4000);

    // 2. Format search URL
    const cleanKeyword = keyword.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const cleanLocation = location ? location.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') : '';
    const searchUrl = cleanLocation 
      ? `https://www.naukri.com/${cleanKeyword}-jobs-in-${cleanLocation}`
      : `https://www.naukri.com/${cleanKeyword}-jobs`;

    storage.logActivity('info', `Navigating to Naukri search: ${searchUrl}`, 'naukri');
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    let appliedThisRun = 0;
    let pageNum = 1;

    while (appliedThisRun < maxApplications && !checkStopRequested()) {
      storage.logActivity('info', `Parsing Naukri search results page #${pageNum}`, 'naukri');
      await humanScroll(page);

      // Extract job tuples
      const jobCards = await page.evaluate(() => {
        const list = [];
        const tuples = document.querySelectorAll('.srp-jobtuple-wrapper, .jobTuple, .cust-job-tuple');

        tuples.forEach(tuple => {
          const titleEl = tuple.querySelector('a.title, .job-title');
          const compEl = tuple.querySelector('a.comp-name, .company-name, .compName');
          const locEl = tuple.querySelector('.loc-wrap, .location, .locWdth');
          const url = titleEl ? titleEl.href : null;
          const jobId = tuple.getAttribute('data-job-id') || (url ? url.split('?')[0].split('-').pop() : null);

          if (titleEl && url) {
            list.push({
              jobId: jobId || 'NAUKRI_' + Math.random().toString(36).substr(2, 7),
              title: titleEl.innerText.trim(),
              company: compEl ? compEl.innerText.trim() : 'Unknown Employer',
              location: locEl ? locEl.innerText.trim() : 'India',
              url
            });
          }
        });
        return list;
      });

      storage.logActivity('info', `Found ${jobCards.length} job tuples on Naukri`, 'naukri');

      if (jobCards.length === 0) {
        storage.logActivity('warning', 'No jobs extracted from Naukri page.', 'naukri');
        break;
      }

      for (const card of jobCards) {
        if (checkStopRequested()) break;
        if (appliedThisRun >= maxApplications) break;

        // Duplicate Check
        if (storage.isJobApplied(card.jobId, card.url)) {
          storage.logActivity('info', `[Duplicate Skipped] Already applied to "${card.title}" on Naukri`, 'naukri');
          continue;
        }

        storage.logActivity('info', `Checking Naukri job: "${card.title}" at "${card.company}"`, 'naukri');

        try {
          const jobPage = await activeBrowser.newPage();
          await jobPage.goto(card.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await microDelay(2000, 3500);

          // Find apply button: e.g. #apply-button, .apply-button, button:contains("Apply")
          const applyResult = await jobPage.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a'));
            const btn = buttons.find(b => {
              const text = (b.innerText || '').trim().toLowerCase();
              return text === 'apply' || text === 'apply on company site' || text === 'quick apply';
            });
            if (btn) {
              const isExternal = (btn.innerText || '').toLowerCase().includes('company site');
              btn.click();
              return { clicked: true, isExternal };
            }
            return { clicked: false, isExternal: false };
          });

          if (applyResult.clicked) {
            await microDelay(2500, 4500);

            if (applyResult.isExternal) {
              storage.recordAppliedJob({
                jobId: card.jobId,
                title: card.title,
                company: card.company,
                location: card.location,
                platform: 'Naukri',
                url: card.url,
                status: 'skipped',
                errorReason: 'External employer redirect'
              });
              storage.logActivity('info', `Job "${card.title}" redirects to external employer website`, 'naukri');
            } else {
              // 1-Click apply or modal on Naukri
              appliedThisRun++;
              storage.recordAppliedJob({
                jobId: card.jobId,
                title: card.title,
                company: card.company,
                location: card.location,
                platform: 'Naukri',
                url: card.url,
                status: 'applied'
              });
              storage.logActivity('success', `Applied to "${card.title}" at ${card.company}! (${appliedThisRun}/${maxApplications})`, 'naukri');
            }
          } else {
            // Already applied badge or login required
            const alreadyApplied = await jobPage.evaluate(() => {
              return document.body.innerText.includes('Already Applied') || document.body.innerText.includes('You have applied');
            });

            if (alreadyApplied) {
              storage.recordAppliedJob({
                jobId: card.jobId,
                title: card.title,
                company: card.company,
                location: card.location,
                platform: 'Naukri',
                url: card.url,
                status: 'skipped',
                errorReason: 'Already applied previously on Naukri'
              });
            } else {
              storage.recordAppliedJob({
                jobId: card.jobId,
                title: card.title,
                company: card.company,
                location: card.location,
                platform: 'Naukri',
                url: card.url,
                status: 'failed',
                errorReason: 'Apply button not found or authentication needed'
              });
            }
          }

          await jobPage.close();

          // Randomized human delay
          const waitTime = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
          storage.logActivity('info', `Waiting ${(waitTime / 1000).toFixed(1)}s before next job...`, 'naukri');
          await new Promise(r => setTimeout(r, waitTime));

        } catch (jobErr) {
          storage.logActivity('error', `Error on Naukri job "${card.title}": ${jobErr.message}`, 'naukri');
          storage.recordAppliedJob({
            jobId: card.jobId,
            title: card.title,
            company: card.company,
            location: card.location,
            platform: 'Naukri',
            url: card.url,
            status: 'failed',
            errorReason: jobErr.message
          });
        }
      }

      // Check next page
      const nextBtn = await page.$('a.fright.fs14.btn-secondary, a:has-text("Next")');
      if (nextBtn && !checkStopRequested() && appliedThisRun < maxApplications) {
        pageNum++;
        await nextBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
        await microDelay(3000, 5000);
      } else {
        break;
      }
    }

  } catch (err) {
    storage.logActivity('error', `Naukri automation error: ${err.message}`, 'naukri');
  } finally {
    if (page && !page.isClosed()) await page.close().catch(() => {});
  }
}

// -------------------------------------------------------------
// MAIN WORKFLOW ORCHESTRATOR
// -------------------------------------------------------------
async function startAutomation(options) {
  shouldStop = false;
  storage.resetRuntimeStats();
  storage.updateRuntimeState({
    status: 'running',
    currentKeyword: options.keyword || 'Developer',
    currentLocation: options.location || 'Remote',
    currentPlatform: options.platform || 'both'
  });

  const config = {
    keyword: options.keyword || 'MERN Stack Developer',
    location: options.location || 'India',
    platform: (options.platform || 'both').toLowerCase(),
    resumePath: options.resumePath || path.resolve(process.env.DEFAULT_RESUME_PATH || 'assets/resume.pdf'),
    headless: options.headless !== undefined ? options.headless : (process.env.HEADLESS === 'true'),
    minDelay: options.minDelay || parseInt(process.env.MIN_DELAY_MS || '5000', 10),
    maxDelay: options.maxDelay || parseInt(process.env.MAX_DELAY_MS || '15000', 10),
    maxApplications: options.maxApplications || parseInt(process.env.MAX_APPLICATIONS || '25', 10)
  };

  storage.logActivity('info', `=== Automation Run Initiated for "${config.keyword}" [Platform: ${config.platform}] ===`);

  try {
    if (config.platform === 'indeed' || config.platform === 'both') {
      if (!checkStopRequested()) {
        storage.updateRuntimeState({ currentPlatform: 'Indeed' });
        await runIndeedAutomation(config);
      }
    }

    if (config.platform === 'naukri' || config.platform === 'both') {
      if (!checkStopRequested()) {
        storage.updateRuntimeState({ currentPlatform: 'Naukri' });
        await runNaukriAutomation(config);
      }
    }

    storage.logActivity('success', '=== Automation Run Finished Successfully ===');
  } catch (err) {
    storage.logActivity('error', `Automation terminated with error: ${err.message}`);
  } finally {
    await stopAutomation();
  }
}

async function stopAutomation() {
  shouldStop = true;
  storage.updateRuntimeState({
    status: 'idle',
    currentPlatform: null,
    stoppedAt: new Date().toISOString()
  });

  try {
    if (activePage && !activePage.isClosed()) {
      await activePage.close().catch(() => {});
    }
    if (activeBrowser) {
      storage.logActivity('info', 'Closing browser instance...');
      await activeBrowser.close().catch(() => {});
      activeBrowser = null;
    }
  } catch (e) {
    // ignore clean up error
  }
  storage.logActivity('info', 'System status changed to IDLE');
}

module.exports = {
  startAutomation,
  stopAutomation,
  launchBrowser,
  setupPage
};

