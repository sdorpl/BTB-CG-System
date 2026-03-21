const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('http://localhost:8081/test-modern-ticker.html');
  await page.waitForTimeout(2000);
  
  const html = await page.evaluate(() => document.getElementById('preview-canvas').innerHTML);
  console.log("HTML:", html);
  
  await browser.close();
  process.exit(0);
})();
