const fs = require('fs');
const state = JSON.parse(fs.readFileSync('db.json', 'utf8'));

console.log("Graphics raw count:", state.graphics.length);
const visible = state.graphics.filter(g => g.visible);
console.log("Visible graphics count:", visible.length);

if (visible.length > 0) {
    const g = visible[0];
    const tpl = state.templates.find(t => t.id === g.templateId);
    console.log("Template found for first visible graphic?", !!tpl);
    if (!tpl) {
        console.log("No template found for ID:", g.templateId);
    } else {
        console.log("Template ID:", tpl.id, "Name:", tpl.name);
    }
}
