const fs = require('fs');

const dbPath = './db.json';
let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// 1. Create the new city-bar template
const cityBarTemplate = {
    id: "city-bar",
    name: "Belka Miasto",
    type: "LOWER_THIRD",
    version: 1,
    html_template: "<div class=\"na-zywo-city-bar-standalone\">\n    <span class=\"na-zywo-city-text\">{{{TITLE}}}</span>\n</div>",
    css_template: "#{{ID}} .na-zywo-city-bar-standalone {\n    background-color: #ffffff;\n    padding: 5px 16px;\n    display: inline-flex;\n    align-items: center;\n    box-shadow: 0 4px 12px rgba(0,0,0,0.5);\n    border-radius: 4px;\n    opacity: 0;\n    transform: {{ANIMATION_IN_TRANSFORM}};\n    transition: all {{ANIMATION_DURATION}}s {{ANIMATION_EASE}};\n}\n#{{ID}} .na-zywo-city-text {\n    color: #1a1a1a;\n    font-size: {{TITLE_SIZE}}px;\n    font-weight: {{TITLE_WEIGHT}};\n    font-family: '{{FONT_FAMILY}}', 'Arial', sans-serif;\n    letter-spacing: 0.5px;\n    text-transform: uppercase;\n}",
    js_template: "(() => {\n    const root = document.getElementById(\"{{ID}}\");\n    const bar = root.querySelector(\".na-zywo-city-bar-standalone\");\n    root.__slt_show = () => {\n        const delay = parseFloat(\"{{ANIMATION_DELAY}}\") || 0;\n        if(bar) {\n            bar.style.transitionDelay = delay + \"s\";\n            void bar.offsetWidth;\n            bar.style.opacity = \"1\";\n            bar.style.transform = \"{{ANIMATION_IDENTITY}}\";\n        }\n    };\n    root.__slt_hide = () => {\n        if (bar) {\n            bar.style.transition = \"all {{ANIMATION_OUT_DURATION}}s {{ANIMATION_OUT_EASE}} {{ANIMATION_OUT_DELAY}}s\";\n            bar.style.opacity = \"0\";\n            bar.style.transform = \"{{ANIMATION_OUT_TRANSFORM}}\";\n        }\n    };\n})();",
    defaultFields: {
        title: "WARSZAWA",
        primaryColor: "#ffffff"
    },
    defaultLayout: {
        x: 100,
        y: 150,
        layer: 99,
        scale: 1.5
    }
};

// Insert after na-zywo-badge
const naZywoIndex = db.templates.findIndex(t => t.id === 'na-zywo-badge');
if (naZywoIndex !== -1) {
    db.templates.splice(naZywoIndex + 1, 0, cityBarTemplate);
} else {
    db.templates.push(cityBarTemplate);
}

// 2. Modify na-zywo-badge to remove the city bar and subtitle
const naZywo = db.templates.find(t => t.id === 'na-zywo-badge');
if (naZywo) {
    naZywo.html_template = "<div class=\"na-zywo-wrapper\">\n    <div class=\"na-zywo-container\">\n        <span class=\"na-zywo-dot\"></span>\n        <span class=\"na-zywo-text\">{{{TITLE}}}</span>\n    </div>\n</div>";
    // Remove na-zywo-city-bar from CSS
    naZywo.css_template = "#{{ID}} .na-zywo-wrapper {\n    display: inline-flex;\n    flex-direction: column;\n    align-items: stretch;\n    transform-origin: center center;\n    opacity: 0;\n    transform: {{ANIMATION_IN_TRANSFORM}};\n    transition: all {{ANIMATION_DURATION}}s {{ANIMATION_EASE}};\n    box-shadow: 0 4px 12px rgba(0,0,0,0.5);\n    border-radius: 4px;\n    overflow: hidden;\n}\n#{{ID}} .na-zywo-container {\n    display: inline-flex;\n    align-items: center;\n    background-color: {{PRIMARY_COLOR}};\n    padding: 8px 16px;\n    font-family: '{{FONT_FAMILY}}', 'Arial', sans-serif;\n}\n#{{ID}} .na-zywo-dot {\n    width: 14px;\n    height: 14px;\n    background-color: #ffffff;\n    border-radius: 50%;\n    margin-right: 12px;\n    animation: pulse-dot 1s infinite alternate;\n    box-shadow: 0 0 5px rgba(255,255,255,0.8);\n}\n#{{ID}} .na-zywo-text {\n    color: {{TITLE_COLOR}};\n    font-size: {{TITLE_SIZE}}px;\n    font-weight: {{TITLE_WEIGHT}};\n    letter-spacing: 1px;\n    text-transform: uppercase;\n}\n@keyframes pulse-dot {\n    0% { opacity: 1; transform: scale(1); }\n    100% { opacity: 0.3; transform: scale(0.9); }\n}";
    if (naZywo.defaultFields && naZywo.defaultFields.subtitle !== undefined) {
        delete naZywo.defaultFields.subtitle;
    }
}

// 3. Remove subtitle from system-standard (belka szablonu)
const systemStandard = db.templates.find(t => t.id === 'system-standard');
if (systemStandard) {
    systemStandard.html_template = systemStandard.html_template.replace(/<h2 class="subtitle">.*?<\/h2>/g, '').replace(/\n\s*\n/g, '\n');
    systemStandard.css_template = systemStandard.css_template.replace(/\.subtitle \{[\s\S]*?\}/g, '').replace(/\n\s*\n/g, '\n');
    if (systemStandard.defaultFields && systemStandard.defaultFields.subtitle !== undefined) {
        delete systemStandard.defaultFields.subtitle;
    }
}

// Also remove subtitle from modern-lower-third just in case they meant both.
const modernLowerThird = db.templates.find(t => t.id === 'modern-lower-third');
if (modernLowerThird) {
    modernLowerThird.html_template = modernLowerThird.html_template.replace(/<h2 class="modern-subtitle">.*?<\/h2>/g, '').replace(/\n\s*\n/g, '\n');
    modernLowerThird.css_template = modernLowerThird.css_template.replace(/\.modern-subtitle \{[\s\S]*?\}/g, '').replace(/\n\s*\n/g, '\n');
    if (modernLowerThird.defaultFields && modernLowerThird.defaultFields.subtitle !== undefined) {
        delete modernLowerThird.defaultFields.subtitle;
    }
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('db.json updated successfully.');
