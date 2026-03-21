const { JSDOM } = require("jsdom");
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
</head>
<body>
<div id="ID_123">
<div class="utk-container v2">
    <div class="utk-wiper" style="display:flex;">
        <span class="utk-wiper-text">INFO</span>
    </div>
    <div class="utk-panel-single" style="display:block;">
        <div class="utk-msg-box"></div>
    </div>
    <div id="f-news-list" style="display:none;" data-b64="W3sidGV4dCI6IlRlc3QgbWVzc2FnZSIsImNhdGVnb3J5IjoiSEVMTE8ifV0="></div>
</div>
</div>
<script>
    const root = document.getElementById("ID_123");
    const container   = root.querySelector('.utk-container');
    const wiper       = root.querySelector('.utk-wiper');
    const wiperText   = root.querySelector('.utk-wiper-text');
    const panelSingle = root.querySelector('.utk-panel-single');
    const msgBox      = root.querySelector('.utk-msg-box');
    const dataEl      = root.querySelector('#f-news-list');

    const MODE = "whip";
    const TICKER_SPEED_VAL = 5;
    const WIPER_SHOW = true;
    let items = [{text: "Testowa Wiadomosc", category: "PILNE"}];

    let currentIndex = 0;
    let cycleRunning = true;

    function getWiperWidth() {
        return (wiper && wiper.style.display !== 'none') ? 150 : 0; // Mocked for jsdom
    }

    function updateWiperUI(labelText) {
        const label = labelText || "DOMYSLNE";
        if (wiper) {
            wiper.style.display = 'flex';
            if (wiperText) wiperText.innerText = label;
        }
        container.style.setProperty('--wiper-w', getWiperWidth() + 'px');
    }

    function adjustFont(el) {
        const base = 40;
        const wiperW = getWiperWidth();
        const maxW = 1920 - wiperW - 40; // Mocked
        el.style.paddingLeft = (wiperW > 0 ? (wiperW + 20) : 20) + 'px';
        el.style.fontSize = base + 'px';
        console.log("Adjusted font. paddingLeft:", el.style.paddingLeft, "wiperW:", wiperW);
    }

    function runSingle() {
        msgBox.classList.remove('visible');
        const item = items[currentIndex];
        msgBox.innerHTML = item.text;
        updateWiperUI(item.category);
        adjustFont(msgBox);
        
        console.log("msgBox.innerHTML:", msgBox.innerHTML);
        console.log("wiperText.innerText:", wiperText.innerText);
    }
    runSingle();
</script>
</body>
</html>
`, { runScripts: "dangerously" });
