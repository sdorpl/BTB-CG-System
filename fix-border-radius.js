const fs = require('fs');

const dbPath = './db.json';
let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Exact matching:
// .na-zywo-container -> padding: 8px 16px, border-radius: 4px
// But wait, the background for na-zywo is placed on `.na-zywo-wrapper` AND `.na-zywo-container`?
// Let's refine NA-ZYWO to exactly match city-bar geometrically.

const naZywo = db.templates.find(t => t.id === 'na-zywo-badge');
if (naZywo) {
    // Modify CSS: remove border radius from wrapper to avoid double-clipping, ensure exact container match
    naZywo.css_template = "#{{ID}} .na-zywo-wrapper {\n    display: inline-flex;\n    flex-direction: column;\n    align-items: stretch;\n    transform-origin: center center;\n    opacity: 0;\n    transform: {{ANIMATION_IN_TRANSFORM}};\n    transition: all {{ANIMATION_DURATION}}s {{ANIMATION_EASE}};\n    box-shadow: 0 4px 12px rgba(0,0,0,0.5);\n    border-radius: 4px;\n    overflow: hidden;\n}\n#{{ID}} .na-zywo-container {\n    display: inline-flex;\n    align-items: center;\n    background-color: {{PRIMARY_COLOR}};\n    padding: 8px 16px;\n    border-radius: 4px;\n    font-family: '{{FONT_FAMILY}}', 'Arial', sans-serif;\n}\n#{{ID}} .na-zywo-dot {\n    width: 14px;\n    height: 14px;\n    background-color: #ffffff;\n    border-radius: 50%;\n    margin-right: 12px;\n    animation: pulse-dot 1s infinite alternate;\n    box-shadow: 0 0 5px rgba(255,255,255,0.8);\n}\n#{{ID}} .na-zywo-text {\n    color: {{TITLE_COLOR}};\n    font-size: {{TITLE_SIZE}}px;\n    font-weight: {{TITLE_WEIGHT}};\n    letter-spacing: 1px;\n    text-transform: uppercase;\n}\n@keyframes pulse-dot {\n    0% { opacity: 1; transform: scale(1); }\n    100% { opacity: 0.3; transform: scale(0.9); }\n}";
}

const cityBar = db.templates.find(t => t.id === 'city-bar');
if (cityBar) {
    // City bar is just a single div with no wrapper right now. Let's make sure it matches.
    cityBar.css_template = "#{{ID}} .na-zywo-city-bar-standalone {\n    background-color: {{PRIMARY_COLOR}};\n    padding: 8px 16px;\n    display: inline-flex;\n    align-items: center;\n    box-shadow: 0 4px 12px rgba(0,0,0,0.5);\n    border-radius: 4px;\n    opacity: 0;\n    transform: {{ANIMATION_IN_TRANSFORM}};\n    transition: all {{ANIMATION_DURATION}}s {{ANIMATION_EASE}};\n    font-family: '{{FONT_FAMILY}}', 'Arial', sans-serif;\n}\n#{{ID}} .na-zywo-city-text {\n    color: {{TITLE_COLOR}};\n    font-size: {{TITLE_SIZE}}px;\n    font-weight: {{TITLE_WEIGHT}};\n    letter-spacing: 1px;\n    text-transform: uppercase;\n}";
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Fixed border radiuses');
