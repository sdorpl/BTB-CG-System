const fs = require('fs');

try {
    let db = JSON.parse(fs.readFileSync('db.json', 'utf-8'));
    let c = 0;

    db.templates.forEach(t => {
        let css = t.css_template;
        let originalCss = css;

        if (t.id === "republika-ticker") {
            css = css.replace(/background:\s*white;/, "background: {{PRIMARY_BG}};");
            css = css.replace(/color:\s*#00143c;/, "color: {{TITLE_COLOR}};");
            css = css.replace(/background:\s*#c8102e;/g, "background: {{SECONDARY_COLOR}};");
            css = css.replace(/font-family: 'Bahnschrift', 'Roboto Condensed', sans-serif;/g, "font-family: '{{FONT_FAMILY}}', 'Roboto Condensed', sans-serif;");
        }

        if (t.id === "republika-composite") {
            css = css.replace(/#00143c/g, "{{PRIMARY_COLOR}}");
            css = css.replace(/#001f5c/g, "{{SECONDARY_COLOR}}");
            css = css.replace(/background: white;/g, "background: {{PRIMARY_BG}};");
            // Fix ticker-item which was replaced above by PRIMARY_COLOR
            css = css.replace(/#\{\{ID\}\} \.ticker-item \{\s+color: \{\{PRIMARY_COLOR\}\};/g, "#{{ID}} .ticker-item {\n    color: {{TITLE_COLOR}};");
            css = css.replace(/#c8102e/g, "{{SECONDARY_COLOR}}");
        }

        if (t.id === "republika-clock") {
            css = css.replace(/font-family: 'Bahnschrift', 'Roboto Condensed', sans-serif;/g, "font-family: '{{FONT_FAMILY}}', 'Roboto Condensed', sans-serif;");
        }

        if (t.id === "republika-logo") {
            css = css.replace(/#001f5c/g, "{{PRIMARY_BG}}");
        }

        if (originalCss !== css) {
            t.css_template = css;
            c++;
        }
    });

    if (c > 0) {
        fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
        console.log(`Updated ${c} templates.`);
    } else {
        console.log("No changes made.");
    }
} catch (e) {
    console.error("Error updating db.json", e);
}
