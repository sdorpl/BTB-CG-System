const fs = require('fs');

const dbPath = './db.json';
let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let cityGraphic = db.graphics.find(g => g.templateId === 'city-bar');
if (cityGraphic) {
    cityGraphic.visible = true;
}

const naZywoGraphic = db.graphics.find(g => g.templateId === 'na-zywo-badge');
if (naZywoGraphic) {
    naZywoGraphic.visible = true;
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Test graphics are ON AIR again.');
