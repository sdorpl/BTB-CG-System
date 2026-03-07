const fs = require('fs');

const dbPath = './db.json';
let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Check if a city-bar graphic exists
let cityGraphic = db.graphics.find(g => g.templateId === 'city-bar');

if (!cityGraphic) {
    cityGraphic = {
        "id": "test-city-bar-1234",
        "type": "LOWER_THIRD",
        "visible": true,
        "name": "Belka Miasto (Test)",
        "title": "WARSZAWA TEST",
        "subtitle": "",
        "variant": "custom",
        "templateId": "city-bar",
        "animation": {
            "in": {
                "type": "zoom",
                "direction": "top",
                "duration": 0.5,
                "delay": 0,
                "ease": "ease-in"
            },
            "out": {
                "type": "zoom",
                "direction": "right",
                "duration": 0.5,
                "delay": 0,
                "ease": ""
            }
        },
        "style": {
            "background": {
                "color": "#ffffff",
                "borderColor": "#ffffff",
                "type": "solid",
                "borderWidth": 0,
                "borderRadius": 4
            },
            "typography": {
                "color": "#1a1a1a",
                "fontFamily": "Arial",
                "fontSize": 30,
                "fontWeight": "bold"
            }
        },
        "layout": {
            "height": 44,
            "width": 250,
            "x": 100,
            "y": 150,
            "layer": 98,
            "scale": 1.5
        }
    };
    db.graphics.push(cityGraphic);
} else {
    cityGraphic.visible = true;
    cityGraphic.layout.y = 150;
    cityGraphic.layout.x = 100;
}

const naZywoGraphic = db.graphics.find(g => g.templateId === 'na-zywo-badge');
if (naZywoGraphic) {
    naZywoGraphic.visible = true;
    // ensure the na-zywo badge is just above it
    naZywoGraphic.layout.y = 100;
    naZywoGraphic.layout.x = 100;
    // make sure scale matches
    naZywoGraphic.layout.scale = 1.5;
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Test graphics are set to ON AIR so they can be previewed.');
