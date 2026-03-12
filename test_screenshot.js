const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'], defaultViewport: { width: 1920, height: 1080 } });
    const page = await browser.newPage();
    await page.goto('http://localhost:3001/output.html');
    await new Promise(r => setTimeout(r, 4000));
    // Check if there are any elements. If not, maybe we need to wait longer?
    await page.screenshot({ path: 'test_render.png' });
    console.log("Screenshot saved.");
    await browser.close();
})();
