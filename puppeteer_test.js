const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    
    console.log("Navigating to http://localhost:3001 ...");
    await page.goto('http://localhost:3001');
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Navigating to http://localhost:3001/output.html ...");
    const page2 = await browser.newPage();
    page2.on('console', msg => console.log('OUTPUT LOG:', msg.text()));
    page2.on('pageerror', err => console.log('OUTPUT ERROR:', err.message));
    await page2.goto('http://localhost:3001/output.html');
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
})();
