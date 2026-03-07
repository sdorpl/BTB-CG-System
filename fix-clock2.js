const fs = require('fs');
let db = JSON.parse(fs.readFileSync('db.json', 'utf-8'));
let c = 0;

db.templates.forEach(t => {
    let css = t.css_template;
    let oldCss = css;

    if (t.id === "republika-clock") {
        // Clock inner box should map to PRIMARY_COLOR so the user's Inspector 'Kolor Tła' directly affects it
        css = css.replace(/background:\s*\{\{SECONDARY_COLOR\}\};/, "background: {{PRIMARY_COLOR}};");
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
