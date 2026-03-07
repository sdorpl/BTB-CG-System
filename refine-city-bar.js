const fs = require('fs');
const dbPath = './db.json';
let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const naZywo = db.templates.find(t => t.id === 'na-zywo-badge');
const cityBar = db.templates.find(t => t.id === 'city-bar');

if (naZywo && cityBar) {
    // 1) Find the exact box-shadow currently in na-zywo-badge
    // naZywo's box-shadow is usually in `.na-zywo-wrapper { ... box-shadow: 0 4px 12px rgba(0,0,0,0.5); ... }`
    const shadowMatch = naZywo.css_template.match(/box-shadow:\s*([^;]+);/);
    const shadowValue = shadowMatch ? shadowMatch[1] : "0 4px 12px rgba(0,0,0,0.5)";

    // 2) Remove dot HTML
    let newHtml = cityBar.html_template;
    newHtml = newHtml.replace(/<span\s+class="na-zywo-dot"><\/span>/g, '');
    cityBar.html_template = newHtml;

    // 3) Update CSS: Remove the dot styling, and set box-shadow explicitly to match naZywo's
    let newCss = cityBar.css_template;
    // Remove dot CSS block
    newCss = newCss.replace(/#\{\{ID\}\}\s*\.na-zywo-dot\s*\{[\s\S]*?\}/g, '');
    // Remove keyframes for pulse-dot
    newCss = newCss.replace(/@keyframes\s+pulse-dot\s*\{[\s\S]*?\}/g, '');
    // Replace tracking box-shadow just in case it's in the wrapper
    newCss = newCss.replace(/box-shadow:\s*([^;]+);/g, `box-shadow: ${shadowValue};`);

    cityBar.css_template = newCss;
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('City bar updated: shadow matched, dot removed.');
