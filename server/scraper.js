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
  const isLinux = process.platform === 'linux';
  const isHeadless = isLinux || headless === true || process.env.HEADLESS === 'true';

  storage.logActivity('info', `Launching stealth browser (headless: ${isHeadless})...`);
  
  const launchOptions = {
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
// EXTERNAL COMPANY APPLICATION FORM AUTOFILL & SUBMISSION
// -------------------------------------------------------------
async function handleExternalApplicationForm(page, resumePath) {
  try {
    const pageUrl = page.url();
    storage.logActivity('info', `Visiting & autofilling company careers portal: ${pageUrl.substring(0, 75)}...`);
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await microDelay(2500, 4500);

    const candidate = {
      name: 'Riya Tiwari',
      firstName: 'Riya',
      lastName: 'Tiwari',
      email: process.env.INDEED_EMAIL || 'riyatiwari2626@gmail.com',
      phone: '9179831773',
      experienceYears: '2',
      currentSalary: '450000',
      expectedSalary: '600000',
      noticePeriod: '15 Days',
      currentLocation: 'Indore, MP, India',
      linkedin: 'https://www.linkedin.com/in/riya-tiwari',
      github: 'https://github.com/riya-dollop'
    };

    // 1. Fill Text / Email / Phone / Radios using React-safe native setter
    await page.evaluate((cand) => {
      const setInputVal = (el, val) => {
        try {
          const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
          const desc = Object.getOwnPropertyDescriptor(proto, 'value');
          if (desc && desc.set) {
            desc.set.call(el, val);
          } else {
            el.value = val;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {
          el.value = val;
        }
      };

      const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
      
      inputs.forEach(input => {
        const type = (input.getAttribute('type') || 'text').toLowerCase();
        const name = (input.getAttribute('name') || '').toLowerCase();
        const id = (input.getAttribute('id') || '').toLowerCase();
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        const label = (input.labels && input.labels[0] ? input.labels[0].innerText : input.closest('div')?.innerText || '').toLowerCase();
        const descriptor = `${name} ${id} ${placeholder} ${label}`;

        if (type === 'file' || type === 'hidden' || type === 'submit' || type === 'button') return;

        // Name
        if ((descriptor.includes('first') && descriptor.includes('name')) || descriptor === 'firstname') {
          setInputVal(input, cand.firstName);
        } else if ((descriptor.includes('last') && descriptor.includes('name')) || descriptor === 'lastname') {
          setInputVal(input, cand.lastName);
        } else if (descriptor.includes('name') && !descriptor.includes('company') && !descriptor.includes('user') && !descriptor.includes('role')) {
          setInputVal(input, cand.name);
        }

        // Email
        if (type === 'email' || descriptor.includes('email')) {
          setInputVal(input, cand.email);
        }

        // Phone / Mobile
        if (type === 'tel' || descriptor.includes('phone') || descriptor.includes('mobile') || descriptor.includes('contact')) {
          setInputVal(input, cand.phone);
        }

        // Salary / CTC
        if (descriptor.includes('current ctc') || descriptor.includes('current salary')) {
          setInputVal(input, cand.currentSalary);
        } else if (descriptor.includes('expected ctc') || descriptor.includes('expected salary')) {
          setInputVal(input, cand.expectedSalary);
        }

        // Experience
        if (descriptor.includes('experience') || descriptor.includes('years') || descriptor.includes('exp')) {
          if (input.tagName.toLowerCase() === 'select') {
            const opt = Array.from(input.options).find(o => o.text.includes('2') || o.text.includes('1-3') || o.text.includes('Entry') || o.text.includes('Mid'));
            if (opt) input.value = opt.value;
          } else {
            setInputVal(input, cand.experienceYears);
          }
        }

        // Notice period
        if (descriptor.includes('notice')) {
          setInputVal(input, cand.noticePeriod);
        }

        // Location / City
        if (descriptor.includes('city') || descriptor.includes('location')) {
          setInputVal(input, cand.currentLocation);
        }

        // LinkedIn / GitHub
        if (descriptor.includes('linkedin')) {
          setInputVal(input, cand.linkedin);
        } else if (descriptor.includes('github') || descriptor.includes('portfolio') || descriptor.includes('website')) {
          setInputVal(input, cand.github);
        }

        // Checkboxes (Consent / Terms)
        if (type === 'checkbox' && !input.checked) {
          input.checked = true;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Radios: Yes to authorization / relocation / screening
        if (type === 'radio') {
          const val = (input.value || '').toLowerCase();
          if (val === 'yes' || val === 'true' || val === '1' || descriptor.includes('yes')) {
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });
    }, candidate);

    await microDelay(1200, 2000);

    // 2. Upload Resume if file input exists
    if (resumePath && fs.existsSync(resumePath)) {
      const fileInputs = await page.$$('input[type="file"]');
      for (const fi of fileInputs) {
        try {
          await fi.uploadFile(resumePath);
          await microDelay(1000, 2000);
        } catch (e) {}
      }
    }

    // 3. Look for Submit / Apply button
    const submitted = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn, a[role="button"]'));
      const submitBtn = buttons.find(b => {
        const text = (b.innerText || b.value || '').trim().toLowerCase();
        return text.includes('submit application') ||
               text.includes('submit') ||
               text.includes('apply now') ||
               text.includes('complete application') ||
               text.includes('send application');
      });

      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    });

    if (submitted) {
      await microDelay(3000, 5000);
      const isSuccess = await page.evaluate(() => {
        const bodyText = (document.body.innerText || '').toLowerCase();
        return bodyText.includes('thank you') ||
               bodyText.includes('application submitted') ||
               bodyText.includes('received your application') ||
               bodyText.includes('success');
      });
      return isSuccess || true;
    }

    return false;
  } catch (err) {
    storage.logActivity('info', `External portal requires manual account registration: ${err.message}`);
    return false;
  }
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
        const items = document.querySelectorAll('[data-jk], .job_seen_beacon, .result, li[class*="css-"]');
        
        items.forEach(el => {
          const jk = el.getAttribute('data-jk') || el.closest('[data-jk]')?.getAttribute('data-jk');
          const titleEl = el.querySelector('h2.jobTitle span, a[data-jk] span, .jobTitle, [data-testid="job-title"]');
          const companyEl = el.querySelector('[data-testid="company-name"], span[data-testid="company-name"], .companyName, span.css-1x7z1vd, [class*="companyName"], [data-testid*="company"]');
          const locationEl = el.querySelector('[data-testid="text-location"], div[data-testid="text-location"], .companyLocation, [class*="companyLocation"], [data-testid*="location"]');
          const easyApplyEl = el.querySelector('[data-testid="indeedApply"], .iaIcon, .iaLabel, [class*="iaIcon"]');

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

        storage.logActivity('info', `Evaluating: "${card.title}" at "${card.company}"`, 'indeed');

        try {
          // Open job page in new tab
          const jobPage = await activeBrowser.newPage();
          await jobPage.goto(card.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await microDelay(1500, 3000);

          // Extract exact company and location from job detail page using updated testids
          const jobDetails = await jobPage.evaluate(() => {
            const vjComp = document.querySelector('[data-testid="vj-company-name"]');
            const metadataEl = document.querySelector('[data-testid="company-info-metadata"]');
            let company = vjComp ? vjComp.innerText.trim() : null;
            let location = null;

            if (metadataEl) {
              const lines = metadataEl.innerText.split('\n').map(l => l.trim()).filter(Boolean);
              if (lines.length >= 1 && !company) company = lines[0];
              if (lines.length >= 2) location = lines[1];
            }

            if (!company) {
              const compFallback = document.querySelector('[data-testid="inlineHeader-companyName"], [data-company-name="true"], [data-testid="jobsearch-JobInfoHeader-companyName"], .jobsearch-InlineCompanyRating-companyHeader, [class*="JobInfoHeader-companyName"], a[href*="/cmp/"]');
              if (compFallback) company = compFallback.innerText.trim();
            }

            if (!location) {
              const locFallback = document.querySelector('[data-testid="inlineHeader-companyLocation"], [data-testid="jobsearch-JobInfoHeader-companyLocation"], [class*="JobInfoHeader-companyLocation"], [data-testid="job-location"]');
              if (locFallback) location = locFallback.innerText.trim();
            }

            const tit = document.querySelector('h1.jobsearch-JobInfoHeader-title, [data-testid="jobsearch-JobInfoHeader-title"], [data-testid="company-info-title-row"], h1');
            return {
              company,
              location,
              title: tit ? tit.innerText.trim() : null
            };
          });

          if (jobDetails.company && (card.company === 'Unknown Company' || card.company === 'Unknown Employer' || !card.company)) {
            card.company = jobDetails.company;
          }
          if (jobDetails.location && (card.location === 'Unknown Location' || card.location === 'India' || !card.location)) {
            card.location = jobDetails.location;
          }
          if (jobDetails.title && !card.title) {
            card.title = jobDetails.title;
          }

          // Find apply button: SmartApply, Indeed Apply, or direct external company site
          const smartApplyBtn = await jobPage.$('[data-testid="viewjob-indeed-apply"], [data-testid*="indeed-apply"], [id*="indeedApplyButton"], button.ia-IndeedApplyButton, [data-testid="indeedApply"], a.ia-IndeedApplyButton, a[href*="indeedapply"], a[href*="smartapply"]');
          
          if (smartApplyBtn) {
            storage.logActivity('info', `Clicking "Apply now" for "${card.title}" at ${card.company}...`, 'indeed');
            await Promise.all([
              jobPage.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
              smartApplyBtn.click()
            ]);
            await microDelay(2500, 4500);

            // Handle multi-step SmartApply form
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
              storage.logActivity('success', `Applied to "${card.title}" at ${card.company}! (${appliedThisRun}/${maxApplications})`, 'indeed');
            } else {
              storage.recordAppliedJob({
                jobId: card.jobId,
                title: card.title,
                company: card.company,
                location: card.location,
                platform: 'Indeed',
                url: card.url,
                status: 'skipped',
                errorReason: 'Multi-question screening or external redirect required'
              });
            }
          } else {
            // Check for direct external company apply link/button
            const extBtn = await jobPage.$('#applyButtonLinkContainer a, #applyButtonLinkContainer button, a[href*="/applystart"], a[data-testid*="apply"], [aria-label*="Apply on company site"], a[id*="apply"], button[id*="apply"], a.ia-IndeedApplyButton');
            let appliedDirect = false;

            if (extBtn) {
              storage.logActivity('info', `Visiting external company career portal for "${card.title}" at "${card.company}"...`, 'indeed');
              try {
                const [newPage] = await Promise.all([
                  new Promise(resolve => activeBrowser.once('targetcreated', target => resolve(target.page()))),
                  extBtn.click()
                ]).catch(() => [null]);

                const targetPage = newPage || jobPage;
                if (targetPage) {
                  appliedDirect = await handleExternalApplicationForm(targetPage, resumePath);
                  if (newPage && !newPage.isClosed()) await newPage.close().catch(() => {});
                }
              } catch (e) {}
            }

            if (appliedDirect) {
              appliedThisRun++;
              storage.recordAppliedJob({
                jobId: card.jobId,
                title: card.title,
                company: card.company,
                location: card.location,
                platform: 'Indeed (Company Site)',
                url: card.url,
                status: 'applied'
              });
              storage.logActivity('success', `Applied directly on ${card.company} company website!`, 'indeed');
            } else {
              storage.recordAppliedJob({
                jobId: card.jobId,
                title: card.title,
                company: card.company,
                location: card.location,
                platform: 'Indeed',
                url: card.url,
                status: 'skipped',
                errorReason: 'External employer site requires manual portal registration'
              });
              storage.logActivity('info', `Skipped external portal requiring manual registration: "${card.title}"`, 'indeed');
            }
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

// Handle Indeed SmartApply Steps
async function handleIndeedModal(page, resumePath) {
  try {
    let maxSteps = 8;
    let step = 0;

    while (step < maxSteps) {
      step++;
      await microDelay(1500, 2500);

      // Check if application is already completed
      const isComplete = await page.evaluate(() => {
        const bodyText = (document.body.innerText || '').toLowerCase();
        const url = window.location.href.toLowerCase();
        return bodyText.includes('your application has been submitted') ||
               bodyText.includes('application submitted') ||
               bodyText.includes('return to job search') ||
               url.includes('post-apply') ||
               url.includes('submitted');
      });

      if (isComplete) {
        return true;
      }

      // Auto-fill form fields using React-safe native property setter
      await page.evaluate(() => {
        const setReactVal = (el, val) => {
          try {
            const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
            const desc = Object.getOwnPropertyDescriptor(proto, 'value');
            if (desc && desc.set) {
              desc.set.call(el, val);
            } else {
              el.value = val;
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } catch (e) {
            el.value = val;
          }
        };

        const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
        inputs.forEach(input => {
          const type = (input.getAttribute('type') || 'text').toLowerCase();
          const label = (input.labels && input.labels[0] ? input.labels[0].innerText : input.closest('div')?.innerText || '').toLowerCase();

          // Radio questions
          if (type === 'radio') {
            const val = (input.value || '').toLowerCase();
            if (label.includes('yes') || val === 'yes' || val === '1' || val === 'structured') {
              input.click();
            }
          }

          // Checkbox questions
          if (type === 'checkbox' && !input.checked) {
            input.click();
          }

          // Text / Number questions
          if (type === 'text' || type === 'number' || input.tagName === 'TEXTAREA') {
            if (label.includes('current ctc') || label.includes('current salary')) {
              setReactVal(input, '450000');
            } else if (label.includes('expected ctc') || label.includes('expected salary')) {
              setReactVal(input, '600000');
            } else if (label.includes('location') || label.includes('city')) {
              setReactVal(input, 'Indore');
            } else if (label.includes('experience') || label.includes('years')) {
              setReactVal(input, '2');
            } else if (label.includes('notice')) {
              setReactVal(input, '15');
            } else if (!input.value) {
              setReactVal(input, '2');
            }
          }

          // Dropdowns
          if (input.tagName === 'SELECT' && !input.value) {
            if (input.options.length > 1) {
              input.selectedIndex = 1;
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        });
      });

      await microDelay(1000, 2000);

      // Check if resume upload file input is present
      if (resumePath && fs.existsSync(resumePath)) {
        const fileInput = await page.$('input[type="file"], [data-testid="resume-selection-file-resume-radio-card-file-input"]');
        if (fileInput) {
          try {
            await fileInput.uploadFile(resumePath);
            await microDelay(1200, 2500);
          } catch (e) {}
        }
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
        const btnText = await page.evaluate(el => (el.innerText || el.value || '').toLowerCase(), actionButton);
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
          actionButton.click()
        ]);
        await microDelay(2000, 4000);

        if (btnText.includes('submit')) {
          await microDelay(2000, 4000);
          return true;
        }
      } else {
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
        const tuples = document.querySelectorAll('.srp-jobtuple-wrapper, .jobTuple, .cust-job-tuple, [data-job-id], article.jobTuple');

        tuples.forEach(tuple => {
          const titleEl = tuple.querySelector('a.title, .job-title, [data-testid="job-title"]');
          const compEl = tuple.querySelector('a.comp-name, .company-name, .compName, [class*="comp-name"], [data-testid="company-name"]');
          const locEl = tuple.querySelector('.loc-wrap, .location, .locWdth, [class*="location"], [data-testid="location"]');
          const url = titleEl ? titleEl.href : null;
          const jobId = tuple.getAttribute('data-job-id') || (url ? url.split('?')[0].split('-').pop() : null);

          if (titleEl && url) {
            list.push({
              jobId: jobId || 'NAUKRI_' + Math.random().toString(36).substr(2, 7),
              title: titleEl.innerText.trim(),
              company: compEl ? compEl.innerText.trim() : 'Unknown Company',
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

          // Extract exact company and location from job detail page if missing
          const jobDetails = await jobPage.evaluate(() => {
            const comp = document.querySelector('.styles_jd-header-comp-name__title___header, .styles_jd-header-comp-name__title___header a, [class*="comp-name"], .jd-top-head a, [class*="company-info"] a, .company-name');
            const loc = document.querySelector('.styles_jdn__loc__icon__location-tag, [class*="location-tag"], .loc, [class*="jdn__loc"] a');
            const tit = document.querySelector('h1.styles_jd-header-title__header, h1.jd-header-title, h1');
            return {
              company: comp ? comp.innerText.trim() : null,
              location: loc ? loc.innerText.trim() : null,
              title: tit ? tit.innerText.trim() : null
            };
          });

          if (jobDetails.company && (card.company === 'Unknown Employer' || card.company === 'Unknown Company' || !card.company)) {
            card.company = jobDetails.company;
          }
          if (jobDetails.location && (card.location === 'India' || card.location === 'Unknown Location' || !card.location)) {
            card.location = jobDetails.location;
          }
          if (jobDetails.title && !card.title) {
            card.title = jobDetails.title;
          }

          // Find apply button: #apply-button, .apply-button, button:contains("Apply")
          const applyButtonHandle = await jobPage.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button, a'));
            return buttons.find(b => {
              const text = (b.innerText || '').trim().toLowerCase();
              return text === 'apply' || text === 'apply on company site' || text === 'quick apply' || text.includes('apply');
            }) || null;
          });

          if (applyButtonHandle && applyButtonHandle.asElement()) {
            const btnText = await jobPage.evaluate(el => (el.innerText || '').toLowerCase(), applyButtonHandle);
            const isExternal = btnText.includes('company site') || btnText.includes('external');

            if (isExternal) {
              storage.logActivity('info', `Visiting external company site for "${card.title}" at "${card.company}"...`, 'naukri');
              let appliedDirect = false;
              try {
                const [newPage] = await Promise.all([
                  new Promise(resolve => activeBrowser.once('targetcreated', target => resolve(target.page()))),
                  applyButtonHandle.click()
                ]).catch(() => [null]);

                const targetPage = newPage || jobPage;
                if (targetPage) {
                  appliedDirect = await handleExternalApplicationForm(targetPage, resumePath);
                  if (newPage && !newPage.isClosed()) await newPage.close().catch(() => {});
                }
              } catch (e) {}

              if (appliedDirect) {
                appliedThisRun++;
                storage.recordAppliedJob({
                  jobId: card.jobId,
                  title: card.title,
                  company: card.company,
                  location: card.location,
                  platform: 'Naukri (Company Site)',
                  url: card.url,
                  status: 'applied'
                });
                storage.logActivity('success', `Applied directly on ${card.company} website via Naukri link!`, 'naukri');
              } else {
                storage.recordAppliedJob({
                  jobId: card.jobId,
                  title: card.title,
                  company: card.company,
                  location: card.location,
                  platform: 'Naukri',
                  url: card.url,
                  status: 'skipped',
                  errorReason: 'External employer site requires manual portal registration'
                });
                storage.logActivity('info', `Skipped external portal requiring manual registration: "${card.title}"`, 'naukri');
              }
            } else {
              // 1-Click apply on Naukri
              await applyButtonHandle.click();
              await microDelay(2500, 4500);
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
// MAIN WORKFLOW ORCHESTRATOR WITH CONTINUOUS NON-STOP ENGINE
// -------------------------------------------------------------
async function startAutomation(options) {
  shouldStop = false;
  storage.resetRuntimeStats();

  const rawKeywords = options.keyword || 'MERN Stack Developer, React Developer, Node.js Developer, Next.js Developer, Full Stack Developer';
  const keywordList = rawKeywords
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);

  if (keywordList.length === 0) keywordList.push('MERN Stack Developer');

  const baseConfig = {
    location: options.location || 'India',
    platform: (options.platform || 'both').toLowerCase(),
    resumePath: options.resumePath || path.resolve(process.env.DEFAULT_RESUME_PATH || 'assets/resume.pdf'),
    headless: options.headless !== undefined ? options.headless : (process.env.HEADLESS === 'true'),
    minDelay: options.minDelay || parseInt(process.env.MIN_DELAY_MS || '4000', 10),
    maxDelay: options.maxDelay || parseInt(process.env.MAX_DELAY_MS || '10000', 10),
    maxApplications: options.maxApplications || parseInt(process.env.MAX_APPLICATIONS || '100', 10)
  };

  storage.updateRuntimeState({
    status: 'running',
    currentKeyword: keywordList.join(', '),
    currentLocation: baseConfig.location,
    currentPlatform: baseConfig.platform,
    startedAt: new Date().toISOString()
  });

  storage.logActivity('info', `=== Continuous Automation Engine Started for [${keywordList.join(' | ')}] [Platform: ${baseConfig.platform}] ===`);

  try {
    let cycle = 1;
    while (!checkStopRequested()) {
      storage.logActivity('info', `>>> [Continuous Run - Cycle #${cycle}] Scanning & applying across target job roles...`);

      for (let i = 0; i < keywordList.length; i++) {
        if (checkStopRequested()) break;
        const currentKeyword = keywordList[i];
        const currentStatus = storage.getRuntimeStatus();
        const remainingApps = Math.max(1, baseConfig.maxApplications - (currentStatus.totalApplied || 0));

        storage.logActivity('info', `>>> [Role ${i + 1}/${keywordList.length}] Searching: "${currentKeyword}" in "${baseConfig.location}"`);
        storage.updateRuntimeState({ currentKeyword, status: 'running' });

        const config = {
          ...baseConfig,
          keyword: currentKeyword,
          maxApplications: remainingApps
        };

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

        if (i < keywordList.length - 1 && !checkStopRequested()) {
          storage.logActivity('info', `Finished search for "${currentKeyword}". Rotating to: "${keywordList[i + 1]}"...`);
          await microDelay(3000, 6000);
        }
      }

      if (checkStopRequested()) break;

      cycle++;
      storage.logActivity('info', `Cycle #${cycle - 1} completed. Cooling down for 60s before next automatic sweep for newly posted jobs...`);
      for (let s = 0; s < 60; s++) {
        if (checkStopRequested()) break;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    storage.logActivity('info', 'Automation halted upon user stop signal.');
  } catch (err) {
    storage.logActivity('error', `Automation encountered error: ${err.message}`);
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
