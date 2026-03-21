const fs = require('fs');

const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
const ocg = db.templates.filter(t => t.id && t.id.startsWith('tpl-ocg-'));

ocg.forEach(t => {
    console.log(`====== ${t.id} ======`);
    console.log(`HTML: ${t.html_template}`);
    // console.log(`CSS: ${t.css_template.slice(0, 100)}...`);
    // console.log(`JS: ${t.js_template.slice(0, 200)}...`);
});
