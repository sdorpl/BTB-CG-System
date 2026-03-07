const fs = require('fs');
const dbPath = './db.json';
let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const naZywo = db.templates.find(t => t.id === 'na-zywo-badge');
const cityBar = db.templates.find(t => t.id === 'city-bar');

if (naZywo && cityBar) {
    // Clone HTML structure (wrapper, container, dot, text)
    cityBar.html_template = naZywo.html_template;

    // Clone CSS and modify dot color to be visible on white bg (red dot instead of white)
    let newCss = naZywo.css_template;
    newCss = newCss.replace(/background-color:\s*#ffffff;/g, 'background-color: #dc2626;'); // dot color
    newCss = newCss.replace(/rgba\(255,255,255,0\.8\)/g, 'rgba(220,38,38,0.8)'); // dot shadow

    cityBar.css_template = newCss;
    cityBar.js_template = naZywo.js_template;

    // Update default fields to ensure white background, black text by default
    cityBar.defaultFields = {
        title: "WARSZAWA",
        primaryColor: "#ffffff",
        titleColor: "#000000"
    };

    // Also, if there are any existing city-bar graphic instances, update their typography color so the user sees it immediately.
    db.graphics.forEach(g => {
        if (g.templateId === 'city-bar') {
            if (!g.style.typography) g.style.typography = {};
            g.style.typography.color = "#000000";
            if (!g.style.background) g.style.background = {};
            g.style.background.color = "#ffffff";
        }
    });
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('City bar updated to have Live bar traits.');
