const readline = require('readline');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const storage = require('./storage');

puppeteer.use(StealthPlugin());

const platform = (process.argv[2] || 'indeed').toLowerCase();

const PLATFORM_URLS = {
  indeed: 'https://secure.indeed.com/auth',
  naukri: 'https://www.naukri.com/nlogin/login'
};

if (!PLATFORM_URLS[platform]) {
  console.log(`❌ Invalid platform: "${platform}". Please choose "indeed" or "naukri".`);
  process.exit(1);
}

async function captureCookies() {
  console.log('\n======================================================');
  console.log(`🚀 LAUNCHING BROWSER FOR MANUAL LOGIN: ${platform.toUpperCase()}`);
  console.log('======================================================');
  console.log('1. A Chrome browser window will now open.');
  console.log(`2. Log into your ${platform} account manually (solve OTP / Captcha if prompted).`);
  console.log('3. Once you reach your home page/dashboard, return to this terminal.');
  console.log('4. Press [ENTER] here to extract and save your session cookies.\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  const targetUrl = PLATFORM_URLS[platform];
  console.log(`🌐 Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

  // Wait for user to press ENTER
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('👉 Press [ENTER] here when you have successfully logged in: ', async () => {
    try {
      console.log('\n🔍 Extracting full session cookies...');
      
      // Use CDP to extract all cookies across all subdomains (handles SSO/Google auth seamlessly)
      let cookies = [];
      try {
        const client = await page.target().createCDPSession();
        const allCookies = await client.send('Network.getAllCookies');
        cookies = allCookies.cookies || [];
      } catch (cdpErr) {
        cookies = await page.cookies();
      }

      if (!cookies || cookies.length === 0) {
        console.log('⚠️ No cookies found. Please make sure you completed the login.');
      } else {
        storage.saveCookies(platform, cookies);
        console.log(`✅ SUCCESS! Saved ${cookies.length} session cookies for ${platform} to server/data/cookies.json`);
        console.log('🎉 Your automated scraper can now run without requiring manual login.');
      }
    } catch (err) {
      console.error('❌ Failed to extract cookies:', err.message);
    } finally {
      rl.close();
      await browser.close();
      process.exit(0);
    }
  });
}

captureCookies().catch(err => {
  console.error('Fatal error during cookie capture:', err);
  process.exit(1);
});

