const fs = require('fs');

const dbPath = './db.json';
let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Hide the city-bar test graphic
let cityGraphic = db.graphics.find(g => g.templateId === 'city-bar');
if (cityGraphic) {
    cityGraphic.visible = false;
}

// Hide the na-zywo-badge test graphic
const naZywoGraphic = db.graphics.find(g => g.templateId === 'na-zywo-badge');
if (naZywoGraphic) {
    naZywoGraphic.visible = false;
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Test graphics are hidden.');
