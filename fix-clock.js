const fs = require('fs');
let db = JSON.parse(fs.readFileSync('db.json', 'utf-8'));
let c = 0;

db.templates.forEach(t => {
    let css = t.css_template;
    let oldCss = css;

    if (t.id === "republika-clock") {
        // Fix font color for the entire left panel container so clock text inherits it properly
        css = css.replace(/color:\s*white;/, "color: {{TITLE_COLOR}};");
        // Fix the inner clock background from hardcoded black-transparent to SECONDARY_COLOR 
        // Note: we can map the 'accent color' (SECONDARY_COLOR) to the inner clock box background
        css = css.replace(/background:\s*rgba\(0,0,0,0\.6\);/, "background: {{SECONDARY_COLOR}};");
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
