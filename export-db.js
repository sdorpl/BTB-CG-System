const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'database.sqlite');
const jsonPath = path.join(__dirname, 'db.json');

if (!fs.existsSync(dbPath)) {
    console.error('database.sqlite not found. Nothing to export.');
    process.exit(1);
}

const db = new sqlite3.Database(dbPath);

const state = {
    settings: {},
    templates: [],
    groups: [],
    graphics: []
};

db.serialize(() => {
    console.log('Fetching data from SQLite...');

    let queriesPending = 4;
    function checkDone() {
        queriesPending--;
        if (queriesPending === 0) {
            fs.writeFileSync(jsonPath, JSON.stringify(state, null, 2), 'utf8');
            console.log('Export to db.json complete.');
            db.close();
        }
    }

    // Settings
    db.get("SELECT data FROM settings WHERE id = 1", (err, row) => {
        if (!err && row) {
            try { state.settings = JSON.parse(row.data); } catch(e) { console.error('Error parsing settings:', e); }
        }
        checkDone();
    });

    // Templates
    db.all("SELECT data FROM templates", (err, rows) => {
        if (!err && rows) {
            state.templates = rows.map(r => {
                try { return JSON.parse(r.data); } catch(e) { return null; }
            }).filter(Boolean);
        }
        checkDone();
    });

    // Groups
    db.all("SELECT data FROM groups", (err, rows) => {
        if (!err && rows) {
            state.groups = rows.map(r => {
                try { return JSON.parse(r.data); } catch(e) { return null; }
            }).filter(Boolean);
        }
        checkDone();
    });

    // Graphics
    db.all("SELECT data FROM graphics", (err, rows) => {
        if (!err && rows) {
            state.graphics = rows.map(r => {
                try { return JSON.parse(r.data); } catch(e) { return null; }
            }).filter(Boolean);
        }
        checkDone();
    });
});
