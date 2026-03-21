const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const Handlebars = require('handlebars');

const tplJSON = JSON.parse(fs.readFileSync('templates/ticker_unified.json', 'utf8'));

const itemsData = [
  { text: "Testowa Wiadomość 1", category: "PILNE" },
  { text: "Testowa Wiadomość 2", category: "INFO" }
];
const itemsStrings = itemsData.map(id => id.text);
const s = JSON.stringify(itemsData);
const b64 = Buffer.from(s).toString('base64').replace(/=+$/, '');

const MODE = 'whip'; // Can be whip, horizontal, vertical

const htmlContext = {
    ID: 'test-unified',
    ITEMS: itemsStrings,
    ITEMS_JSON: s,
    ITEMS_B64: b64,
    TICKER_MODE: MODE,
    WIPER_SHOW: true,
    TITLE_SIZE: 40,
    WIPER_TEXT: 'PILNE',
};

const processedHtml = Handlebars.compile(tplJSON.html_template)(htmlContext);
const processedJs = Handlebars.compile(tplJSON.js_template)(htmlContext);

const domHtml = `<!DOCTYPE html>
<html>
<head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
</head>
<body>
    <div id="test-unified">${processedHtml}</div>
    <script>${processedJs}</script>
</body>
</html>`;

const dom = new JSDOM(domHtml, { runScripts: 'dangerously', resources: 'usable' });

dom.window.console.log = (...args) => console.log('LOG:', ...args);
dom.window.console.error = (...args) => console.error('ERROR:', ...args);

setTimeout(() => {
    const root = dom.window.document.getElementById('test-unified');
    if (root.__slt_show) {
        console.log('Running __slt_show...');
        root.__slt_show();
        
        setTimeout(() => {
            const singleText = root.querySelector('.utk-single-text');
            console.log('Single text innerHTML:', singleText.innerHTML);
            console.log('Single text classes:', singleText.className);
            console.log('Single text opacity:', dom.window.getComputedStyle(singleText).opacity);
            console.log('Wiper text:', root.querySelector('.utk-wiper-text').innerHTML);
            console.log('Wiper display:', root.querySelector('.utk-wiper').style.display);
            process.exit(0);
        }, 1500);
    } else {
        console.error('No __slt_show found');
        process.exit(1);
    }
}, 1000);
