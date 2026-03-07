const fs = require('fs');
let db = JSON.parse(fs.readFileSync('db.json', 'utf-8'));
let c = 0;

db.templates.forEach(t => {
    let css = t.css_template;
    let oldCss = css;

    if (t.id === "republika-ticker") {
        css = css.replace(/background: white;/, "background: {{PRIMARY_BG}};");
        css = css.replace(/color: #00143c;/, "color: {{TITLE_COLOR}};");
        css = css.replace(/background: #c8102e;/g, "background: {{SECONDARY_COLOR}};");
        css = css.replace(/font-family: 'Bahnschrift', 'Roboto Condensed', sans-serif;/g, "font-family: '{{FONT_FAMILY}}', 'Roboto Condensed', sans-serif;");
    }

    if (t.id === "republika-composite") {
        css = css.replace(/#00143c/g, "{{PRIMARY_COLOR}}");
        css = css.replace(/#001f5c/g, "{{SECONDARY_COLOR}}");
        css = css.replace(/background: white;/g, "background: {{PRIMARY_BG}};");
        css = css.replace(/#\{\{ID\}\} \.ticker-item \{\s+color: \{\{PRIMARY_COLOR\}\};/g, "#{{ID}} .ticker-item {\n    color: {{TITLE_COLOR}};");
        css = css.replace(/#c8102e/g, "{{SECONDARY_COLOR}}");
    }

    if (t.id === "republika-clock") {
        css = css.replace(/font-family: 'Bahnschrift', 'Roboto Condensed', sans-serif;/g, "font-family: '{{FONT_FAMILY}}', 'Roboto Condensed', sans-serif;");
    }

    if (t.id === "republika-logo") {
        css = css.replace(/#001f5c/g, "{{PRIMARY_BG}}");
    }

    // fallback for modern ticker
    if (t.id === "modern-ticker") {
        css = css.replace(/background: #dc2626;/g, "background: {{PRIMARY_COLOR}};");
        css = css.replace(/border-right: 4px solid #991b1b;/g, "border-right: 4px solid {{SECONDARY_COLOR}};");
    }

    if (oldCss !== css) {
        console.log(`Updated CSS for ${t.id}`);
        t.css_template = css;
        c++;
    }
});

if (c > 0) {
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
    console.log(`Successfully updated ${c} templates in db.json!`);
} else {
    console.log("No templates matched for updating.");
}
