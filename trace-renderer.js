const fs = require('fs');
const Handlebars = require('handlebars');

const tplJSON = JSON.parse(fs.readFileSync('templates/ticker_unified.json', 'utf8'));

// MOCK data
const graphic = {
    id: 'test1',
    templateId: tplJSON.id,
    items: [
        {text: "Testowa Wiadomość 1", category: "PILNE"},
        {text: "Testowa Wiadomość 2", category: "INFO"}
    ],
    visible: true,
    tickerMode: 'whip'
};

const itemsData = graphic.items.map(item => ({
    text: typeof item === 'object' ? (item.text || '') : item,
    category: typeof item === 'object' ? (item.category || '') : '',
}));

const itemsStrings = itemsData.map(id => id.text);

const b64 = (typeof btoa !== 'undefined') ? btoa(unescape(encodeURIComponent(JSON.stringify(itemsData)))) : ((typeof Buffer !== 'undefined') ? Buffer.from(JSON.stringify(itemsData)).toString('base64') : '');

let htmlContext = {
    ID: graphic.id,
    ITEMS: itemsStrings,
    ITEMS_JSON: JSON.stringify(itemsData),
    ITEMS_B64: b64,
    TICKER_MODE: graphic.tickerMode || 'whip',
    WIPER_SHOW: true,
    TITLE_SIZE: 40,
    WIPER_TEXT: graphic.introText || 'PILNE',
};

const templateHtml = Handlebars.compile(tplJSON.html_template)(htmlContext);

console.log("=== HTML ===");
console.log(templateHtml);

console.log("\n=== DECODING TEST ===");
const match = templateHtml.match(/data-b64="([^"]+)"/);
if (match) {
    const extractedB64 = match[1];
    console.log("Extracted b64:", extractedB64);
    try {
        const decoded = JSON.parse(decodeURIComponent(escape(Buffer.from(extractedB64, 'base64').toString('binary'))));
        console.log("Decoded Items:", decoded);
    } catch (e) {
        console.error("Decode error:", e);
    }
} else {
    console.log("NO data-b64 attribute found!");
}
