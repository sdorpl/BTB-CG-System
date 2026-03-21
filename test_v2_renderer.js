const fs = require('fs');

const tplStr = fs.readFileSync('templates/ticker_unified_v2.json', 'utf8');
const tpl = JSON.parse(tplStr);

let html = tpl.html_template;
let css = tpl.css_template;
let js = tpl.js_template;

// mock Handlebars rendering
const data = {
    ID: "MY_TEST_ID",
    WIPER_SHOW: true,
    WIPER_TEXT: "INFO",
    ITEMS_B64: Buffer.from(JSON.stringify([{text: "Message 1", category: "INFO"}])).toString('base64'),
    TICKER_MODE: "whip",
    TICKER_SPEED: 5,
    TITLE_SIZE: 40,
    WIPER_GLEAM_ENABLED: false,
    WIPER_GLEAM_DURATION: 2,
    WIPER_FONT_WEIGHT: 700,
    WIPER_FONT_SIZE: 30,
    WIPER_FONT: "Arial",
    WIPER_TEXT_COLOR: "white",
    WIPER_LETTER_SPACING: 1,
    TITLE_COLOR: "white",
    TITLE_WEIGHT: 700,
    TITLE_TRANSFORM: "uppercase",
    SEPARATOR_CSS: "margin: 0;",
    PRIMARY_BG: "black",
    BORDER_WIDTH: 0,
    BORDER_COLOR: "red",
    BORDER_RADIUS: 5,
    BOX_SHADOW: "none"
};

for (const key in data) {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
    html = html.replace(new RegExp(`{{#if ${key}}}(.*?){{else}}(.*?){{/if}}`, 'g'), data[key] ? '$1' : '$2');
    html = html.replace(new RegExp(`{{#unless ${key}}}(.*?){{/unless}}`, 'g'), !data[key] ? '$1' : '');
    css = css.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
    css = css.replace(new RegExp(`{{#if ${key}}}(.*?){{else}}(.*?){{/if}}`, 'g'), data[key] ? '$1' : '$2');
    js = js.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
}

html = html.replace(/{{#if ITEMS}}[\s\S]*?{{\/if}}/g, '<div class="utk-item">Mocked</div>');

console.log("=== HTML ===");
console.log(html);
console.log("=== JS ===");
console.log(js);
