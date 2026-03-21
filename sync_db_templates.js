const fs = require('fs');
const glob = require('fs').readdirSync;

// The JS template for standard belts (like OCG belka biala, czerwona, nazwiskowa)
const defaultJsTemplate = `(() => {
    const root = document.getElementById("{{ID}}");
    const container = root.querySelector("div[class^='lt-container']");
    if (!container) return;
    root.__slt_show = () => {
        const tl = GSAPFX.standardIn(container, {{{ANIMATION_IN_JSON}}});
        const textTl = GSAPFX.applyTextEffect(root, {{{TEXT_ANIM_JSON}}});
        if (textTl) {
            if ({{{TEXT_ANIM_SYNC}}}) {
                tl.add(textTl, ">-0.1");
            } else {
                tl.add(textTl, 0);
            }
        }
        return tl;
    };
    root.__slt_hide = () => {
        const tl = GSAPFX.standardOut(container, {{{ANIMATION_OUT_JSON}}});
        const textTl = GSAPFX.applyTextOutEffect(root, {{{TEXT_ANIM_OUT_JSON}}});
        if (textTl) {
            if ({{{TEXT_ANIM_OUT_SYNC}}}) {
                const combined = gsap.timeline();
                combined.add(textTl);
                combined.add(tl, ">-0.1");
                return combined;
            } else {
                tl.add(textTl, 0);
            }
        }
        return tl;
    };
})();`;

try {
    const dbData = JSON.parse(fs.readFileSync('./db.json', 'utf8'));
    let modified = false;

    if (dbData.templates && Array.isArray(dbData.templates)) {
        dbData.templates.forEach(tpl => {
            // 1. Repair empty js_templates
            if (!tpl.js_template || tpl.js_template.trim() === "") {
                // If it's a Canvas template from the name/html, skip
                if (tpl.id.includes("canvas") || tpl.name.includes("CANVAS") || (tpl.html_template && tpl.html_template.includes("<canvas"))) {
                    // Do nothing for canvas
                } 
                // For other empty js_templates in db.json (like OCG BELKA), inject standard logic
                else if (tpl.type === 'LOWER_THIRD') {
                    // For TAGs: they are small banners usually with .live-tag inside
                    if (tpl.name.includes("TAG:")) {
                        tpl.js_template = `(() => {
    const root = document.getElementById("{{ID}}");
    const container = root.querySelector("div[id^='tag-']");
    if (!container) return;
    root.__slt_show = () => {
        const tl = GSAPFX.standardIn(container, {{{ANIMATION_IN_JSON}}});
        const textTl = GSAPFX.applyTextEffect(root, {{{TEXT_ANIM_JSON}}});
        if (textTl) {
            if ({{{TEXT_ANIM_SYNC}}}) {
                tl.add(textTl, ">-0.1");
            } else {
                tl.add(textTl, 0);
            }
        }
        return tl;
    };
    root.__slt_hide = () => {
        const tl = GSAPFX.standardOut(container, {{{ANIMATION_OUT_JSON}}});
        const textTl = GSAPFX.applyTextOutEffect(root, {{{TEXT_ANIM_OUT_JSON}}});
        if (textTl) {
            if ({{{TEXT_ANIM_OUT_SYNC}}}) {
                const combined = gsap.timeline();
                combined.add(textTl);
                combined.add(tl, ">-0.1");
                return combined;
            } else {
                tl.add(textTl, 0);
            }
        }
        return tl;
    };
})();`;
                    } else {
                        // General replacements
                        tpl.js_template = defaultJsTemplate;
                    }
                    modified = true;
                    console.log("[db.json] Injected js_template for (empty field)", tpl.name);
                }
            }
            
            // 2. Specifically update other generic templates in db.json like 'system-standard'
            // Ensure they use the new sync logic.
            if (tpl.js_template && tpl.js_template.includes("GSAPFX.applyTextOutEffect")) {
                if (tpl.js_template.includes("if (textTl) { const sync = {{{TEXT_ANIM_OUT_SYNC}}};")) {
                    // Replace the old ternary logic for out
                    tpl.js_template = tpl.js_template.replace(/if\s*\(textTl\)\s*\{\s*const sync = \{\{\{TEXT_ANIM_OUT_SYNC\}\}\};\s*if\s*\(sync\)\s*\{\s*const combined = gsap\.timeline\(\);\s*combined\.add\(textTl\);\s*combined\.add\(tl,\s*">-0.1"\);\s*return combined;\s*\}\s*else\s*\{\s*tl\.add\(textTl, 0\);\s*\}\s*\}/, `if (textTl) {
            if ({{{TEXT_ANIM_OUT_SYNC}}}) {
                const combined = gsap.timeline();
                combined.add(textTl);
                combined.add(tl, ">-0.1");
                return combined;
            } else {
                tl.add(textTl, 0);
            }
        }`);
                    modified = true;
                    console.log("[db.json] Repaired OUT sync logic for", tpl.name);
                }
            }
        });
    }

    if (modified) {
        fs.writeFileSync('./db.json', JSON.stringify(dbData, null, 2));
        console.log("Successfully patched db.json.");
    } else {
        console.log("No further patching required.");
    }
} catch(e) {
    console.error("Error reading or writing db.json", e);
}
