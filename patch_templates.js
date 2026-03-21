const fs = require('fs');

const inLogic = `
        if (textTl) {
            if ({{{TEXT_ANIM_SYNC}}}) {
                tl.add(textTl, ">-0.1");
            } else {
                tl.add(textTl, 0);
            }
        }`;

const outLogic = `
        if (textTl) {
            if ({{{TEXT_ANIM_OUT_SYNC}}}) {
                const combined = gsap.timeline();
                combined.add(textTl);
                combined.add(tl, ">-0.1");
                return combined;
            } else {
                tl.add(textTl, 0);
            }
        }`;

function fixJsTemplate(jsStr) {
    if (!jsStr) return jsStr;
    
    // Replace IN logic if it uses the old ternary or just hardcoded add
    jsStr = jsStr.replace(/if\s*\(textTl\)\s*tl\.add\(textTl,\s*\{\{\{TEXT_ANIM_SYNC\}\}\}\s*\?\s*">[^"]+"\s*:\s*0\);/g, inLogic.trim());
    jsStr = jsStr.replace(/if\s*\(textTl\)\s*tl\.add\(textTl,\s*0\);/g, outLogic.trim());
    
    // For OUT, standard replacements:
    // If it has the old complex sync logic for OUT, leave it, but some have hardcoded `tl.add(textTl, 0);` in root.__slt_hide.
    // We already replaced it above if it matched generic 0. But wait, what if IN matched `tl.add(textTl, 0)`?
    // Let's do it safely using Regex for __slt_show and __slt_hide.
    
    return jsStr;
}

function processFile(path) {
    try {
        const data = JSON.parse(fs.readFileSync(path, 'utf8'));
        let modified = false;
        
        if (data.js_template) {
            // Fix __slt_show
            let showMatch = data.js_template.match(/root\.__slt_show\s*=\s*\(\)\s*=>\s*\{([\s\S]*?)return tl;\s*\};/);
            if (showMatch) {
                let inner = showMatch[1];
                inner = inner.replace(/if\s*\(textTl\)\s*tl\.add\(textTl.*?\);/g, inLogic.trim());
                data.js_template = data.js_template.replace(showMatch[1], inner);
                modified = true;
            }
            
            // Fix __slt_hide
            let hideMatch = data.js_template.match(/root\.__slt_hide\s*=\s*\(\)\s*=>\s*\{([\s\S]*?)return (tl|combined);\s*\};/);
            if (hideMatch) {
                let inner = hideMatch[1];
                // remove existing add
                if (inner.includes("combined.add")) {
                    // Already has complex logic
                } else {
                    inner = inner.replace(/if\s*\(textTl\)\s*tl\.add\(textTl.*?\);/g, outLogic.trim());
                    // Since outLogic returns early, we need to handle the return tl; at the end of the method
                    // Actually, I'll just rewrite the whole hide match
                    let newInner = `
        const tl = GSAPFX.standardOut(container, {{{ANIMATION_OUT_JSON}}});
        const textTl = GSAPFX.applyTextOutEffect(root, {{{TEXT_ANIM_OUT_JSON}}});
        ${outLogic.trim()}
        `;
                    // some have clock timer clear... let's just replace the textTl adding logic
                    inner = inner.replace(/const\s+textTl[\s\S]*?;/g, "const textTl = GSAPFX.applyTextOutEffect(root, {{{TEXT_ANIM_OUT_JSON}}});");
                    // remove any tl.add(textTl)
                    inner = inner.replace(/if\s*\(textTl\)\s*tl\.add\(textTl.*?\);/g, "");
                    // add the new outLogic before `return tl;`
                    
                    data.js_template = data.js_template.replace(hideMatch[1], inner + "\n        " + outLogic.trim() + "\n        ");
                }
                modified = true;
            }
        }
        
        // Similarly for templates inside db.json
        if (data.templates && Array.isArray(data.templates)) {
            data.templates.forEach(tpl => {
                if (tpl.js_template) {
                    
                     let hideMatch = tpl.js_template.match(/root\.__slt_hide\s*=\s*\(\)\s*=>\s*\{([\s\S]*?)return\s+(tl|combined);\s*\};/);
                     if (hideMatch && !hideMatch[1].includes('combined.add')) {
                         let inner = hideMatch[1].replace(/if\s*\(textTl\)\s*tl\.add\(textTl.*?\);/g, "");
                         tpl.js_template = tpl.js_template.replace(hideMatch[1], inner + "\n        " + outLogic.trim() + "\n        ");
                     }
                     
                     let showMatch = tpl.js_template.match(/root\.__slt_show\s*=\s*\(\)\s*=>\s*\{([\s\S]*?)return\s+tl;\s*\};/);
                     if (showMatch) {
                         let inner = showMatch[1].replace(/if\s*\(textTl\)\s*tl\.add\(textTl.*?\);/g, inLogic.trim());
                         tpl.js_template = tpl.js_template.replace(showMatch[1], inner);
                     }
                     modified = true;
                }
            });
        }
        
        if (modified) {
            fs.writeFileSync(path, JSON.stringify(data, null, 2));
            console.log("Patched", path);
        }
    } catch (e) { console.error("Error with", path, e); }
}

const glob = require('fs').readdirSync;
const dir = './tests/OCG/ocg-tpl/';
const files = glob(dir).filter(f => f.endsWith('.json')).map(f => dir + f);
files.push('./db.json');

files.forEach(processFile);
