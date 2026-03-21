const fs = require('fs');
const glob = require('fs').readdirSync;

// These are the classes GSAPFX.applyTextEffect targets natively
const supportedClasses = [
    '.title', '.subtitle', '.modern-title', '.rep-title', 
    '.na-zywo-text', '.rep-clock', '.ticker-label', 
    '.news-text-v8', '.wiper-text-v8'
];

function checkTemplate(tpl, filename) {
    let issues = [];
    const html = tpl.html_template || "";
    const js = tpl.js_template || "";
    
    if (!html && !js) return;

    // 1. Check if HTML contains any supported text class
    const hasSupportedClass = supportedClasses.some(cls => html.includes(cls.substring(1)));
    if (!hasSupportedClass && html.includes('{{TITLE}}')) {
        issues.push(`HTML does not use any supported text classes (has TITLE but maybe wrong class)`);
    }

    // 2. Check if JS calls applyTextEffect
    if (!js.includes('GSAPFX.applyTextEffect')) {
        if (hasSupportedClass) issues.push(`Has supported text class but missing applyTextEffect in JS`);
    }

    // 3. Check if JS calls applyTextOutEffect
    if (!js.includes('GSAPFX.applyTextOutEffect')) {
        if (hasSupportedClass) issues.push(`Has supported text class but missing applyTextOutEffect in JS`);
    }

    // 4. Check for TEXT_ANIM_SYNC correct implementation
    if (js.includes('applyTextEffect') && !js.match(/if\s*\(\{\{\{TEXT_ANIM_SYNC\}\}\}\)/)) {
        issues.push(`Missing strict if/else evaluation for TEXT_ANIM_SYNC`);
    }

    // 5. Check for TEXT_ANIM_OUT_SYNC correct implementation
    if (js.includes('applyTextOutEffect') && !js.match(/if\s*\(\{\{\{TEXT_ANIM_OUT_SYNC\}\}\}\)/)) {
        issues.push(`Missing strict if/else evaluation for TEXT_ANIM_OUT_SYNC`);
    }

    if (issues.length > 0) {
        console.log(`\n[${filename}] Template: ${tpl.name} (${tpl.id})`);
        issues.forEach(i => console.log(`  - ${i}`));
    }
}

const dir = './tests/OCG/ocg-tpl/';
const files = glob(dir).filter(f => f.endsWith('.json')).map(f => dir + f);

files.forEach(path => {
    try {
        const data = JSON.parse(fs.readFileSync(path, 'utf8'));
        checkTemplate(data, path);
    } catch(e) {}
});

try {
    const db = JSON.parse(fs.readFileSync('./db.json', 'utf8'));
    if (db.templates) {
        db.templates.forEach(tpl => checkTemplate(tpl, 'db.json'));
    }
} catch(e) {}
