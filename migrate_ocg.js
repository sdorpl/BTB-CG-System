const fs = require('fs');
const path = require('path');

const ocgTplDir = path.join(__dirname, 'tests/OCG/ocg-tpl');
const mainDbPath = path.join(__dirname, 'db.json');

function overrideCanvasLowerThirds(template) {
    let t = template;
    
    // belka_biala
    if (t.id === 'tpl_belka_biala_v7') {
        t.html = `<div class="lt-container-v8"><div class="text-overlay" style="color:{{TITLE_COLOR}};">{{{TITLE}}}</div></div>`;
        t.css = `
.lt-container-v8 { position: relative; width: var(--v-width, 1575px); height: var(--v-height, 170px); background: linear-gradient(90deg, {{PRIMARY_COLOR}} 0%, {{SECONDARY_COLOR}} 50%, {{PRIMARY_COLOR}} 100%); display: flex; align-items: center; border-bottom: 4px solid rgba(0,0,0,0.1); transform: scaleX(0); transform-origin: left; transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }
.lt-container-v8.active { transform: scaleX(1); }
.text-overlay { margin-left: 30px; font-family: 'Bahnschrift', sans-serif; font-size: 80px; font-weight: bold; opacity: 0; white-space: nowrap; transition: opacity 0.4s ease 0.4s; }
.lt-container-v8.active .text-overlay { opacity: 1; }
        `;
        t.js = ``;
    }

    // belka_czerwona
    if (t.id === 'tpl_belka_czerwona_v7') {
        t.html = `<div class="lt-container-v8"><div class="text-overlay" style="color:{{TITLE_COLOR}};">{{{TITLE}}}</div></div>`;
        t.css = `
.lt-container-v8 { position: relative; width: var(--v-width, 1575px); height: var(--v-height, 170px); background: linear-gradient(90deg, {{PRIMARY_COLOR}} 0%, {{SECONDARY_COLOR}} 50%, {{PRIMARY_COLOR}} 100%); display: flex; align-items: center; border-bottom: 4px solid rgba(0,0,0,0.3); transform: scaleX(0); transform-origin: left; transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }
.lt-container-v8.active { transform: scaleX(1); }
.text-overlay { margin-left: 30px; font-family: 'Bahnschrift', sans-serif; font-size: 80px; font-weight: bold; opacity: 0; white-space: nowrap; transition: opacity 0.4s ease 0.4s; }
.lt-container-v8.active .text-overlay { opacity: 1; }
        `;
        t.js = ``;
    }

    // belka_nazwiskowa
    if (t.id === 'tpl_belka_nazwiskowa_v7') {
        t.html = `
<div class="lt-container-v8-nazwa">
    <div class="nazwa-row"><div class="text-overlay" style="color:{{TITLE_COLOR}};">{{{TITLE}}}</div></div>
    <div class="sub-row"><div class="sub-text-overlay" style="color:{{SUBTITLE_COLOR}};">{{{SUBTITLE}}}</div></div>
</div>`;
        t.css = `
.lt-container-v8-nazwa { position: relative; display:flex; flex-direction:column; justify-content:flex-end; width: var(--v-width, 1575px); height: var(--v-height, 170px); }
.nazwa-row { height: 110px; width: 100%; background: linear-gradient(90deg, {{PRIMARY_COLOR}} 0%, {{SECONDARY_COLOR}} 50%, {{PRIMARY_COLOR}} 100%); display: flex; align-items: center; border-bottom: 4px solid rgba(0,0,0,0.1); transform: scaleX(0); transform-origin: left; transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }
.sub-row { height: 60px; width: 54%; background: linear-gradient(90deg, {{PRIMARY_COLOR}} 0%, {{SECONDARY_COLOR}} 100%); display: flex; align-items: center; transform: scaleX(0); transform-origin: left; transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s; }
.lt-container-v8-nazwa.active .nazwa-row { transform: scaleX(1); }
.lt-container-v8-nazwa.active .sub-row { transform: scaleX(1); }
.text-overlay { margin-left: 30px; font-family: 'Bahnschrift', sans-serif; font-size: 80px; font-weight: bold; opacity: 0; white-space: nowrap; transition: opacity 0.4s ease 0.4s; }
.sub-text-overlay { margin-left: 30px; font-family: 'Bahnschrift', sans-serif; font-size: 32px; font-weight: normal; opacity: 0; white-space: nowrap; transition: opacity 0.4s ease 0.6s; }
.lt-container-v8-nazwa.active .text-overlay { opacity: 1; }
.lt-container-v8-nazwa.active .sub-text-overlay { opacity: 1; }
        `;
        t.js = ``;
    }

    return t;
}

// Helper to replace text colors and content in HTML
function transformHtml(html, id) {
    let newHtml = html;
    
    // Map tags
    ['f-tag-nazywo', 'f-tag-powtorka', 'f-tag-bialystok', 'f-tag-spec', 'f-tytul-wartosc'].forEach(tag => {
        if (newHtml.includes(`id="${tag}"`)) {
            newHtml = newHtml.replace(new RegExp(`id="${tag}"[^>]*>.*?<\\/span>`), `id="${tag}">{{{TITLE}}}</span>`);
            // If it's a hidden span used for canvas data
            if (newHtml.includes(`id="${tag}" style="display:none;"`)) {
                 newHtml = newHtml.replace(new RegExp(`id="${tag}" style="display:none;">.*?<\\/span>`), `id="${tag}" style="display:none;">{{{TITLE}}}</span>`);
            }
        }
    });

    // Map list containers to Handlebars list context
    if (newHtml.includes('id="f-news-list"')) {
        newHtml = newHtml.replace(/id="f-news-list"[^>]*>.*?<\/div>/, 'id="f-news-list" style="display:none;">{{{ITEMS_JSON}}}</div>');
    }
    if (newHtml.includes('id="f-crawl-list"')) {
        newHtml = newHtml.replace(/id="f-crawl-list"[^>]*>.*?<\/div>/, 'id="f-crawl-list" style="display:none;">{{{ITEMS_JSON}}}</div>');
    }

    return newHtml;
}

// Helper to fix CSS wrapper attributes to allow free placement
function filterResponsiveCss(css) {
    let newCss = css;
    newCss = newCss.replace(/position:\s*absolute;/g, 'position: relative;');
    newCss = newCss.replace(/bottom:\s*[\dpx]+;/g, '');
    newCss = newCss.replace(/right:\s*[\dpx]+;/g, '');
    newCss = newCss.replace(/left:\s*[\dpx]+;/g, '');
    newCss = newCss.replace(/top:\s*[\dpx]+;/g, '');
    
    // Wipers & Tags widths
    newCss = newCss.replace(/width:\s*190px;/g, 'width: var(--v-width, 190px);');
    newCss = newCss.replace(/width:\s*380px;/g, 'width: var(--v-width, 380px);');
    newCss = newCss.replace(/width:\s*100%;/g, 'width: var(--v-width, 100%);');
    return newCss;
}

function filterJs(js) {
    // Hidden tags are sometimes ignored by innerText. textContent solves it.
    let newJs = js.replace(/\.innerText/g, '.textContent');
    // Ensure relative sizing doesn't break canvas if it expects full 1920
    return newJs;
}

function transformHtmlCssJs(template) {
    let t = overrideCanvasLowerThirds(template);

    t.html = transformHtml(t.html, t.id);
    
    // Allow custom BG for wipers
    if (t.id === 'tpl_wiper_news') {
        t.css = t.css.replace(/background: linear-gradient\(90deg, #ff0055 0%, #e30613 100%\);/, 'background: {{WIPER_BG}};');
        t.css = t.css.replace(/background-color: #730000;/, 'background: {{PRIMARY_BG}};');
    }

    if (t.css && !t.css.includes('var(--v-width')) {
        t.css = filterResponsiveCss(t.css);
    }
    if (t.js) t.js = filterJs(t.js);

    return { html: t.html, css: t.css, js: t.js };
}

function runMigration() {
    if (!fs.existsSync(ocgTplDir)) {
        console.error("OCG Template directory not found!");
        return;
    }

    let mainDb;
    try {
        mainDb = JSON.parse(fs.readFileSync(mainDbPath, 'utf8'));
    } catch (e) {
        console.error("Failed to read db.json:", e);
        return;
    }

    // Filter out existing OCG templates safely
    const otherTemplates = (mainDb.templates || []).filter(t => t && t.id && !t.id.startsWith('tpl-ocg-'));
    const newTemplates = [];
    let convertedCount = 0;

    const files = fs.readdirSync(ocgTplDir).filter(f => f.endsWith('.json'));

    files.forEach(file => {
        console.log(`Processing ${file}...`);
        const filePath = path.join(ocgTplDir, file);
        let ocgTpl;
        try {
            ocgTpl = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            console.error(`Failed to parse ${file}:`, e);
            return;
        }

        const targetId = `tpl-ocg-${ocgTpl.id.replace('tpl_', '')}`;
        const { html, css, js } = transformHtmlCssJs({...ocgTpl});

        let type = "LOWER_THIRD";
        if (ocgTpl.id.includes('wiper') || ocgTpl.id.includes('crawl') || ocgTpl.id.includes('news')) {
            type = "TICKER";
        }
        
        // Build Default Fields
        const df = {};
        (ocgTpl.inputs || []).forEach(inp => {
            if (inp.id.includes('tytul') || inp.id.includes('tag') || inp.id.includes('nazwa') || inp.id.includes('wartosc')) {
                if (inp.id.includes('sub')) df.subtitle = inp.default;
                else df.title = inp.default;
            } else if (inp.id.includes('list')) {
                try {
                    df.items = JSON.parse(inp.default);
                } catch(e) {
                    df.items = [inp.default];
                }
            } else {
                df[inp.id] = inp.default;
            }
        });

        const newTemplate = {
            id: targetId,
            name: `OCG: ${ocgTpl.name}`,
            type: type,
            version: 1,
            html_template: html || "",
            css_template: css || "",
            js_template: js || "",
            defaultFields: df
        };

        console.log(`Successfully transformed ${targetId}`);
        newTemplates.push(newTemplate);
        convertedCount++;
    });

    // Combine
    mainDb.templates = otherTemplates.concat(newTemplates);

    // Backup and save
    try {
        fs.writeFileSync(mainDbPath.replace('db.json', 'db_backup_ocg.json'), fs.readFileSync(mainDbPath));
        fs.writeFileSync(mainDbPath, JSON.stringify(mainDb, null, 2));
        console.log(`Success: Converted ${convertedCount} templates and updated db.json.`);
    } catch (e) {
        console.error("Failed to save db.json:", e);
    }
}

runMigration();
