const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto('http://localhost:3001/output.html');
    await new Promise(r => setTimeout(r, 2000));
    const kids = await page.evaluate(() => {
        const c = document.getElementById('render-container');
        if (!c) return "No container";
        return Array.from(c.children).map(child => ({
            html: child.innerHTML.substring(0, 400)
        }));
    });
    console.log("Children HTML:", JSON.stringify(kids, null, 2));
    await browser.close();
})();
