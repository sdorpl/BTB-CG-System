const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'database.sqlite');
const outPath = path.join(__dirname, 'new-db.json');
const db = new sqlite3.Database(dbPath);

const state = {
    settings: {},
    templates: [],
    groups: [],
    graphics: []
};

const q = (action) => new Promise((resolve) => action(resolve));

async function exportDB() {
    try {
        state.settings = await q(resolve => db.get("SELECT data FROM settings WHERE id = 1", (err, row) => {
            if (err) resolve({});
            else resolve(row && row.data ? JSON.parse(row.data) : {});
        }));

        state.templates = await q(resolve => db.all("SELECT data FROM templates", (err, rows) => {
            if (err) resolve([]);
            else resolve(rows ? rows.map(r => JSON.parse(r.data)) : []);
        }));

        state.groups = await q(resolve => db.all("SELECT data FROM groups", (err, rows) => {
            if (err) resolve([]);
            else resolve(rows ? rows.map(r => JSON.parse(r.data)) : []);
        }));

        state.graphics = await q(resolve => db.all("SELECT id, templateId, name, groupId, visible, data FROM graphics", (err, rows) => {
             if (err) resolve([]);
             else resolve(rows ? rows.map(r => {
                 let parsed = {};
                 try { parsed = JSON.parse(r.data); } catch(e){}
                 return { ...parsed, id: r.id, templateId: r.templateId, name: r.name, groupId: r.groupId, visible: r.visible === 1 };
             }) : []);
        }));

        fs.writeFileSync(outPath, JSON.stringify(state, null, 2), 'utf8');
        console.log('Eksport bazy zakończony pomyslnie do ' + outPath);
    } catch (e) {
        console.error('Blad eksportu: ', e);
    } finally {
        db.close();
    }
}

exportDB();
