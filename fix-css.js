const fs = require('fs');

const dbPath = './db.json';
let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const systemStandard = db.templates.find(t => t.id === 'system-standard');
if (systemStandard) {
    systemStandard.css_template = "\n.lt-container {\n    padding: 0;\n    font-family: '{{FONT_FAMILY}}', sans-serif;\n}\n.plate {\n    background: {{PRIMARY_COLOR}};\n    padding: 20px 40px;\n    border-left: 10px solid {{SECONDARY_COLOR}};\n    color: white;\n    display: inline-block;\n    box-shadow: 0 10px 30px rgba(0,0,0,0.3);\n    opacity: 0;\n    transform: {{ANIMATION_IN_TRANSFORM}};\n    transition: all {{ANIMATION_DURATION}}s {{ANIMATION_EASE}};\n}\n.title {\n    margin: 0;\n    font-size: {{TITLE_SIZE}}px;\n    font-weight: {{TITLE_WEIGHT}};\n    text-transform: {{TITLE_TRANSFORM}};\n    letter-spacing: -1px;\n}\n";
}

const modernLowerThird = db.templates.find(t => t.id === 'modern-lower-third');
if (modernLowerThird) {
    modernLowerThird.css_template = ".modern-lt-container {\n    padding: 0;\n    font-family: '{{FONT_FAMILY}}', sans-serif;\n}\n.modern-plate {\n    background: linear-gradient(135deg, {{PRIMARY_COLOR}}, {{SECONDARY_COLOR}});\n    padding: 24px 48px;\n    border-radius: 12px;\n    color: white;\n    display: inline-block;\n    box-shadow: 0 20px 40px rgba(0,0,0,0.4);\n    opacity: 0;\n    transform: {{ANIMATION_IN_TRANSFORM}};\n    transition: all {{ANIMATION_DURATION}}s {{ANIMATION_EASE}};\n    border: 1px solid rgba(255,255,255,0.1);\n    backdrop-filter: blur(10px);\n}\n.modern-title {\n    margin: 0;\n    font-size: {{TITLE_SIZE}}px;\n    font-weight: {{TITLE_WEIGHT}};\n    text-transform: {{TITLE_TRANSFORM}};\n    letter-spacing: 1px;\n    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);\n}\n.modern-plate {\n    position: relative;\n    overflow: hidden;\n}\n.modern-plate::after {\n    content: '';\n    position: absolute;\n    top: 0;\n    left: -100%;\n    width: 50%;\n    height: 100%;\n    background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);\n    transform: skewX(-20deg);\n    animation: shine 6s infinite;\n}\n@keyframes shine {\n    0% { left: -100%; }\n    20% { left: 200%; }\n    100% { left: 200%; }\n}";
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Fixed CSS in db.json');
