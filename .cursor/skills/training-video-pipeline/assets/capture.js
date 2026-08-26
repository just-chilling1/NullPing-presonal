const { chromium } = require('playwright');
const path = require('path');

const routes = [
  ['dashboard', '/dashboard'],
  ['offers', '/offers'],
  ['leads', '/leads'],
  ['email-builder', '/email-builder'],
  ['saved-emails', '/saved-emails'],
  ['saved-searches', '/saved-searches'],
  ['training', '/training'],
  ['dfy', '/dfy'],
  ['instant-income', '/instant-income'],
  ['autopilot', '/autopilot'],
  ['protector', '/protector'],
  ['support', '/support'],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const outDir = path.join(__dirname, 'screenshots');
  require('fs').mkdirSync(outDir, { recursive: true });

  for (const [name, route] of routes) {
    try {
      await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(5000); // let page fully load + animations settle
      const finalUrl = page.url();
      if (/\/(login|signin|signup|onboarding)/.test(finalUrl)) {
        console.log(`FAIL ${name}: redirected to ${finalUrl} (auth bypass not working)`);
        continue;
      }
      await page.screenshot({ path: path.join(outDir, `${name}.png`) });
      console.log(`OK ${name} -> ${finalUrl}`);
    } catch (e) {
      console.log(`FAIL ${name}: ${e.message.split('\n')[0]}`);
    }
  }
  await browser.close();
})();
